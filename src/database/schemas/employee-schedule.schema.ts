import { pgTable, uuid, integer, time, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';
import { salons } from './salon.schema';

export const employeeSchedules = pgTable('employee_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  salonId: uuid('salon_id').notNull().references(() => salons.id, { onDelete: 'cascade' }),
  
  // Day of week (0 = Sunday, 6 = Saturday)
  dayOfWeek: integer('day_of_week').notNull(), // 0-6
  
  // Work hours
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  
  // Status
  isAvailable: boolean('is_available').notNull().default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure one schedule per employee per day
  uniqueEmployeeDay: unique().on(table.employeeId, table.dayOfWeek),
}));

export type EmployeeSchedule = typeof employeeSchedules.$inferSelect;
export type NewEmployeeSchedule = typeof employeeSchedules.$inferInsert;

