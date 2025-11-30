import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Appointment, NewAppointment } from '../database/schemas/appointment.schema';
import { NewAppointmentService } from '../database/schemas/appointment-service.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentServicesRepository } from './appointment-services.repository';
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
    private readonly appointmentServicesRepository: AppointmentServicesRepository,
    private readonly salonsRepository: SalonsRepository,
    private readonly employeesRepository: EmployeesRepository,
    private readonly schedulesRepository: EmployeeSchedulesRepository,
    private readonly employeeServicesRepository: EmployeeServicesRepository,
    private readonly servicesRepository: ServicesRepository,
  ) {}

  /**
   * Get available time slots for an employee and one or more services on a specific date
   * @param employeeId - ID of the employee
   * @param serviceIds - Array of service IDs (can be one or multiple)
   * @param date - Date in format YYYY-MM-DD
   * @returns Array of available time slots in HH:MM format
   */
  async getAvailableTimeSlots(
    employeeId: string,
    serviceIds: string[],
    date: string,
  ): Promise<string[]> {
    // 1. Validate employee exists
    const employee = await this.employeesRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // 2. Validate all services exist and calculate total duration
    let totalDuration = 0;
    const services: any[] = [];

    for (const serviceId of serviceIds) {
      const service = await this.servicesRepository.findById(serviceId);
      if (!service) {
        throw new NotFoundException(`Service with ID ${serviceId} not found`);
      }

      // Validate service belongs to the same salon
      if (service.salonId !== employee.salonId) {
        throw new BadRequestException(
          `Service ${serviceId} does not belong to employee's salon`,
        );
      }

      // Validate employee can perform this service
      const canPerform = await this.employeeServicesRepository.exists(employeeId, serviceId);
      if (!canPerform) {
        throw new BadRequestException(
          `Employee cannot perform service: ${service.name}`,
        );
      }

      services.push(service);
      totalDuration += service.duration;
    }

    if (totalDuration === 0) {
      throw new BadRequestException('Total service duration cannot be 0');
    }

    // 3. Get salon configuration
    const salon = await this.salonsRepository.findById(employee.salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${employee.salonId} not found`);
    }

    const slotInterval = salon.defaultSlotInterval || 10;

    // 4. Get employee schedule for this day
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    const schedule = await this.schedulesRepository.findByEmployeeAndDay(employeeId, dayOfWeek);

    if (!schedule || !schedule.isAvailable) {
      return []; // Employee doesn't work this day
    }

    // 5. Generate all possible time slots
    const allSlots = generateTimeSlots(schedule.startTime, schedule.endTime, slotInterval);

    // 6. Get existing appointments for this employee on this date
    const activeAppointments = await this.appointmentsRepository.findByEmployeeAndDateWithStatus(
      employeeId,
      date,
      ['pending', 'confirmed', 'in_progress'],
    );

    // 7. Calculate occupied slots
    const occupiedSlots = getOccupiedSlots(activeAppointments, slotInterval);

    // 8. Filter available slots (considering total duration of all services)
    const availableSlots = getAvailableSlots(
      allSlots,
      occupiedSlots,
      totalDuration,
      slotInterval,
    );

    // 9. Filter slots that don't extend beyond schedule end time
    const validSlots = availableSlots.filter((slot) =>
      canAccommodateService(slot, totalDuration, schedule.endTime),
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
        [serviceId], // Convert single service to array
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
   * Create a new appointment with one or more services
   */
  async create(createAppointmentDto: CreateAppointmentDto): Promise<Appointment> {
    const { employeeId, serviceIds, salonId, appointmentDate, startTime } = createAppointmentDto;

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

    // 3. Validate all services exist, calculate totals
    let totalDuration = 0;
    let totalPrice = 0;
    const services: any[] = [];

    for (const serviceId of serviceIds) {
      const service = await this.servicesRepository.findById(serviceId);
      if (!service) {
        throw new NotFoundException(`Service with ID ${serviceId} not found`);
      }

      if (service.salonId !== salonId) {
        throw new BadRequestException(
          `Service ${serviceId} does not belong to this salon`,
        );
      }

      // Validate employee can perform service
      const canPerform = await this.employeeServicesRepository.exists(employeeId, serviceId);
      if (!canPerform) {
        throw new BadRequestException(
          `Employee cannot perform service: ${service.name}`,
        );
      }

      services.push(service);
      totalDuration += service.duration;
      totalPrice += parseFloat(service.price);
    }

    if (totalDuration === 0) {
      throw new BadRequestException('Total service duration cannot be 0');
    }

    // 4. Validate appointment date/time
    await this.validateAppointmentDateTime(
      salon,
      employee.id,
      appointmentDate,
      startTime,
      totalDuration,
    );

    // 5. Calculate end time
    const endTime = calculateEndTime(startTime, totalDuration);

    // 6. Check for conflicts
    const conflicts = await this.checkConflicts(employeeId, appointmentDate, startTime, endTime);

    if (conflicts.length > 0) {
      throw new ConflictException('Time slot conflicts with existing appointment');
    }

    // 7. Create appointment
    const newAppointment: NewAppointment = {
      salonId,
      employeeId,
      appointmentDate,
      startTime,
      endTime,
      totalDuration,
      totalPrice: totalPrice.toFixed(2),
      status: salon.requireBookingApproval ? 'pending' : 'confirmed',
      clientName: createAppointmentDto.clientName,
      clientEmail: createAppointmentDto.clientEmail,
      clientPhone: createAppointmentDto.clientPhone,
      notes: createAppointmentDto.notes,
      reminderSent: false,
    };

    const appointment = await this.appointmentsRepository.create(newAppointment);

    // 8. Create appointment-service relationships
    const appointmentServiceData: NewAppointmentService[] = services.map((service, index) => ({
      appointmentId: appointment.id,
      serviceId: service.id,
      duration: service.duration,
      price: service.price,
      orderIndex: index,
    }));

    await this.appointmentServicesRepository.createMany(appointmentServiceData);

    return appointment;
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
   * Note: Updating services is not supported. Cancel and create a new appointment instead.
   */
  async update(id: string, updateAppointmentDto: UpdateAppointmentDto): Promise<Appointment> {
    const appointment = await this.findOne(id);

    // If changing time, validate new time
    if (
      updateAppointmentDto.appointmentDate ||
      updateAppointmentDto.startTime
    ) {
      const newDate = updateAppointmentDto.appointmentDate || appointment.appointmentDate;
      const newStartTime = updateAppointmentDto.startTime || appointment.startTime;

      // Use existing total duration
      const serviceDuration = appointment.totalDuration;

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

