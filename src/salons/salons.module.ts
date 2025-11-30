import { Module } from '@nestjs/common';
import { SalonsService } from './salons.service';
import { SalonsController } from './salons.controller';
import { SalonsRepository } from './salons.repository';

@Module({
  controllers: [SalonsController],
  providers: [SalonsRepository, SalonsService],
  exports: [SalonsService],
})
export class SalonsModule {}

