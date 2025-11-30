import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { AssignServicesDto } from './dto/assign-services.dto';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // ========== EMPLOYEE CRUD ==========

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  findAll(@Query('salonId') salonId?: string) {
    if (salonId) {
      return this.employeesService.findBySalonId(salonId);
    }
    return this.employeesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.employeesService.toggleActive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  // ========== SCHEDULE MANAGEMENT ==========

  @Post(':employeeId/schedules')
  @HttpCode(HttpStatus.CREATED)
  createSchedule(
    @Param('employeeId') employeeId: string,
    @Body() createScheduleDto: CreateScheduleDto,
  ) {
    return this.employeesService.createSchedule(employeeId, createScheduleDto);
  }

  @Get(':employeeId/schedules')
  findSchedules(@Param('employeeId') employeeId: string) {
    return this.employeesService.findSchedules(employeeId);
  }

  @Get(':employeeId/schedules/:dayOfWeek')
  findScheduleByDay(
    @Param('employeeId') employeeId: string,
    @Param('dayOfWeek') dayOfWeek: string,
  ) {
    return this.employeesService.findScheduleByDay(employeeId, parseInt(dayOfWeek));
  }

  @Patch('schedules/:scheduleId')
  updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.employeesService.updateSchedule(scheduleId, updateScheduleDto);
  }

  @Delete('schedules/:scheduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSchedule(@Param('scheduleId') scheduleId: string) {
    return this.employeesService.removeSchedule(scheduleId);
  }

  // ========== SERVICE ASSIGNMENT ==========

  @Post(':employeeId/services')
  @HttpCode(HttpStatus.CREATED)
  assignServices(
    @Param('employeeId') employeeId: string,
    @Body() assignServicesDto: AssignServicesDto,
  ) {
    return this.employeesService.assignServices(employeeId, assignServicesDto);
  }

  @Get(':employeeId/services')
  findEmployeeServices(@Param('employeeId') employeeId: string) {
    return this.employeesService.findEmployeeServices(employeeId);
  }

  @Delete(':employeeId/services/:serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeServiceFromEmployee(
    @Param('employeeId') employeeId: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.employeesService.removeServiceFromEmployee(employeeId, serviceId);
  }
}

