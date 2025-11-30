import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import { employees, Employee, NewEmployee } from '../database/schemas/employee.schema';

@Injectable()
export class EmployeesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<any>,
  ) {}

  async create(data: NewEmployee): Promise<Employee> {
    const [employee] = await this.db.insert(employees).values(data).returning();
    return employee;
  }

  async findAll(): Promise<Employee[]> {
    return await this.db.select().from(employees);
  }

  async findBySalonId(salonId: string): Promise<Employee[]> {
    return await this.db.select().from(employees).where(eq(employees.salonId, salonId));
  }

  async findById(id: string): Promise<Employee | undefined> {
    const [employee] = await this.db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async findByEmail(email: string, salonId: string): Promise<Employee | undefined> {
    const [employee] = await this.db
      .select()
      .from(employees)
      .where(and(eq(employees.email, email), eq(employees.salonId, salonId)));
    return employee;
  }

  async update(id: string, data: Partial<NewEmployee>): Promise<Employee> {
    const [updatedEmployee] = await this.db
      .update(employees)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();

    return updatedEmployee;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(employees).where(eq(employees.id, id));
  }

  async exists(id: string): Promise<boolean> {
    const employee = await this.findById(id);
    return !!employee;
  }

  async findActiveEmployees(salonId: string): Promise<Employee[]> {
    return await this.db
      .select()
      .from(employees)
      .where(and(eq(employees.salonId, salonId), eq(employees.isActive, true)));
  }
}

