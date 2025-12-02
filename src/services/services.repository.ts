import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import { services, Service, NewService } from '../database/schemas/service.schema';
import { Employee, employees, employeeServices, salons } from 'src/database/schemas';

@Injectable()
export class ServicesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<any>,
  ) {}

  async create(data: NewService): Promise<Service> {
    const [service] = await this.db.insert(services).values(data).returning();
    return service;
  }

  async findAll(): Promise<Service[]> {
    return await this.db.select().from(services);
  }

  async findBySalonId(salonId: string): Promise<Service[]> {
    return await this.db.select().from(services).where(eq(services.salonId, salonId));
  }


  async findByEmployeeId(employeeId: string): Promise<Service[]> { 
    return await this.db.select({
      id: services.id,
      name: services.name,
      description: services.description,
      isActive: services.isActive,
      createdAt: services.createdAt,
      updatedAt: services.updatedAt,
      salonId: services.salonId,
      price: services.price,
      duration: services.duration,
      category: services.category,
      imageUrl: services.imageUrl,
    }).from(services).innerJoin(employeeServices, eq(services.id, employeeServices.serviceId)).where(eq(employeeServices.employeeId, employeeId));
  }

  async findById(id: string): Promise<Service | undefined> {
    const [service] = await this.db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async update(id: string, data: Partial<NewService>): Promise<Service> {
    const [updatedService] = await this.db
      .update(services)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
      .returning();

    return updatedService;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(services).where(eq(services.id, id));
  }

  async exists(id: string): Promise<boolean> {
    const service = await this.findById(id);
    return !!service;
  }

  async findActiveServices(salonId: string): Promise<Service[]> {
    return await this.db
      .select()
      .from(services)
      .where(and(eq(services.salonId, salonId), eq(services.isActive, true)));
  }

  async findServicesBySalonSlug(slug: string): Promise<Service[]> {
    const [salon] = await this.db.select().from(salons).where(eq(salons.slug, slug));
    if (!salon) {
      throw new NotFoundException(`Salon with slug ${slug} not found`);
    }
    return await this.db.select().from(services).where(eq(services.salonId, salon.id));
  }

  async findEmployeesByServiceId(id: string): Promise<Employee[]> {
    const result = await this.db.select()
      .from(employees)
      .innerJoin(employeeServices, eq(employees.id, employeeServices.employeeId))
      .where(eq(employeeServices.serviceId, id));
    return result.map((row) => row.employees);
  }
}

