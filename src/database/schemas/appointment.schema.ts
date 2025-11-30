import { pgTable, uuid, varchar, text, decimal, integer, date, time, timestamp, boolean } from 'drizzle-orm/pg-core';
import { salons } from './salon.schema';
import { employees } from './employee.schema';
import { services } from './service.schema';

export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  salonId: uuid('salon_id').notNull().references(() => salons.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  
  // Appointment date and time
  appointmentDate: date('appointment_date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  
  // Duration (cached from service for performance)
  duration: integer('duration').notNull(), // in minutes
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  // Status values: 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
  
  // Client information (temporary, until clients table exists)
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }),
  clientPhone: varchar('client_phone', { length: 50 }).notNull(),
  
  // Pricing (cached from service, allows custom pricing)
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  
  // Notes
  notes: text('notes'),
  cancellationReason: text('cancellation_reason'),
  
  // Reminders
  reminderSent: boolean('reminder_sent').notNull().default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

