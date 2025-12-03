import { pgTable, uuid, integer, decimal, primaryKey, time } from 'drizzle-orm/pg-core';
import { appointments } from './appointment.schema';
import { services } from './service.schema';
import { employees } from './employee.schema';

/**
 * Junction table for appointments and services (many-to-many relationship)
 * Each service can have its own assigned employee
 */
export const appointmentServices = pgTable('appointment_services', {
  appointmentId: uuid('appointment_id')
    .notNull()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => services.id, { onDelete: 'cascade' }),
  
  // Employee assigned to this specific service
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  
  // Service details cached at booking time
  duration: integer('duration').notNull(), // in minutes
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  
  // Sequential timing for this service
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  
  // Order of services (for sequential execution)
  orderIndex: integer('order_index').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.appointmentId, table.serviceId] }),
}));

export type AppointmentService = typeof appointmentServices.$inferSelect;
export type NewAppointmentService = typeof appointmentServices.$inferInsert;

