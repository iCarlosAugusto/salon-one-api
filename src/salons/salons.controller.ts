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
} from '@nestjs/common';
import { SalonsService } from './salons.service';
import { CreateSalonDto } from './dto/create-salon.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';

@Controller('salons')
export class SalonsController {
  constructor(private readonly salonsService: SalonsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSalonDto: CreateSalonDto) {
    return this.salonsService.create(createSalonDto);
  }

  @Get()
  findAll() {
    return this.salonsService.findAll();
  } 

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.salonsService.findById(id);
  }

  @Get(':slug/slug')
  findBySlug(@Param('slug') slug: string) {
    return this.salonsService.findSalonDataAndServices(slug);
  }

  @Get(':slug/services')
  findServicesBySlug(@Param('slug') slug: string) {
    return this.salonsService.findServicesBySlug(slug);
  }

  @Get(':slug/employees')
  findEmployeesBySlug(@Param('slug') slug: string) {
    return this.salonsService.findEmployeesBySlug(slug);
  }


  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSalonDto: UpdateSalonDto) {
    return this.salonsService.update(id, updateSalonDto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.salonsService.toggleActive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.salonsService.remove(id);
  }
}

