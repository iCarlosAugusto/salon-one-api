import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import { salonOperatingHours, SalonOperatingHours, NewSalonOperatingHours } from '../database/schemas/salon-operating-hours.schema';

@Injectable()
export class SalonOperatingHoursRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<any>,
  ) {}

  async create(data: NewSalonOperatingHours): Promise<SalonOperatingHours> {
    const [hours] = await this.db.insert(salonOperatingHours).values(data).returning();
    return hours;
  }

  async findBySalonId(salonId: string): Promise<SalonOperatingHours[]> {
    return await this.db
      .select()
      .from(salonOperatingHours)
      .where(eq(salonOperatingHours.salonId, salonId))
      .orderBy(salonOperatingHours.dayOfWeek);
  }

  async findBySalonAndDay(salonId: string, dayOfWeek: number): Promise<SalonOperatingHours | undefined> {
    const [hours] = await this.db
      .select()
      .from(salonOperatingHours)
      .where(and(eq(salonOperatingHours.salonId, salonId), eq(salonOperatingHours.dayOfWeek, dayOfWeek)));
    return hours;
  }

  async findById(id: string): Promise<SalonOperatingHours | undefined> {
    const [hours] = await this.db.select().from(salonOperatingHours).where(eq(salonOperatingHours.id, id));
    return hours;
  }

  async update(id: string, data: Partial<NewSalonOperatingHours>): Promise<SalonOperatingHours> {
    const [updatedHours] = await this.db
      .update(salonOperatingHours)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(salonOperatingHours.id, id))
      .returning();

    return updatedHours;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(salonOperatingHours).where(eq(salonOperatingHours.id, id));
  }

  async deleteBySalonAndDay(salonId: string, dayOfWeek: number): Promise<void> {
    await this.db
      .delete(salonOperatingHours)
      .where(and(eq(salonOperatingHours.salonId, salonId), eq(salonOperatingHours.dayOfWeek, dayOfWeek)));
  }

  async exists(salonId: string, dayOfWeek: number): Promise<boolean> {
    const hours = await this.findBySalonAndDay(salonId, dayOfWeek);
    return !!hours;
  }
}

