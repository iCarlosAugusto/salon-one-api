import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Appointment, NewAppointment } from '../database/schemas/appointment.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AppointmentsRepository } from './appointments.repository';
import { SalonsRepository } from '../salons/salons.repository';
import { EmployeesRepository } from '../employees/employees.repository';
import { EmployeeSchedulesRepository } from '../employees/employee-schedules.repository';
import { EmployeeServicesRepository } from '../employees/employee-services.repository';
import { ServicesRepository } from '../services/services.repository';
import { getDayName, parseTime, doTimeRangesOverlap } from '../common/utils/time.utils';
import {
  generateTimeSlots,
  getOccupiedSlots,
  getAvailableSlots,
  calculateEndTime,
  canAccommodateService,
} from '../common/utils/slot.utils';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointmentsRepository: AppointmentsRepository,
    private readonly salonsRepository: SalonsRepository,
    private readonly employeesRepository: EmployeesRepository,
    private readonly schedulesRepository: EmployeeSchedulesRepository,
    private readonly employeeServicesRepository: EmployeeServicesRepository,
    private readonly servicesRepository: ServicesRepository,
  ) {}

  /**
   * Get available time slots for an employee and service on a specific date
   */
  async getAvailableTimeSlots(
    employeeId: string,
    serviceId: string,
    date: string,
  ): Promise<string[]> {
    // 1. Validate employee exists
    const employee = await this.employeesRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // 2. Validate service exists
    const service = await this.servicesRepository.findById(serviceId);
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    // 3. Validate employee can perform this service
    const canPerform = await this.employeeServicesRepository.exists(employeeId, serviceId);
    if (!canPerform) {
      throw new BadRequestException('Employee cannot perform this service');
    }

    // 4. Get salon configuration
    const salon = await this.salonsRepository.findById(employee.salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${employee.salonId} not found`);
    }

    const slotInterval = salon.defaultSlotInterval || 10;

    // 5. Get employee schedule for this day
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    const schedule = await this.schedulesRepository.findByEmployeeAndDay(employeeId, dayOfWeek);

    if (!schedule || !schedule.isAvailable) {
      return []; // Employee doesn't work this day
    }

    // 6. Generate all possible time slots
    const allSlots = generateTimeSlots(schedule.startTime, schedule.endTime, slotInterval);

    // 7. Get existing appointments for this employee on this date
    const activeAppointments = await this.appointmentsRepository.findByEmployeeAndDateWithStatus(
      employeeId,
      date,
      ['pending', 'confirmed', 'in_progress'],
    );

    // 8. Calculate occupied slots
    const occupiedSlots = getOccupiedSlots(activeAppointments, slotInterval);

    // 9. Filter available slots (considering service duration)
    const availableSlots = getAvailableSlots(
      allSlots,
      occupiedSlots,
      service.duration,
      slotInterval,
    );

    // 10. Filter slots that don't extend beyond schedule end time
    const validSlots = availableSlots.filter((slot) =>
      canAccommodateService(slot, service.duration, schedule.endTime),
    );

    return validSlots;
  }

  /**
   * Check if a specific time slot is available
   */
  async checkAvailability(
    employeeId: string,
    serviceId: string,
    appointmentDate: string,
    startTime: string,
  ): Promise<{ available: boolean; reason?: string }> {
    try {
      const availableSlots = await this.getAvailableTimeSlots(
        employeeId,
        serviceId,
        appointmentDate,
      );

      const available = availableSlots.includes(startTime);

      return {
        available,
        reason: available ? undefined : 'Time slot is not available',
      };
    } catch (error) {
      return {
        available: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a new appointment with full validation
   */
  async create(createAppointmentDto: CreateAppointmentDto): Promise<Appointment> {
    const { employeeId, serviceId, salonId, appointmentDate, startTime } = createAppointmentDto;

    // 1. Validate salon exists
    const salon = await this.salonsRepository.findById(salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${salonId} not found`);
    }

    // 2. Validate employee exists and belongs to salon
    const employee = await this.employeesRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    if (employee.salonId !== salonId) {
      throw new BadRequestException('Employee does not belong to this salon');
    }

    // 3. Validate service exists and belongs to salon
    const service = await this.servicesRepository.findById(serviceId);
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    if (service.salonId !== salonId) {
      throw new BadRequestException('Service does not belong to this salon');
    }

    // 4. Validate employee can perform service
    const canPerform = await this.employeeServicesRepository.exists(employeeId, serviceId);
    if (!canPerform) {
      throw new BadRequestException('Employee cannot perform this service');
    }

    // 5. Validate appointment date/time
    await this.validateAppointmentDateTime(
      salon,
      employee.id,
      appointmentDate,
      startTime,
      service.duration,
    );

    // 6. Calculate end time
    const endTime = calculateEndTime(startTime, service.duration);

    // 7. Check for conflicts
    const conflicts = await this.checkConflicts(employeeId, appointmentDate, startTime, endTime);

    if (conflicts.length > 0) {
      throw new ConflictException('Time slot conflicts with existing appointment');
    }

    // 8. Create appointment
    const newAppointment: NewAppointment = {
      salonId,
      employeeId,
      serviceId,
      appointmentDate,
      startTime,
      endTime,
      duration: service.duration,
      status: salon.requireBookingApproval ? 'pending' : 'confirmed',
      clientName: createAppointmentDto.clientName,
      clientEmail: createAppointmentDto.clientEmail,
      clientPhone: createAppointmentDto.clientPhone,
      price: service.price,
      notes: createAppointmentDto.notes,
      reminderSent: false,
    };

    return await this.appointmentsRepository.create(newAppointment);
  }

  /**
   * Validate appointment date and time
   */
  private async validateAppointmentDateTime(
    salon: any,
    employeeId: string,
    appointmentDate: string,
    startTime: string,
    serviceDuration: number,
  ): Promise<void> {
    const now = new Date();
    const appointmentDateTime = new Date(`${appointmentDate}T${startTime}`);

    // Check if date is in the past
    if (appointmentDateTime < now) {
      throw new BadRequestException('Cannot book appointments in the past');
    }

    // Check minimum advance booking
    const hoursDiff = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < salon.minAdvanceBookingHours) {
      throw new BadRequestException(
        `Appointments must be booked at least ${salon.minAdvanceBookingHours} hours in advance`,
      );
    }

    // Check maximum advance booking
    const daysDiff = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > salon.maxAdvanceBookingDays) {
      throw new BadRequestException(
        `Appointments can only be booked up to ${salon.maxAdvanceBookingDays} days in advance`,
      );
    }

    // Check if employee works on this day
    const dateObj = new Date(appointmentDate);
    const dayOfWeek = dateObj.getDay();

    const schedule = await this.schedulesRepository.findByEmployeeAndDay(employeeId, dayOfWeek);

    if (!schedule || !schedule.isAvailable) {
      const dayName = getDayName(dayOfWeek);
      throw new BadRequestException(`Employee does not work on ${dayName}`);
    }

    // Check if time is within employee schedule
    const startMinutes = parseTime(startTime);
    const scheduleStart = parseTime(schedule.startTime);
    const scheduleEnd = parseTime(schedule.endTime);

    if (startMinutes < scheduleStart || startMinutes >= scheduleEnd) {
      throw new BadRequestException('Time is outside employee working hours');
    }

    // Check if service fits within schedule
    const endTime = calculateEndTime(startTime, serviceDuration);
    const endMinutes = parseTime(endTime);

    if (endMinutes > scheduleEnd) {
      throw new BadRequestException(
        'Service duration extends beyond employee working hours',
      );
    }
  }

  /**
   * Check for appointment conflicts
   */
  private async checkConflicts(
    employeeId: string,
    appointmentDate: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<Appointment[]> {
    const appointments = await this.appointmentsRepository.findConflictingAppointments(
      employeeId,
      appointmentDate,
      startTime,
      endTime,
      excludeId,
    );

    // Check for time overlaps
    return appointments.filter((apt) =>
      doTimeRangesOverlap(
        { start: startTime, end: endTime },
        { start: apt.startTime, end: apt.endTime },
      ),
    );
  }

  /**
   * Find all appointments
   */
  async findAll(): Promise<Appointment[]> {
    return await this.appointmentsRepository.findAll();
  }

  /**
   * Find appointments by salon
   */
  async findBySalonId(salonId: string): Promise<Appointment[]> {
    const salon = await this.salonsRepository.findById(salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${salonId} not found`);
    }

    return await this.appointmentsRepository.findBySalonId(salonId);
  }

  /**
   * Find appointments by salon and date
   */
  async findBySalonAndDate(salonId: string, date: string): Promise<Appointment[]> {
    const salon = await this.salonsRepository.findById(salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${salonId} not found`);
    }

    return await this.appointmentsRepository.findBySalonAndDate(salonId, date);
  }

  /**
   * Find appointments by employee and date
   */
  async findByEmployeeAndDate(employeeId: string, date: string): Promise<Appointment[]> {
    const employee = await this.employeesRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    return await this.appointmentsRepository.findByEmployeeAndDate(employeeId, date);
  }

  /**
   * Find one appointment by ID
   */
  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findById(id);

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  /**
   * Update appointment status
   */
  async updateStatus(
    id: string,
    updateStatusDto: UpdateAppointmentStatusDto,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id);

    return await this.appointmentsRepository.update(id, {
      status: updateStatusDto.status,
      cancellationReason: updateStatusDto.cancellationReason,
    });
  }

  /**
   * Update appointment
   */
  async update(id: string, updateAppointmentDto: UpdateAppointmentDto): Promise<Appointment> {
    const appointment = await this.findOne(id);

    // If changing time, validate new time
    if (
      updateAppointmentDto.appointmentDate ||
      updateAppointmentDto.startTime ||
      updateAppointmentDto.serviceId
    ) {
      const newDate = updateAppointmentDto.appointmentDate || appointment.appointmentDate;
      const newStartTime = updateAppointmentDto.startTime || appointment.startTime;

      let serviceDuration = appointment.duration;
      if (updateAppointmentDto.serviceId) {
        const service = await this.servicesRepository.findById(updateAppointmentDto.serviceId);
        if (!service) {
          throw new NotFoundException('Service not found');
        }
        serviceDuration = service.duration;
      }

      const salon = await this.salonsRepository.findById(appointment.salonId);
      await this.validateAppointmentDateTime(
        salon,
        appointment.employeeId,
        newDate,
        newStartTime,
        serviceDuration,
      );

      const newEndTime = calculateEndTime(newStartTime, serviceDuration);

      // Check conflicts (excluding current appointment)
      const conflicts = await this.checkConflicts(
        appointment.employeeId,
        newDate,
        newStartTime,
        newEndTime,
        id,
      );

      if (conflicts.length > 0) {
        throw new ConflictException('New time slot conflicts with existing appointment');
      }
    }

    return await this.appointmentsRepository.update(id, updateAppointmentDto);
  }

  /**
   * Cancel appointment
   */
  async cancel(id: string, reason?: string): Promise<Appointment> {
    return await this.updateStatus(id, {
      status: 'cancelled',
      cancellationReason: reason,
    });
  }

  /**
   * Delete appointment
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.appointmentsRepository.delete(id);
  }
}

