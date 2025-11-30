import { pgTable, uuid, varchar, text, boolean, timestamp, date } from 'drizzle-orm/pg-core';
import { salons } from './salon.schema';

export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().primaryKey(),
  salonId: uuid('salon_id').notNull().references(() => salons.id, { onDelete: 'cascade' }),
  
  // Personal information
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  
  // Profile
  avatar: varchar('avatar', { length: 500 }),
  bio: text('bio'),
  
  // Employment details
  role: varchar('role', { length: 50 }).notNull().default('barber'), // 'barber', 'senior_barber', 'manager', 'receptionist'
  hiredAt: date('hired_at').notNull(),
  
  // Status
  isActive: boolean('is_active').notNull().default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

