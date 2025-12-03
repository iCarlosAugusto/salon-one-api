import { Injectable, Inject } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import { appointmentServices, AppointmentService, NewAppointmentService } from '../database/schemas/appointment-service.schema';
import { appointments } from '../database/schemas/appointment.schema';

@Injectable()
export class AppointmentServicesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<any>,
  ) {}

  async create(data: NewAppointmentService): Promise<AppointmentService> {
    const [appointmentService] = await this.db
      .insert(appointmentServices)
      .values(data)
      .returning();
    return appointmentService;
  }

  async createMany(data: NewAppointmentService[]): Promise<AppointmentService[]> {
    if (data.length === 0) return [];
    return await this.db.insert(appointmentServices).values(data).returning();
  }

  async findByAppointmentId(appointmentId: string): Promise<AppointmentService[]> {
    return await this.db
      .select()
      .from(appointmentServices)
      .where(eq(appointmentServices.appointmentId, appointmentId))
      .orderBy(appointmentServices.orderIndex);
  }

  async findByEmployeeAndDate(
    employeeId: string,
    date: string,
  ): Promise<any[]> {
    const results = await this.db
      .select({
        appointmentService: appointmentServices,
        appointment: appointments,
      })
      .from(appointmentServices)
      .innerJoin(appointments, eq(appointmentServices.appointmentId, appointments.id))
      .where(
        and(
          eq(appointmentServices.employeeId, employeeId),
          eq(appointments.appointmentDate, date),
        ),
      );
    
    return results.map(r => r.appointmentService);
  }

  async findByEmployeeAndDateWithStatus(
    employeeId: string,
    date: string,
    statuses: string[],
  ): Promise<any[]> {
    return await this.db
      .select({
        appointmentService: appointmentServices,
        appointment: appointments,
      })
      .from(appointmentServices)
      .innerJoin(appointments, eq(appointmentServices.appointmentId, appointments.id))
      .where(
        and(
          eq(appointmentServices.employeeId, employeeId),
          eq(appointments.appointmentDate, date),
          inArray(appointments.status, statuses),
        ),
      );
  }

  async findByAppointmentAndService(
    appointmentId: string,
    serviceId: string,
  ): Promise<AppointmentService | undefined> {
    const [appointmentService] = await this.db
      .select()
      .from(appointmentServices)
      .where(
        and(
          eq(appointmentServices.appointmentId, appointmentId),
          eq(appointmentServices.serviceId, serviceId),
        ),
      );
    return appointmentService;
  }

  async delete(appointmentId: string, serviceId: string): Promise<void> {
    await this.db
      .delete(appointmentServices)
      .where(
        and(
          eq(appointmentServices.appointmentId, appointmentId),
          eq(appointmentServices.serviceId, serviceId),
        ),
      );
  }

  async deleteByAppointmentId(appointmentId: string): Promise<void> {
    await this.db
      .delete(appointmentServices)
      .where(eq(appointmentServices.appointmentId, appointmentId));
  }

  async exists(appointmentId: string, serviceId: string): Promise<boolean> {
    const result = await this.findByAppointmentAndService(appointmentId, serviceId);
    return !!result;
  }
}

