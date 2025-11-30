import { pgTable, uuid, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';
import { services } from './service.schema';

// Junction table for many-to-many relationship between employees and services
export const employeeServices = pgTable('employee_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type EmployeeService = typeof employeeServices.$inferSelect;
export type NewEmployeeService = typeof employeeServices.$inferInsert;

