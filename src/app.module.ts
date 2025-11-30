import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { SalonsModule } from './salons/salons.module';
import { ServicesModule } from './services/services.module';
import { EmployeesModule } from './employees/employees.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [DatabaseModule, SalonsModule, ServicesModule, EmployeesModule, AppointmentsModule],
})
export class AppModule {}
