import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { salons } from './src/database/schemas/salon.schema';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;

async function seed() {
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('🌱 Seeding database...');

  try {
    // Sample salons
    const sampleSalons = [
      {
        name: 'Barbearia Moderna',
        slug: 'barbearia-moderna',
        description: 'A melhor barbearia da cidade com profissionais experientes',
        email: 'contato@barberiamoderna.com',
        phone: '+5511999999999',
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        country: 'Brazil',
        website: 'https://barberiamoderna.com',
        operatingHours: {
          monday: { open: '09:00', close: '19:00', closed: false },
          tuesday: { open: '09:00', close: '19:00', closed: false },
          wednesday: { open: '09:00', close: '19:00', closed: false },
          thursday: { open: '09:00', close: '19:00', closed: false },
          friday: { open: '09:00', close: '20:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: false },
          sunday: { closed: true },
        },
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        allowOnlineBooking: true,
        requireBookingApproval: false,
        plan: 'premium',
        isActive: true,
      },
      {
        name: 'Classic Barber Shop',
        slug: 'classic-barber-shop',
        description: 'Traditional barbershop with classic style and modern techniques',
        email: 'info@classicbarber.com',
        phone: '+5521988888888',
        address: 'Av. Paulista, 456',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22000-000',
        country: 'Brazil',
        website: 'https://classicbarber.com',
        operatingHours: {
          monday: { open: '10:00', close: '18:00', closed: false },
          tuesday: { open: '10:00', close: '18:00', closed: false },
          wednesday: { open: '10:00', close: '18:00', closed: false },
          thursday: { open: '10:00', close: '18:00', closed: false },
          friday: { open: '10:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '15:00', closed: false },
          sunday: { closed: true },
        },
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        allowOnlineBooking: true,
        requireBookingApproval: true,
        plan: 'basic',
        isActive: true,
      },
      {
        name: 'The Gentlemen\'s Cut',
        slug: 'the-gentlemens-cut',
        description: 'Luxury grooming experience for the modern gentleman',
        email: 'contact@gentlemenscut.com',
        phone: '+5531977777777',
        address: 'Rua da Moda, 789',
        city: 'Belo Horizonte',
        state: 'MG',
        zipCode: '30000-000',
        country: 'Brazil',
        operatingHours: {
          monday: { closed: true },
          tuesday: { open: '11:00', close: '20:00', closed: false },
          wednesday: { open: '11:00', close: '20:00', closed: false },
          thursday: { open: '11:00', close: '20:00', closed: false },
          friday: { open: '11:00', close: '21:00', closed: false },
          saturday: { open: '10:00', close: '18:00', closed: false },
          sunday: { open: '10:00', close: '16:00', closed: false },
        },
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        allowOnlineBooking: true,
        requireBookingApproval: false,
        plan: 'enterprise',
        isActive: true,
      },
    ];

    for (const salon of sampleSalons) {
      await db.insert(salons).values(salon);
      console.log(`✓ Created salon: ${salon.name}`);
    }

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

