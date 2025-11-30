import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Salon, NewSalon } from '../database/schemas/salon.schema';
import { CreateSalonDto } from './dto/create-salon.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { SalonsRepository } from './salons.repository';

@Injectable()
export class SalonsService {
  constructor(private readonly salonsRepository: SalonsRepository) {}

  async create(createSalonDto: CreateSalonDto): Promise<Salon> {
    try {
      const newSalon: NewSalon = {
        ...createSalonDto,
        country: createSalonDto.country || 'Brazil',
        timezone: createSalonDto.timezone || 'America/Sao_Paulo',
        currency: createSalonDto.currency || 'BRL',
        allowOnlineBooking: createSalonDto.allowOnlineBooking ?? true,
        requireBookingApproval: createSalonDto.requireBookingApproval ?? false,
        isActive: createSalonDto.isActive ?? true,
      };

      return await this.salonsRepository.create(newSalon);
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new ConflictException('A salon with this slug already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<Salon[]> {
    return await this.salonsRepository.findAll();
  }

  async findOne(id: string): Promise<Salon> {
    const salon = await this.salonsRepository.findById(id);
    
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${id} not found`);
    }
    
    return salon;
  }

  async findBySlug(slug: string): Promise<Salon> {
    const salon = await this.salonsRepository.findBySlug(slug);
    
    if (!salon) {
      throw new NotFoundException(`Salon with slug ${slug} not found`);
    }
    
    return salon;
  }

  async update(id: string, updateSalonDto: UpdateSalonDto): Promise<Salon> {
    // First check if salon exists
    await this.findOne(id);

    try {
      return await this.salonsRepository.update(id, updateSalonDto);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException('A salon with this slug already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    // First check if salon exists
    await this.findOne(id);

    await this.salonsRepository.delete(id);
  }

  async toggleActive(id: string): Promise<Salon> {
    const salon = await this.findOne(id);
    
    return await this.salonsRepository.update(id, {
      isActive: !salon.isActive,
    });
  }
}

