import { pgTable, uuid, integer, time, timestamp, boolean, unique } from 'drizzle-orm/pg-core';
import { salons } from './salon.schema';

export const salonOperatingHours = pgTable('salon_operating_hours', {
  id: uuid('id').defaultRandom().primaryKey(),
  salonId: uuid('salon_id').notNull().references(() => salons.id, { onDelete: 'cascade' }),
  
  // Day of week (0 = Sunday, 6 = Saturday)
  dayOfWeek: integer('day_of_week').notNull(), // 0-6
  
  // Operating hours
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  
  // Status
  closed: boolean('closed').notNull().default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure one schedule per salon per day
  uniqueSalonDay: unique().on(table.salonId, table.dayOfWeek),
}));

export type SalonOperatingHours = typeof salonOperatingHours.$inferSelect;
export type NewSalonOperatingHours = typeof salonOperatingHours.$inferInsert;

