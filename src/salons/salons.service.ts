import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Salon, NewSalon } from '../database/schemas/salon.schema';
import { NewSalonOperatingHours } from '../database/schemas/salon-operating-hours.schema';
import { CreateSalonDto } from './dto/create-salon.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { SalonsRepository } from './salons.repository';
import { SalonOperatingHoursRepository } from './salon-operating-hours.repository';
import { validateScheduleTimes } from '../common/validators/schedule.validator';
import { Service } from 'src/database/schemas/service.schema';
import { ServicesRepository } from 'src/services/services.repository';
import { Employee } from 'src/database/schemas/employee.schema';
import { EmployeesRepository } from 'src/employees/employees.repository';

@Injectable()
export class SalonsService {
  constructor(
    private readonly salonsRepository: SalonsRepository,
    private readonly operatingHoursRepository: SalonOperatingHoursRepository,
    private readonly servicesRepository: ServicesRepository,
    private readonly employeesRepository: EmployeesRepository,
  ) {}

  async create(createSalonDto: CreateSalonDto): Promise<Salon> {
    // Validate operating hours is provided
    if (!createSalonDto.operatingHours || createSalonDto.operatingHours.length === 0) {
      throw new BadRequestException('Operating hours are required when creating a salon');
    }

    // Validate each operating hours entry
    for (const hours of createSalonDto.operatingHours) {
      // Skip validation if day is marked as closed
      if (hours.closed) {
        continue;
      }

      // Validate time ranges
      const timeValidation = validateScheduleTimes({
        id: undefined,
        dayOfWeek: hours.dayOfWeek,
        startTime: hours.startTime,
        endTime: hours.endTime,
      });
      if (!timeValidation.valid) {
        throw new BadRequestException(`Operating hours validation failed for day ${hours.dayOfWeek}: ${timeValidation.error}`);
      }
    }

    // Check for duplicate days in operating hours
    const days = createSalonDto.operatingHours.map(h => h.dayOfWeek);
    const uniqueDays = new Set(days);
    if (days.length !== uniqueDays.size) {
      throw new BadRequestException('Operating hours contain duplicate days');
    }

    try {
      const newSalon: NewSalon = {
        name: createSalonDto.name,
        slug: createSalonDto.slug,
        description: createSalonDto.description,
        email: createSalonDto.email,
        phone: createSalonDto.phone,
        address: createSalonDto.address,
        city: createSalonDto.city,
        state: createSalonDto.state,
        zipCode: createSalonDto.zipCode,
        country: createSalonDto.country || 'Brazil',
        logo: createSalonDto.logo,
        coverImage: createSalonDto.coverImage,
        website: createSalonDto.website,
        timezone: createSalonDto.timezone || 'America/Sao_Paulo',
        currency: createSalonDto.currency || 'BRL',
        allowOnlineBooking: createSalonDto.allowOnlineBooking ?? true,
        requireBookingApproval: createSalonDto.requireBookingApproval ?? false,
        isActive: createSalonDto.isActive ?? true,
      };

      const salon = await this.salonsRepository.create(newSalon);

      // Create all operating hours for the salon
      try {
        for (const hours of createSalonDto.operatingHours) {
          const newHours: NewSalonOperatingHours = {
            salonId: salon.id,
            dayOfWeek: hours.dayOfWeek,
            startTime: hours.startTime,
            endTime: hours.endTime,
            closed: hours.closed ?? false,
          };

          await this.operatingHoursRepository.create(newHours);
        }
      } catch (error) {
        // If operating hours creation fails, delete the salon to maintain data integrity
        await this.salonsRepository.delete(salon.id);
        throw new BadRequestException('Failed to create salon operating hours. Salon creation rolled back.');
      }

      return salon;
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

  async findSalonDataAndServices(slug: string): Promise<Salon & { services: Service[] }> {
    const salon = await this.findBySlug(slug);
    const services = await this.servicesRepository.findBySalonId(salon.id);
    return { ...salon, services };
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

  async findById(id: string): Promise<Salon> {
    const salon = await this.salonsRepository.findById(id);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${id} not found`);
    }
    return salon;
  }

  async findServicesBySlug(slug: string): Promise<Service[]> {
    return await this.servicesRepository.findServicesBySalonSlug(slug);
  }

  async findEmployeesBySlug(slug: string): Promise<Employee[]> {
    const salon = await this.findBySlug(slug);
    return await this.employeesRepository.findBySalonId(salon.id);
  }
}

