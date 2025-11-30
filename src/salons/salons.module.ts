import { Module } from '@nestjs/common';
import { SalonsService } from './salons.service';
import { SalonsController } from './salons.controller';
import { SalonsRepository } from './salons.repository';
import { SalonOperatingHoursRepository } from './salon-operating-hours.repository';
import { ServicesRepository } from 'src/services/services.repository';

@Module({
  controllers: [SalonsController],
  providers: [SalonsRepository, SalonOperatingHoursRepository, SalonsService, ServicesRepository],
  exports: [SalonsService, SalonsRepository, SalonOperatingHoursRepository],
})
export class SalonsModule {}

