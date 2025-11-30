import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, time, decimal, integer } from 'drizzle-orm/pg-core';

export const salons = pgTable('salons', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  
  // Address information
  address: varchar('address', { length: 500 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  zipCode: varchar('zip_code', { length: 20 }).notNull(),
  country: varchar('country', { length: 100 }).notNull().default('Brazil'),
  
  // Business information
  logo: varchar('logo', { length: 500 }),
  coverImage: varchar('cover_image', { length: 500 }),
  website: varchar('website', { length: 255 }),
  
  // Operating hours - stored as JSON
  // Example: { "monday": { "open": "09:00", "close": "18:00", "closed": false }, ... }
  operatingHours: jsonb('operating_hours'),
  
  // Settings
  timezone: varchar('timezone', { length: 100 }).notNull().default('America/Sao_Paulo'),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  allowOnlineBooking: boolean('allow_online_booking').notNull().default(true),
  requireBookingApproval: boolean('require_booking_approval').notNull().default(false),
  
  isActive: boolean('is_active').notNull().default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Salon = typeof salons.$inferSelect;
export type NewSalon = typeof salons.$inferInsert;

