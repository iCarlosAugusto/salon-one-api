import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import { employeeSchedules, EmployeeSchedule, NewEmployeeSchedule } from '../database/schemas/employee-schedule.schema';

@Injectable()
export class EmployeeSchedulesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<any>,
  ) {}

  async create(data: NewEmployeeSchedule): Promise<EmployeeSchedule> {
    const [schedule] = await this.db.insert(employeeSchedules).values(data).returning();
    return schedule;
  }

  async findByEmployeeId(employeeId: string): Promise<EmployeeSchedule[]> {
    return await this.db
      .select()
      .from(employeeSchedules)
      .where(eq(employeeSchedules.employeeId, employeeId))
      .orderBy(employeeSchedules.dayOfWeek);
  }

  async findByEmployeeAndDay(employeeId: string, dayOfWeek: number): Promise<EmployeeSchedule | undefined> {
    const [schedule] = await this.db
      .select()
      .from(employeeSchedules)
      .where(and(eq(employeeSchedules.employeeId, employeeId), eq(employeeSchedules.dayOfWeek, dayOfWeek)));
    return schedule;
  }

  async findById(id: string): Promise<EmployeeSchedule | undefined> {
    const [schedule] = await this.db.select().from(employeeSchedules).where(eq(employeeSchedules.id, id));
    return schedule;
  }

  async update(id: string, data: Partial<NewEmployeeSchedule>): Promise<EmployeeSchedule> {
    const [updatedSchedule] = await this.db
      .update(employeeSchedules)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(employeeSchedules.id, id))
      .returning();

    return updatedSchedule;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(employeeSchedules).where(eq(employeeSchedules.id, id));
  }

  async deleteByEmployeeAndDay(employeeId: string, dayOfWeek: number): Promise<void> {
    await this.db
      .delete(employeeSchedules)
      .where(and(eq(employeeSchedules.employeeId, employeeId), eq(employeeSchedules.dayOfWeek, dayOfWeek)));
  }

  async exists(employeeId: string, dayOfWeek: number): Promise<boolean> {
    const schedule = await this.findByEmployeeAndDay(employeeId, dayOfWeek);
    return !!schedule;
  }
}

