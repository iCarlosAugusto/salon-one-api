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
import { Service } from 'src/database/schemas';

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
   * Get available time slots for services on a specific date
   * 
   * Two scenarios:
   * 1. With specific employeeIds: returns availability only for those employees
   * 2. Without employeeIds: returns availability for ALL employees who can perform the services
   * 
   * @param employeeIds - Optional array of employee IDs
   * @param serviceIds - Array of service IDs (required)
   * @param date - Date in format YYYY-MM-DD
   * @returns Array of objects with employeeId, employeeName, and available slots
   */
  async getAvailableTimeSlots(
    employeeIds: string[] | undefined,
    serviceIds: string[],
    date: string,
  ): Promise<Array<{ employeeId: string; employeeName: string; availableSlots: string[] }>> {
    // 1. Validate all services exist and calculate total duration
    let totalDuration = 0;
    const services: Service[] = [];
    let salonId: string | null = null;

    for (const serviceId of serviceIds) {
      const service = await this.servicesRepository.findById(serviceId);
      if (!service) {
        throw new NotFoundException(`Service with ID ${serviceId} not found`);
      }

      // Ensure all services belong to the same salon
      if (salonId === null) {
        salonId = service.salonId;
      } else if (service.salonId !== salonId) {
        throw new BadRequestException('All services must belong to the same salon');
      }

      services.push(service);
      totalDuration += service.duration;
    }

    if (totalDuration === 0) {
      throw new BadRequestException('Total service duration cannot be 0');
    }

    if (!salonId) {
      throw new BadRequestException('No valid salon found for services');
    }

    // 2. Get salon configuration
    const salon = await this.salonsRepository.findById(salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${salonId} not found`);
    }

    const slotInterval = salon.defaultSlotInterval || 10;
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    // 3. Determine which employees to check
    let targetEmployeeIds: string[];

    if (employeeIds && employeeIds.length > 0) {
      // Scenario 1: Specific employees provided
      targetEmployeeIds = employeeIds;
    } else {
      // Scenario 2: No employees specified - find ALL employees who can perform the services
      targetEmployeeIds = await this.findEmployeesForServices(salonId, serviceIds);
      
      if (targetEmployeeIds.length === 0) {
        return []; // No employees can perform these services
      }
    }

    // 4. Process each employee and calculate available slots
    const results: Array<{ employeeId: string; employeeName: string; availableSlots: string[] }> = [];

    for (const employeeId of targetEmployeeIds) {
      const employeeSlots = await this.calculateEmployeeAvailableSlots(
        employeeId,
        salonId,
        serviceIds,
        services,
        totalDuration,
        date,
        dayOfWeek,
        slotInterval,
      );

      if (employeeSlots) {
        results.push(employeeSlots);
      }
    }

    return results;
  }

  /**
   * Find all employees from a salon who can perform ALL the requested services
   */
  private async findEmployeesForServices(
    salonId: string,
    serviceIds: string[],
  ): Promise<string[]> {
    // Get all active employees from this salon
    const allEmployees = await this.employeesRepository.findBySalonId(salonId);
    const qualifiedEmployeeIds: string[] = [];

    for (const employee of allEmployees) {
      if (!employee.isActive) continue;

      // Check if this employee can perform ALL requested services
      let canPerformAll = true;
      for (const serviceId of serviceIds) {
        const canPerform = await this.employeeServicesRepository.exists(employee.id, serviceId);
        if (!canPerform) {
          canPerformAll = false;
          break;
        }
      }

      if (canPerformAll) {
        qualifiedEmployeeIds.push(employee.id);
      }
    }

    return qualifiedEmployeeIds;
  }

  /**
   * Calculate available slots for a single employee
   */
  private async calculateEmployeeAvailableSlots(
    employeeId: string,
    salonId: string,
    serviceIds: string[],
    services: Service[],
    totalDuration: number,
    date: string,
    dayOfWeek: number,
    slotInterval: number,
  ): Promise<{ employeeId: string; employeeName: string; availableSlots: string[] } | null> {
    // Validate employee exists
    const employee = await this.employeesRepository.findById(employeeId);
    if (!employee) {
      return null;
    }

    // Validate employee belongs to the same salon as services
    if (employee.salonId !== salonId) {
      return null;
    }

    // Check if employee can perform all services
    for (const serviceId of serviceIds) {
      const canPerform = await this.employeeServicesRepository.exists(employeeId, serviceId);
      if (!canPerform) {
        // Employee can't perform this service - skip
        return null;
      }
    }

    const employeeName = `${employee.firstName} ${employee.lastName}`;

    // Get employee schedule for this day
    const schedule = await this.schedulesRepository.findByEmployeeAndDay(employeeId, dayOfWeek);

    if (!schedule || !schedule.isAvailable) {
      // Employee doesn't work this day - return with empty slots
      return {
        employeeId: employee.id,
        employeeName,
        availableSlots: [],
      };
    }

    // Generate all possible time slots based on schedule
    const allSlots = generateTimeSlots(schedule.startTime, schedule.endTime, slotInterval);

    // Get existing appointment services for this employee on this date
    const activeAppointmentServices = await this.appointmentServicesRepository.findByEmployeeAndDateWithStatus(
      employeeId,
      date,
      ['pending', 'confirmed', 'in_progress'],
    );

    // Extract time ranges occupied by this employee
    const occupiedRanges: Array<{ startTime: string; endTime: string }> = activeAppointmentServices.map(
      (item: any) => ({
        startTime: item.appointmentService.startTime,
        endTime: item.appointmentService.endTime,
      }),
    );

    // Calculate occupied slots based on appointment services
    const occupiedSlots = this.calculateOccupiedSlotsFromRanges(occupiedRanges, slotInterval);

    // Filter available slots (considering total duration of all services)
    const availableSlots = getAvailableSlots(
      allSlots,
      occupiedSlots,
      totalDuration,
      slotInterval,
    );

    // Filter slots that don't extend beyond schedule end time
    const validSlots = availableSlots.filter((slot) =>
      canAccommodateService(slot, totalDuration, schedule.endTime),
    );

    return {
      employeeId: employee.id,
      employeeName,
      availableSlots: validSlots,
    };
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
      const results = await this.getAvailableTimeSlots(
        [employeeId], // Convert single employee to array
        [serviceId], // Convert single service to array
        appointmentDate,
      );

      if (results.length === 0) {
        return {
          available: false,
          reason: 'Employee not available or cannot perform this service',
        };
      }

      const available = results[0].availableSlots.includes(startTime);

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
   * Each service can have a specific employee or be auto-assigned
   */
  async create(createAppointmentDto: CreateAppointmentDto): Promise<Appointment> {
    const { services: serviceBookings, salonId, appointmentDate, startTime } = createAppointmentDto;

    // 1. Validate salon exists
    const salon = await this.salonsRepository.findById(salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${salonId} not found`);
    }

    // 2. Validate and load all services
    const servicesData: any[] = [];
    let totalDuration = 0;
    let totalPrice = 0;

    for (const booking of serviceBookings) {
      const service = await this.servicesRepository.findById(booking.serviceId);
      if (!service) {
        throw new NotFoundException(`Service with ID ${booking.serviceId} not found`);
      }

      if (service.salonId !== salonId) {
        throw new BadRequestException(
          `Service ${booking.serviceId} does not belong to this salon`,
        );
      }

      servicesData.push(service);
      totalDuration += service.duration;
      totalPrice += parseFloat(service.price);
    }

    if (totalDuration === 0) {
      throw new BadRequestException('Total service duration cannot be 0');
    }

    // 3. Process each service: validate or auto-assign employee
    const serviceAssignments: Array<{
      service: any;
      employeeId: string;
      startTime: string;
      endTime: string;
      orderIndex: number;
    }> = [];

    let currentTime = startTime;
    const dateObj = new Date(appointmentDate);
    const dayOfWeek = dateObj.getDay();

    for (let i = 0; i < serviceBookings.length; i++) {
      const booking = serviceBookings[i];
      const service = servicesData[i];
      let assignedEmployeeId: string;

      // Calculate end time for this service
      const serviceEndTime = calculateEndTime(currentTime, service.duration);

      if (booking.employeeId) {
        // Employee specified: validate availability
        const employee = await this.employeesRepository.findById(booking.employeeId);
        if (!employee) {
          throw new NotFoundException(`Employee with ID ${booking.employeeId} not found`);
        }

        if (employee.salonId !== salonId) {
          throw new BadRequestException('Employee does not belong to this salon');
        }

        // Validate employee can perform service
        const canPerform = await this.employeeServicesRepository.exists(
          booking.employeeId,
          booking.serviceId,
        );
        if (!canPerform) {
          throw new BadRequestException(
            `Employee ${employee.firstName} ${employee.lastName} cannot perform service: ${service.name}`,
          );
        }

        // Validate employee availability for this time slot
        const isAvailable = await this.validateEmployeeAvailability(
          booking.employeeId,
          appointmentDate,
          currentTime,
          serviceEndTime,
          dayOfWeek,
        );

        if (!isAvailable) {
          throw new ConflictException(
            `Employee ${employee.firstName} ${employee.lastName} is not available for service ${service.name} at ${currentTime}`,
          );
        }

        assignedEmployeeId = booking.employeeId;
      } else {
        // No employee specified: auto-assign
        const foundEmployee = await this.findAvailableEmployee(
          salonId,
          booking.serviceId,
          appointmentDate,
          currentTime,
          serviceEndTime,
          dayOfWeek,
        );

        if (!foundEmployee) {
          throw new ConflictException(
            `No available employee found for service ${service.name} at ${currentTime}`,
          );
        }

        assignedEmployeeId = foundEmployee;
      }

      serviceAssignments.push({
        service,
        employeeId: assignedEmployeeId,
        startTime: currentTime,
        endTime: serviceEndTime,
        orderIndex: i,
      });

      // Next service starts when current one ends
      currentTime = serviceEndTime;
    }

    // 4. Calculate total end time
    const totalEndTime = calculateEndTime(startTime, totalDuration);

    // 5. Create appointment
    const newAppointment: NewAppointment = {
      salonId,
      appointmentDate,
      startTime,
      endTime: totalEndTime,
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

    // 6. Create appointment-service relationships with assigned employees
    const appointmentServiceData: NewAppointmentService[] = serviceAssignments.map((assignment) => ({
      appointmentId: appointment.id,
      serviceId: assignment.service.id,
      employeeId: assignment.employeeId,
      duration: assignment.service.duration,
      price: assignment.service.price,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      orderIndex: assignment.orderIndex,
    }));

    await this.appointmentServicesRepository.createMany(appointmentServiceData);

    return appointment;
  }

  /**
   * Calculate occupied slots from time ranges
   */
  private calculateOccupiedSlotsFromRanges(
    ranges: Array<{ startTime: string; endTime: string }>,
    slotInterval: number,
  ): Set<string> {
    const occupied = new Set<string>();

    for (const range of ranges) {
      const startMinutes = parseTime(range.startTime);
      const endMinutes = parseTime(range.endTime);

      // Mark all slots that overlap with this range
      for (let minutes = startMinutes; minutes < endMinutes; minutes += slotInterval) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        occupied.add(timeStr);
      }
    }

    return occupied;
  }

  /**
   * Find an available employee for a service at a specific time
   */
  private async findAvailableEmployee(
    salonId: string,
    serviceId: string,
    date: string,
    startTime: string,
    endTime: string,
    dayOfWeek: number,
  ): Promise<string | null> {
    // Get all employees from the salon who can perform this service
    const allEmployees = await this.employeesRepository.findBySalonId(salonId);
    
    for (const employee of allEmployees) {
      // Check if employee can perform the service
      const canPerform = await this.employeeServicesRepository.exists(employee.id, serviceId);
      if (!canPerform) continue;

      // Check if employee is available
      const isAvailable = await this.validateEmployeeAvailability(
        employee.id,
        date,
        startTime,
        endTime,
        dayOfWeek,
      );

      if (isAvailable) {
        return employee.id;
      }
    }

    return null; // No available employee found
  }

  /**
   * Validate if an employee is available for a specific time slot
   */
  private async validateEmployeeAvailability(
    employeeId: string,
    date: string,
    startTime: string,
    endTime: string,
    dayOfWeek: number,
  ): Promise<boolean> {
    // Check if employee works on this day
    const schedule = await this.schedulesRepository.findByEmployeeAndDay(employeeId, dayOfWeek);
    if (!schedule || !schedule.isAvailable) {
      return false;
    }

    // Check if time slot is within employee's working hours
    const scheduleStart = parseTime(schedule.startTime);
    const scheduleEnd = parseTime(schedule.endTime);
    const slotStart = parseTime(startTime);
    const slotEnd = parseTime(endTime);

    if (slotStart < scheduleStart || slotEnd > scheduleEnd) {
      return false;
    }

    // Check for conflicts with existing appointment services for this employee
    const activeAppointmentServices = await this.appointmentServicesRepository.findByEmployeeAndDateWithStatus(
      employeeId,
      date,
      ['pending', 'confirmed', 'in_progress'],
    );

    // Check if the requested time slot overlaps with any existing service
    for (const item of activeAppointmentServices) {
      const existingStart = parseTime(item.appointmentService.startTime);
      const existingEnd = parseTime(item.appointmentService.endTime);

      // Check for overlap: (start1 < end2 && end1 > start2)
      if (slotStart < existingEnd && slotEnd > existingStart) {
        return false;
      }
    }

    return true;
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
   * Note: Updating services or employees is not supported. Cancel and create a new appointment instead.
   * Only metadata (notes, client info, status) can be updated.
   */
  async update(id: string, updateAppointmentDto: UpdateAppointmentDto): Promise<Appointment> {
    const appointment = await this.findOne(id);

    // Prevent changing date/time through this endpoint
    // Use dedicated endpoints or cancel and recreate
    if (updateAppointmentDto.appointmentDate || updateAppointmentDto.startTime) {
      throw new BadRequestException(
        'Cannot change appointment date/time. Please cancel and create a new appointment.',
      );
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

