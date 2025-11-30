import { Injectable, Inject } from '@nestjs/common';
import { eq, and, inArray, gte, lte } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import { appointments, Appointment, NewAppointment } from '../database/schemas/appointment.schema';

@Injectable()
export class AppointmentsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<any>,
  ) {}

  async create(data: NewAppointment): Promise<Appointment> {
    const [appointment] = await this.db.insert(appointments).values(data).returning();
    return appointment;
  }

  async findAll(): Promise<Appointment[]> {
    return await this.db.select().from(appointments);
  }

  async findBySalonId(salonId: string): Promise<Appointment[]> {
    return await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.salonId, salonId))
      .orderBy(appointments.appointmentDate, appointments.startTime);
  }

  async findById(id: string): Promise<Appointment | undefined> {
    const [appointment] = await this.db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async findByEmployeeAndDate(
    employeeId: string,
    date: string,
  ): Promise<Appointment[]> {
    return await this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.employeeId, employeeId),
          eq(appointments.appointmentDate, date),
        ),
      )
      .orderBy(appointments.startTime);
  }

  async findByEmployeeAndDateWithStatus(
    employeeId: string,
    date: string,
    statuses: string[],
  ): Promise<Appointment[]> {
    return await this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.employeeId, employeeId),
          eq(appointments.appointmentDate, date),
          inArray(appointments.status, statuses),
        ),
      )
      .orderBy(appointments.startTime);
  }

  async findBySalonAndDate(salonId: string, date: string): Promise<Appointment[]> {
    return await this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.salonId, salonId),
          eq(appointments.appointmentDate, date),
        ),
      )
      .orderBy(appointments.startTime);
  }

  async findBySalonAndDateRange(
    salonId: string,
    startDate: string,
    endDate: string,
  ): Promise<Appointment[]> {
    return await this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.salonId, salonId),
          gte(appointments.appointmentDate, startDate),
          lte(appointments.appointmentDate, endDate),
        ),
      )
      .orderBy(appointments.appointmentDate, appointments.startTime);
  }

  async update(id: string, data: Partial<NewAppointment>): Promise<Appointment> {
    const [updatedAppointment] = await this.db
      .update(appointments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();

    return updatedAppointment;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(appointments).where(eq(appointments.id, id));
  }

  async exists(id: string): Promise<boolean> {
    const appointment = await this.findById(id);
    return !!appointment;
  }

  async countByEmployeeAndDate(employeeId: string, date: string): Promise<number> {
    const result = await this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.employeeId, employeeId),
          eq(appointments.appointmentDate, date),
          inArray(appointments.status, ['pending', 'confirmed', 'in_progress']),
        ),
      );

    return result.length;
  }

  async findConflictingAppointments(
    employeeId: string,
    appointmentDate: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<Appointment[]> {
    // This would ideally use time range overlap query, but for now we fetch all and filter in service
    const allAppointments = await this.findByEmployeeAndDateWithStatus(
      employeeId,
      appointmentDate,
      ['pending', 'confirmed', 'in_progress'],
    );

    // Filter out the appointment being updated
    return excludeId
      ? allAppointments.filter((apt) => apt.id !== excludeId)
      : allAppointments;
  }
}

