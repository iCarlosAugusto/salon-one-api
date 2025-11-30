import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ServicesRepository } from './services.repository';
import { SalonsModule } from '../salons/salons.module';

@Module({
  imports: [SalonsModule],
  controllers: [ServicesController],
  providers: [ServicesRepository, ServicesService],
  exports: [ServicesService, ServicesRepository],
})
export class ServicesModule {}

