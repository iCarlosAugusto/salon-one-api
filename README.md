# SalonOne - Barbershop SaaS Platform 💈

A modern SaaS platform for barbershops built with NestJS, Fastify, Drizzle ORM, and Bun.

## Features

- 🏢 **Salon Management** - Complete CRUD operations for barbershop establishments
- 📅 **Appointment Booking** - Online booking system for clients (coming soon)
- 👨‍💼 **Staff Management** - Manage barbers and their schedules (coming soon)
- 📊 **Calendar Dashboard** - View daily, weekly, and monthly appointments (coming soon)
- 👥 **CRM Features** - Customer profiles and service history (coming soon)
- 💳 **Payment Integration** - Online prepaid bookings (coming soon)

## Tech Stack

- **Runtime:** Bun
- **Framework:** NestJS
- **HTTP Server:** Fastify
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Validation:** class-validator & class-transformer

## Prerequisites

- Bun v1.0+
- PostgreSQL v14+
- Node.js v18+ (for NestJS compatibility)

## Getting Started

### 1. Clone and Install

```bash
cd nest-fastify-bun
bun install
```

### 2. Setup Environment

Copy the example environment file and update with your database credentials:

```bash
cp .env.example .env
```

Update `.env` with your database connection:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/salonone_db"
PORT=3000
```

### 3. Setup Database

Create your PostgreSQL database:

```bash
psql -U postgres
CREATE DATABASE salonone_db;
\q
```

Generate and push the database schema:

```bash
# Generate migration files
bun run db:generate

# Push schema to database
bun run db:push
```

### 4. Run the Application

```bash
# Development mode
bun run dev

# Production mode
bun run build
bun run start:prod
```

The API will be available at `http://localhost:3000`

## Database Commands

```bash
# Generate migration files from schema changes
bun run db:generate

# Push schema directly to database (no migration files)
bun run db:push

# Run migrations
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio
```

## API Endpoints

### Salons

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/salons` | Create a new salon |
| GET | `/salons` | Get all salons |
| GET | `/salons/:id` | Get salon by ID |
| GET | `/salons/slug/:slug` | Get salon by slug |
| PATCH | `/salons/:id` | Update salon |
| PATCH | `/salons/:id/toggle-active` | Toggle salon active status |
| DELETE | `/salons/:id` | Delete salon |

### Example: Create a Salon

```bash
curl -X POST http://localhost:3000/salons \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Barbearia Moderna",
    "slug": "barbearia-moderna",
    "description": "The best barbershop in town",
    "email": "contato@barberiamoderna.com",
    "phone": "+5511999999999",
    "address": "Rua das Flores, 123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567",
    "country": "Brazil",
    "operatingHours": {
      "monday": { "open": "09:00", "close": "18:00", "closed": false },
      "tuesday": { "open": "09:00", "close": "18:00", "closed": false },
      "wednesday": { "open": "09:00", "close": "18:00", "closed": false },
      "thursday": { "open": "09:00", "close": "18:00", "closed": false },
      "friday": { "open": "09:00", "close": "18:00", "closed": false },
      "saturday": { "open": "09:00", "close": "14:00", "closed": false },
      "sunday": { "closed": true }
    }
  }'
```

## Project Structure

```
src/
├── database/
│   ├── schemas/
│   │   └── salon.schema.ts      # Drizzle schema definitions
│   └── database.module.ts       # Database connection module
├── salons/
│   ├── dto/
│   │   ├── create-salon.dto.ts  # Create salon DTO
│   │   └── update-salon.dto.ts  # Update salon DTO
│   ├── salons.controller.ts     # Salon endpoints (HTTP layer)
│   ├── salons.service.ts        # Salon business logic
│   ├── salons.repository.ts     # Salon data access layer
│   └── salons.module.ts         # Salon module
├── app.module.ts                # Root module
└── main.ts                      # Application entry point
```

### Architecture

We follow a clean layered architecture with the **Repository Pattern**:

- **Controllers** - HTTP request/response handling
- **Services** - Business logic and orchestration  
- **Repositories** - Data access abstraction (NEW!)
- **DTOs** - Input validation
- **Schemas** - Database definitions

See `REPOSITORY_PATTERN.md` for detailed documentation on the data access layer.

## Salon Schema

The `salons` table includes:

- **Basic Info:** name, slug, description, email, phone
- **Address:** address, city, state, zipCode, country
- **Branding:** logo, coverImage, website
- **Operating Hours:** JSON object with weekly schedule
- **Settings:** timezone, currency, booking preferences
- **Subscription:** plan (free/basic/premium/enterprise), isActive
- **Timestamps:** createdAt, updatedAt

## Roadmap

- [x] Salon CRUD operations
- [ ] Staff/Barbers management
- [ ] Services and pricing
- [ ] Appointment scheduling
- [ ] Client management
- [ ] Calendar dashboard
- [ ] Authentication & Authorization
- [ ] Payment integration
- [ ] Notifications (email/SMS)
- [ ] Reports and analytics

## Development

```bash
# Run linter
bun run lint

# Format code
bun run format

# Run tests
bun run test

# Run tests in watch mode
bun run test:watch

# Generate test coverage
bun run test:cov
```

## Contributing

This is a private project. Contact the maintainer for contribution guidelines.

## License

UNLICENSED - Private project
