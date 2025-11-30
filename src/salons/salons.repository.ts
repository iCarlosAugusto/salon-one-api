import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import { salons, Salon, NewSalon } from '../database/schemas/salon.schema';

@Injectable()
export class SalonsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<{ salons: typeof salons }>,
  ) {}

  async create(data: NewSalon): Promise<Salon> {
    const [salon] = await this.db.insert(salons).values(data).returning();
    return salon;
  }

  async findAll(): Promise<Salon[]> {
    return await this.db.select().from(salons);
  }

  async findById(id: string): Promise<Salon | undefined> {
    const [salon] = await this.db.select().from(salons).where(eq(salons.id, id));
    return salon;
  }

  async findBySlug(slug: string): Promise<Salon | undefined> {
    const [salon] = await this.db.select().from(salons).where(eq(salons.slug, slug));
    return salon;
  }

  async update(id: string, data: Partial<NewSalon>): Promise<Salon> {
    const [updatedSalon] = await this.db
      .update(salons)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(salons.id, id))
      .returning();

    return updatedSalon;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(salons).where(eq(salons.id, id));
  }

  async exists(id: string): Promise<boolean> {
    const salon = await this.findById(id);
    return !!salon;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const salon = await this.findBySlug(slug);
    return !!salon;
  }
}

