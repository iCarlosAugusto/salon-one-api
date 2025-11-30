import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { EmployeesRepository } from './employees.repository';
import { EmployeeSchedulesRepository } from './employee-schedules.repository';
import { EmployeeServicesRepository } from './employee-services.repository';
import { SalonsModule } from '../salons/salons.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [SalonsModule, ServicesModule],
  controllers: [EmployeesController],
  providers: [
    EmployeesRepository,
    EmployeeSchedulesRepository,
    EmployeeServicesRepository,
    EmployeesService,
  ],
  exports: [
    EmployeesService,
    EmployeesRepository,
    EmployeeSchedulesRepository,
    EmployeeServicesRepository,
  ],
})
export class EmployeesModule {}

