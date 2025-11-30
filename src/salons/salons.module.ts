import { Module } from '@nestjs/common';
import { SalonsService } from './salons.service';
import { SalonsController } from './salons.controller';
import { SalonsRepository } from './salons.repository';
import { SalonOperatingHoursRepository } from './salon-operating-hours.repository';

@Module({
  controllers: [SalonsController],
  providers: [SalonsRepository, SalonOperatingHoursRepository, SalonsService],
  exports: [SalonsService, SalonsRepository, SalonOperatingHoursRepository],
})
export class SalonsModule {}

