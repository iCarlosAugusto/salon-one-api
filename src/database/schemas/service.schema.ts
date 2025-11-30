import { pgTable, uuid, varchar, text, decimal, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { salons } from './salon.schema';

export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  salonId: uuid('salon_id').notNull().references(() => salons.id, { onDelete: 'cascade' }),
  
  // Service details
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Pricing and duration
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  duration: integer('duration').notNull(), // Duration in minutes
  
  // Categorization
  category: varchar('category', { length: 100 }), // e.g., 'haircut', 'beard', 'combo', 'coloring'
  
  // Media and visibility
  imageUrl: varchar('image_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;

