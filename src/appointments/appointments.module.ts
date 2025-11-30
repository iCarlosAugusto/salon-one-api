import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository } from './appointments.repository';
import { SalonsModule } from '../salons/salons.module';
import { ServicesModule } from '../services/services.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [SalonsModule, ServicesModule, EmployeesModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsRepository, AppointmentsService],
  exports: [AppointmentsService, AppointmentsRepository],
})
export class AppointmentsModule {}

