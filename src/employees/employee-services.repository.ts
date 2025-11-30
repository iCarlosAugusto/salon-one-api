import { Injectable, Inject } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import { employeeServices, EmployeeService, NewEmployeeService } from '../database/schemas/employee-service.schema';
import { services } from '../database/schemas/service.schema';

@Injectable()
export class EmployeeServicesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<any>,
  ) {}

  async create(data: NewEmployeeService): Promise<EmployeeService> {
    const [assignment] = await this.db.insert(employeeServices).values(data).returning();
    return assignment;
  }

  async findByEmployeeId(employeeId: string) {
    return await this.db
      .select({
        id: employeeServices.id,
        employeeId: employeeServices.employeeId,
        serviceId: employeeServices.serviceId,
        createdAt: employeeServices.createdAt,
        service: services,
      })
      .from(employeeServices)
      .leftJoin(services, eq(employeeServices.serviceId, services.id))
      .where(eq(employeeServices.employeeId, employeeId));
  }

  async findByServiceId(serviceId: string) {
    return await this.db
      .select()
      .from(employeeServices)
      .where(eq(employeeServices.serviceId, serviceId));
  }

  async exists(employeeId: string, serviceId: string): Promise<boolean> {
    const [assignment] = await this.db
      .select()
      .from(employeeServices)
      .where(and(eq(employeeServices.employeeId, employeeId), eq(employeeServices.serviceId, serviceId)));
    return !!assignment;
  }

  async delete(employeeId: string, serviceId: string): Promise<void> {
    await this.db
      .delete(employeeServices)
      .where(and(eq(employeeServices.employeeId, employeeId), eq(employeeServices.serviceId, serviceId)));
  }

  async deleteAllByEmployee(employeeId: string): Promise<void> {
    await this.db.delete(employeeServices).where(eq(employeeServices.employeeId, employeeId));
  }

  async bulkCreate(employeeId: string, serviceIds: string[]): Promise<void> {
    const values = serviceIds.map((serviceId) => ({
      employeeId,
      serviceId,
    }));

    await this.db.insert(employeeServices).values(values);
  }
}

