import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import { services, Service, NewService } from '../database/schemas/service.schema';

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
}

