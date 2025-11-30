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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * Get available time slots for one or more services
   * Example: GET /available-slots?employeeId=123&serviceIds=svc1,svc2,svc3&date=2024-01-15
   */
  @Get('available-slots')
  getAvailableSlots(@Query() query: AvailableSlotsQueryDto) {
    return this.appointmentsService.getAvailableTimeSlots(
      query.employeeId,
      query.serviceIds,
      query.date,
    );
  }

  /**
   * Check if specific time is available
   */
  @Get('check-availability')
  checkAvailability(
    @Query('employeeId') employeeId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
    @Query('time') time: string,
  ) {
    return this.appointmentsService.checkAvailability(employeeId, serviceId, date, time);
  }

  /**
   * Create appointment
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.create(createAppointmentDto);
  }

  /**
   * Get all appointments (with optional filters)
   */
  @Get()
  findAll(
    @Query('salonId') salonId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('date') date?: string,
  ) {
    if (salonId && date) {
      return this.appointmentsService.findBySalonAndDate(salonId, date);
    }
    
    if (salonId) {
      return this.appointmentsService.findBySalonId(salonId);
    }
    
    if (employeeId && date) {
      return this.appointmentsService.findByEmployeeAndDate(employeeId, date);
    }

    return this.appointmentsService.findAll();
  }

  /**
   * Get appointment by ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  /**
   * Update appointment
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAppointmentDto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  /**
   * Update appointment status
   */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(id, updateStatusDto);
  }

  /**
   * Cancel appointment
   */
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.appointmentsService.cancel(id, reason);
  }

  /**
   * Delete appointment
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }
}

