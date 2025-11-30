import { pgTable, uuid, integer, decimal, primaryKey } from 'drizzle-orm/pg-core';
import { appointments } from './appointment.schema';
import { services } from './service.schema';

/**
 * Junction table for appointments and services (many-to-many relationship)
 * Allows an appointment to have multiple services
 */
export const appointmentServices = pgTable('appointment_services', {
  appointmentId: uuid('appointment_id')
    .notNull()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => services.id, { onDelete: 'cascade' }),
  
  // Service details cached at booking time
  duration: integer('duration').notNull(), // in minutes
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  
  // Order of services (for display purposes)
  orderIndex: integer('order_index').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.appointmentId, table.serviceId] }),
}));

export type AppointmentService = typeof appointmentServices.$inferSelect;
export type NewAppointmentService = typeof appointmentServices.$inferInsert;

