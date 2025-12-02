import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Employee, NewEmployee } from '../database/schemas/employee.schema';
import { EmployeeSchedule, NewEmployeeSchedule } from '../database/schemas/employee-schedule.schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { AssignServicesDto } from './dto/assign-services.dto';
import { EmployeesRepository } from './employees.repository';
import { EmployeeSchedulesRepository } from './employee-schedules.repository';
import { EmployeeServicesRepository } from './employee-services.repository';
import { SalonsRepository } from '../salons/salons.repository';
import { SalonOperatingHoursRepository } from '../salons/salon-operating-hours.repository';
import { ServicesRepository } from '../services/services.repository';
import {
  validateScheduleTimes,
  detectScheduleConflicts,
} from '../common/validators/schedule.validator';
import { parseTime } from '../common/utils/time.utils';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly schedulesRepository: EmployeeSchedulesRepository,
    private readonly employeeServicesRepository: EmployeeServicesRepository,
    private readonly salonsRepository: SalonsRepository,
    private readonly salonOperatingHoursRepository: SalonOperatingHoursRepository,
    private readonly servicesRepository: ServicesRepository,
  ) {}

  // ========== EMPLOYEE CRUD ==========

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    // Validate salon exists
    const salon = await this.salonsRepository.findById(createEmployeeDto.salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${createEmployeeDto.salonId} not found`);
    }

    // Check if email already exists in this salon
    const existingEmployee = await this.employeesRepository.findByEmail(
      createEmployeeDto.email,
      createEmployeeDto.salonId,
    );
    if (existingEmployee) {
      throw new ConflictException(`Employee with email ${createEmployeeDto.email} already exists in this salon`);
    }

    // Validate hired date is not in the future
    const hiredDate = new Date(createEmployeeDto.hiredAt);
    if (hiredDate > new Date()) {
      throw new BadRequestException('Hired date cannot be in the future');
    }

    // Validate work schedule is provided
    if (!createEmployeeDto.workSchedule || createEmployeeDto.workSchedule.length === 0) {
      throw new BadRequestException('Work schedule is required when creating an employee');
    }

    // Validate each schedule entry
    for (const schedule of createEmployeeDto.workSchedule) {
      // Validate schedule times
      const timeValidation = validateScheduleTimes({
        id: undefined,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      });
      if (!timeValidation.valid) {
        throw new BadRequestException(`Schedule validation failed for day ${schedule.dayOfWeek}: ${timeValidation.error}`);
      }

      // Get salon operating hours for this day
      const salonHours = await this.salonOperatingHoursRepository.findBySalonAndDay(
        createEmployeeDto.salonId,
        schedule.dayOfWeek,
      );

      if (!salonHours) {
        throw new BadRequestException(`Salon has no operating hours defined for day ${schedule.dayOfWeek}`);
      }

      if (salonHours.closed) {
        throw new BadRequestException(`Salon is closed on day ${schedule.dayOfWeek}`);
      }

      // Validate employee hours are within salon hours
      const employeeStart = parseTime(schedule.startTime);
      const employeeEnd = parseTime(schedule.endTime);
      const salonStart = parseTime(salonHours.startTime);
      const salonEnd = parseTime(salonHours.endTime);

      if (employeeStart < salonStart) {
        throw new BadRequestException(
          `Employee start time (${schedule.startTime}) is before salon opens (${salonHours.startTime}) on day ${schedule.dayOfWeek}`,
        );
      }

      if (employeeEnd > salonEnd) {
        throw new BadRequestException(
          `Employee end time (${schedule.endTime}) is after salon closes (${salonHours.endTime}) on day ${schedule.dayOfWeek}`,
        );
      }
    }

    // Check for duplicate days in work schedule
    const days = createEmployeeDto.workSchedule.map(s => s.dayOfWeek);
    const uniqueDays = new Set(days);
    if (days.length !== uniqueDays.size) {
      throw new BadRequestException('Work schedule contains duplicate days');
    }

    // Create employee
    const newEmployee: NewEmployee = {
      salonId: createEmployeeDto.salonId,
      firstName: createEmployeeDto.firstName,
      lastName: createEmployeeDto.lastName,
      email: createEmployeeDto.email,
      phone: createEmployeeDto.phone,
      avatar: createEmployeeDto.avatar,
      bio: createEmployeeDto.bio,
      role: createEmployeeDto.role || 'barber',
      hiredAt: createEmployeeDto.hiredAt,
      isActive: createEmployeeDto.isActive ?? true,
    };

    const employee = await this.employeesRepository.create(newEmployee);

    // Create all schedules for the employee
    try {
      for (const schedule of createEmployeeDto.workSchedule) {
        const newSchedule: NewEmployeeSchedule = {
          employeeId: employee.id,
          salonId: createEmployeeDto.salonId,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isAvailable: schedule.isAvailable ?? true,
        };

        await this.schedulesRepository.create(newSchedule);
      }
    } catch (error) {
      // If schedule creation fails, delete the employee to maintain data integrity
      await this.employeesRepository.delete(employee.id);
      throw new BadRequestException('Failed to create employee schedules. Employee creation rolled back.');
    }

    return employee;
  }

  async findAll(): Promise<Employee[]> {
    return await this.employeesRepository.findAll();
  }

  async findBySalonId(salonId: string): Promise<Employee[]> {
    // Validate salon exists
    const salon = await this.salonsRepository.findById(salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${salonId} not found`);
    }

    return await this.employeesRepository.findBySalonId(salonId);
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeesRepository.findById(id);

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    // Check if employee exists
    const employee = await this.findOne(id);

    // If updating email, check for duplicates
    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const existingEmployee = await this.employeesRepository.findByEmail(
        updateEmployeeDto.email,
        employee.salonId,
      );
      if (existingEmployee) {
        throw new ConflictException(`Employee with email ${updateEmployeeDto.email} already exists in this salon`);
      }
    }

    // Validate hired date if provided
    if (updateEmployeeDto.hiredAt) {
      const hiredDate = new Date(updateEmployeeDto.hiredAt);
      if (hiredDate > new Date()) {
        throw new BadRequestException('Hired date cannot be in the future');
      }
    }

    return await this.employeesRepository.update(id, updateEmployeeDto);
  }

  async remove(id: string): Promise<void> {
    // Check if employee exists
    await this.findOne(id);

    // Note: Cascade delete will handle schedules and service assignments
    await this.employeesRepository.delete(id);
  }

  async toggleActive(id: string): Promise<Employee> {
    const employee = await this.findOne(id);

    return await this.employeesRepository.update(id, {
      isActive: !employee.isActive,
    });
  }

  // ========== SCHEDULE MANAGEMENT ==========

  async createSchedule(
    employeeId: string,
    createScheduleDto: CreateScheduleDto,
  ): Promise<EmployeeSchedule> {
    // Validate employee exists
    const employee = await this.findOne(employeeId);

    // Get salon details for operating hours validation
    const salon = await this.salonsRepository.findById(employee.salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${employee.salonId} not found`);
    }

    // Validate schedule times
    const timeValidation = validateScheduleTimes({
      id: undefined,
      dayOfWeek: createScheduleDto.dayOfWeek,
      startTime: createScheduleDto.startTime,
      endTime: createScheduleDto.endTime,
    });
    if (!timeValidation.valid) {
      throw new BadRequestException(timeValidation.error);
    }

    // Validate schedule is within salon operating hours
    const salonHours = await this.salonOperatingHoursRepository.findBySalonAndDay(
      employee.salonId,
      createScheduleDto.dayOfWeek,
    );

    if (!salonHours) {
      throw new BadRequestException(`Salon has no operating hours defined for day ${createScheduleDto.dayOfWeek}`);
    }

    if (salonHours.closed) {
      throw new BadRequestException(`Salon is closed on day ${createScheduleDto.dayOfWeek}`);
    }

    const employeeStart = parseTime(createScheduleDto.startTime);
    const employeeEnd = parseTime(createScheduleDto.endTime);
    const salonStart = parseTime(salonHours.startTime);
    const salonEnd = parseTime(salonHours.endTime);

    if (employeeStart < salonStart) {
      throw new BadRequestException(
        `Employee start time (${createScheduleDto.startTime}) is before salon opens (${salonHours.startTime})`,
      );
    }

    if (employeeEnd > salonEnd) {
      throw new BadRequestException(
        `Employee end time (${createScheduleDto.endTime}) is after salon closes (${salonHours.endTime})`,
      );
    }

    // Check if schedule already exists for this day
    const existingSchedule = await this.schedulesRepository.findByEmployeeAndDay(
      employeeId,
      createScheduleDto.dayOfWeek,
    );
    if (existingSchedule) {
      throw new ConflictException(
        `Schedule already exists for this employee on day ${createScheduleDto.dayOfWeek}`,
      );
    }

    // Get all existing schedules for conflict detection
    const existingSchedules = await this.schedulesRepository.findByEmployeeId(employeeId);

    // Detect conflicts
    const conflicts = detectScheduleConflicts(
      {
        id: undefined,
        dayOfWeek: createScheduleDto.dayOfWeek,
        startTime: createScheduleDto.startTime,
        endTime: createScheduleDto.endTime,
      },
      existingSchedules,
    );

    if (conflicts.hasConflicts) {
      throw new ConflictException(`Schedule conflicts: ${conflicts.conflicts.join(', ')}`);
    }

    const newSchedule: NewEmployeeSchedule = {
      employeeId,
      salonId: employee.salonId,
      dayOfWeek: createScheduleDto.dayOfWeek,
      startTime: createScheduleDto.startTime,
      endTime: createScheduleDto.endTime,
      isAvailable: createScheduleDto.isAvailable ?? true,
    };

    return await this.schedulesRepository.create(newSchedule);
  }

  async findSchedules(employeeId: string): Promise<EmployeeSchedule[]> {
    // Validate employee exists
    await this.findOne(employeeId);

    return await this.schedulesRepository.findByEmployeeId(employeeId);
  }

  async findScheduleByDay(employeeId: string, dayOfWeek: number): Promise<EmployeeSchedule> {
    // Validate employee exists
    await this.findOne(employeeId);

    const schedule = await this.schedulesRepository.findByEmployeeAndDay(employeeId, dayOfWeek);

    if (!schedule) {
      throw new NotFoundException(`No schedule found for employee on day ${dayOfWeek}`);
    }

    return schedule;
  }

  async updateSchedule(
    id: string,
    updateScheduleDto: UpdateScheduleDto,
  ): Promise<EmployeeSchedule> {
    // Get existing schedule
    const existingSchedule = await this.schedulesRepository.findById(id);
    if (!existingSchedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    // Get employee
    const employee = await this.findOne(existingSchedule.employeeId);

    // Get salon for validation
    const salon = await this.salonsRepository.findById(employee.salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${employee.salonId} not found`);
    }

    // Prepare updated schedule data
    const updatedScheduleData = {
      id: existingSchedule.id,
      dayOfWeek: updateScheduleDto.dayOfWeek ?? existingSchedule.dayOfWeek,
      startTime: updateScheduleDto.startTime ?? existingSchedule.startTime,
      endTime: updateScheduleDto.endTime ?? existingSchedule.endTime,
    };

    // Validate schedule times
    const timeValidation = validateScheduleTimes(updatedScheduleData);
    if (!timeValidation.valid) {
      throw new BadRequestException(timeValidation.error);
    }

    // Validate within salon hours
    const salonHours = await this.salonOperatingHoursRepository.findBySalonAndDay(
      employee.salonId,
      updatedScheduleData.dayOfWeek,
    );

    if (!salonHours) {
      throw new BadRequestException(`Salon has no operating hours defined for day ${updatedScheduleData.dayOfWeek}`);
    }

    if (salonHours.closed) {
      throw new BadRequestException(`Salon is closed on day ${updatedScheduleData.dayOfWeek}`);
    }

    const employeeStart = parseTime(updatedScheduleData.startTime);
    const employeeEnd = parseTime(updatedScheduleData.endTime);
    const salonStart = parseTime(salonHours.startTime);
    const salonEnd = parseTime(salonHours.endTime);

    if (employeeStart < salonStart) {
      throw new BadRequestException(
        `Employee start time (${updatedScheduleData.startTime}) is before salon opens (${salonHours.startTime})`,
      );
    }

    if (employeeEnd > salonEnd) {
      throw new BadRequestException(
        `Employee end time (${updatedScheduleData.endTime}) is after salon closes (${salonHours.endTime})`,
      );
    }

    // Check for conflicts with other schedules
    const existingSchedules = await this.schedulesRepository.findByEmployeeId(existingSchedule.employeeId);
    const conflicts = detectScheduleConflicts(updatedScheduleData, existingSchedules);

    if (conflicts.hasConflicts) {
      throw new ConflictException(`Schedule conflicts: ${conflicts.conflicts.join(', ')}`);
    }

    return await this.schedulesRepository.update(id, updateScheduleDto);
  }

  async removeSchedule(id: string): Promise<void> {
    const schedule = await this.schedulesRepository.findById(id);
    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    await this.schedulesRepository.delete(id);
  }

  // ========== SERVICE ASSIGNMENT ==========

  async assignServices(employeeId: string, assignServicesDto: AssignServicesDto): Promise<void> {
    // Validate employee exists
    const employee = await this.findOne(employeeId);

    // Validate all services exist and belong to the same salon
    for (const serviceId of assignServicesDto.serviceIds) {
      const service = await this.servicesRepository.findById(serviceId);

      if (!service) {
        throw new NotFoundException(`Service with ID ${serviceId} not found`);
      }

      if (service.salonId !== employee.salonId) {
        throw new BadRequestException(
          `Service ${serviceId} does not belong to the same salon as employee`,
        );
      }

      if (!service.isActive) {
        throw new BadRequestException(`Cannot assign inactive service ${serviceId}`);
      }

      // Check if already assigned
      const exists = await this.employeeServicesRepository.exists(employeeId, serviceId);
      if (exists) {
        throw new ConflictException(`Service ${serviceId} is already assigned to this employee`);
      }
    }

    // Create all assignments
    await this.employeeServicesRepository.bulkCreate(employeeId, assignServicesDto.serviceIds);
  }

  async findEmployeeServices(employeeId: string) {
    // Validate employee exists
    await this.findOne(employeeId);
    return await this.servicesRepository.findByEmployeeId(employeeId);
  }

  async removeServiceFromEmployee(employeeId: string, serviceId: string): Promise<void> {
    // Validate employee exists
    await this.findOne(employeeId);

    // Check if assignment exists
    const exists = await this.employeeServicesRepository.exists(employeeId, serviceId);
    if (!exists) {
      throw new NotFoundException(`Service ${serviceId} is not assigned to employee ${employeeId}`);
    }

    await this.employeeServicesRepository.delete(employeeId, serviceId);
  }
}

