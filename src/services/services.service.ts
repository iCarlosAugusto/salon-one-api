import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Service, NewService } from '../database/schemas/service.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesRepository } from './services.repository';
import { SalonsRepository } from '../salons/salons.repository';
import { validateServiceDuration, validateServicePrice } from '../common/validators/schedule.validator';
import { Employee } from '../database/schemas/employee.schema';

@Injectable()
export class ServicesService {
  constructor(
    private readonly servicesRepository: ServicesRepository,
    private readonly salonsRepository: SalonsRepository,
  ) {}

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    // Validate salon exists
    const salon = await this.salonsRepository.findById(createServiceDto.salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${createServiceDto.salonId} not found`);
    }

    // Validate duration
    const durationValidation = validateServiceDuration(createServiceDto.duration);
    if (!durationValidation.valid) {
      throw new BadRequestException(durationValidation.error);
    }

    // Validate price
    const priceValidation = validateServicePrice(createServiceDto.price);
    if (!priceValidation.valid) {
      throw new BadRequestException(priceValidation.error);
    }

    // Duration must be in 5-minute increments
    if (createServiceDto.duration % 5 !== 0) {
      throw new BadRequestException('Duration must be in 5-minute increments');
    }

    const newService: NewService = {
      ...createServiceDto,
      price: createServiceDto.price.toString(),
      isActive: createServiceDto.isActive ?? true,
    };

    return await this.servicesRepository.create(newService);
  }

  async findAll(): Promise<Service[]> {
    return await this.servicesRepository.findAll();
  }

  async findBySalonId(salonId: string): Promise<Service[]> {
    // Validate salon exists
    const salon = await this.salonsRepository.findById(salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${salonId} not found`);
    }

    return await this.servicesRepository.findBySalonId(salonId);
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.servicesRepository.findById(id);

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
    // Check if service exists
    await this.findOne(id);

    // Validate duration if provided
    if (updateServiceDto.duration !== undefined) {
      const durationValidation = validateServiceDuration(updateServiceDto.duration);
      if (!durationValidation.valid) {
        throw new BadRequestException(durationValidation.error);
      }

      if (updateServiceDto.duration % 5 !== 0) {
        throw new BadRequestException('Duration must be in 5-minute increments');
      }
    }

    // Validate price if provided
    if (updateServiceDto.price !== undefined) {
      const priceValidation = validateServicePrice(updateServiceDto.price);
      if (!priceValidation.valid) {
        throw new BadRequestException(priceValidation.error);
      }
    }

    const updateData: Partial<NewService> = {
      ...updateServiceDto,
      price: updateServiceDto.price !== undefined ? updateServiceDto.price.toString() : undefined,
    };

    return await this.servicesRepository.update(id, updateData);
  }

  async remove(id: string): Promise<void> {
    // Check if service exists
    await this.findOne(id);

    await this.servicesRepository.delete(id);
  }

  async toggleActive(id: string): Promise<Service> {
    const service = await this.findOne(id);

    return await this.servicesRepository.update(id, {
      isActive: !service.isActive,
    });
  }

  async findActiveServices(salonId: string): Promise<Service[]> {
    // Validate salon exists
    const salon = await this.salonsRepository.findById(salonId);
    if (!salon) {
      throw new NotFoundException(`Salon with ID ${salonId} not found`);
    }

    return await this.servicesRepository.findActiveServices(salonId);
  }

  findEmployeesByServiceId(id: string): Promise<Employee[]> {
    return this.servicesRepository.findEmployeesByServiceId(id);
  }
}

