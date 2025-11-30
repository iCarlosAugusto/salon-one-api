import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { SalonsModule } from './salons/salons.module';

@Module({
  imports: [DatabaseModule, SalonsModule],
})
export class AppModule {}
