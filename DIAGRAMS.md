# User Flow & Architecture Diagrams

## Current System Flow (Phase 1)

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                              │
│                   (curl, Postman, Frontend)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP Request
                           │ (JSON)
┌──────────────────────────┼──────────────────────────────────┐
│                          ▼                                   │
│                     FASTIFY SERVER                           │
│                    (Port 3000)                               │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              NestJS Application                       │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │         Global Validation Pipe              │    │  │
│  │  │  • Validates all incoming DTOs              │    │  │
│  │  │  • Whitelist unknown properties             │    │  │
│  │  │  • Transform types                          │    │  │
│  │  └──────────────────┬──────────────────────────┘    │  │
│  │                     │                                │  │
│  │  ┌──────────────────▼──────────────────────────┐    │  │
│  │  │        SalonsController                     │    │  │
│  │  │                                             │    │  │
│  │  │  Endpoints:                                 │    │  │
│  │  │  • POST   /salons                          │    │  │
│  │  │  • GET    /salons                          │    │  │
│  │  │  • GET    /salons/:id                      │    │  │
│  │  │  • GET    /salons/slug/:slug               │    │  │
│  │  │  • PATCH  /salons/:id                      │    │  │
│  │  │  • PATCH  /salons/:id/toggle-active        │    │  │
│  │  │  • DELETE /salons/:id                      │    │  │
│  │  └──────────────────┬──────────────────────────┘    │  │
│  │                     │                                │  │
│  │  ┌──────────────────▼──────────────────────────┐    │  │
│  │  │        SalonsService                        │    │  │
│  │  │                                             │    │  │
│  │  │  Business Logic:                            │    │  │
│  │  │  • create()                                 │    │  │
│  │  │  • findAll()                                │    │  │
│  │  │  • findOne(id)                              │    │  │
│  │  │  • findBySlug(slug)                         │    │  │
│  │  │  • update(id, data)                         │    │  │
│  │  │  • remove(id)                               │    │  │
│  │  │  • toggleActive(id)                         │    │  │
│  │  └──────────────────┬──────────────────────────┘    │  │
│  │                     │                                │  │
│  │  ┌──────────────────▼──────────────────────────┐    │  │
│  │  │        Drizzle ORM                          │    │  │
│  │  │                                             │    │  │
│  │  │  Type-safe queries:                         │    │  │
│  │  │  • db.insert(salons)                        │    │  │
│  │  │  • db.select().from(salons)                 │    │  │
│  │  │  • db.update(salons)                        │    │  │
│  │  │  • db.delete(salons)                        │    │  │
│  │  └──────────────────┬──────────────────────────┘    │  │
│  └────────────────────┼──────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────┘
                        │ SQL Queries
┌───────────────────────▼──────────────────────────────────┐
│                 PostgreSQL Database                       │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │                 salons table                       │  │
│  │                                                    │  │
│  │  • id (UUID, PK)                                   │  │
│  │  • name, slug, description                         │  │
│  │  • email, phone                                    │  │
│  │  • address, city, state, zipCode, country          │  │
│  │  • logo, coverImage, website                       │  │
│  │  • operatingHours (JSONB)                          │  │
│  │  • timezone, currency                              │  │
│  │  • allowOnlineBooking, requireBookingApproval      │  │
│  │  • plan, isActive                                  │  │
│  │  • createdAt, updatedAt                            │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Data Flow Example: Create Salon

```
┌──────────┐    1. POST /salons       ┌──────────────┐
│  Client  │─────(JSON payload)──────▶│   Fastify    │
└──────────┘                          └──────┬───────┘
                                             │
                                      2. Route to
                                        controller
                                             │
                                      ┌──────▼───────┐
                                      │ Validation   │
                                      │ Pipe         │
                                      │              │
                                      │ Validates    │
                                      │ CreateSalon  │
                                      │ DTO          │
                                      └──────┬───────┘
                                             │
                                      3. Valid? Yes
                                             │
                                      ┌──────▼────────────┐
                                      │ SalonsController  │
                                      │ .create()         │
                                      └──────┬────────────┘
                                             │
                                      4. Call service
                                             │
                                      ┌──────▼───────────┐
                                      │ SalonsService    │
                                      │ .create()        │
                                      │                  │
                                      │ • Set defaults   │
                                      │ • Call DB        │
                                      └──────┬───────────┘
                                             │
                                      5. Insert query
                                             │
                                      ┌──────▼───────────┐
                                      │ Drizzle ORM      │
                                      │                  │
                                      │ db.insert(salons)│
                                      │   .values(data)  │
                                      │   .returning()   │
                                      └──────┬───────────┘
                                             │
                                      6. SQL: INSERT INTO
                                             │
                                      ┌──────▼───────────┐
                                      │ PostgreSQL       │
                                      │                  │
                                      │ Inserts row      │
                                      │ Returns new data │
                                      └──────┬───────────┘
                                             │
                                      7. Return salon object
                                             │
┌──────────┐    8. Response 201      ┌──────▼───────┐
│  Client  │◀──────(JSON salon)───────│   Fastify    │
└──────────┘         Created          └──────────────┘
```

## Module Dependency Graph

```
┌─────────────────────────────────────────────────┐
│                  AppModule                      │
│                                                 │
│  Imports:                                       │
│  • DatabaseModule (Global)                      │
│  • SalonsModule                                 │
└──────────────┬──────────────────────────────────┘
               │
               ├──────────────────┐
               │                  │
     ┌─────────▼───────┐   ┌──────▼─────────┐
     │ DatabaseModule  │   │  SalonsModule  │
     │   (Global)      │   │                │
     │                 │   │  Controllers:  │
     │  Providers:     │   │  • Salons      │
     │  • DATABASE_    │   │                │
     │    CONNECTION   │   │  Providers:    │
     │                 │   │  • SalonsService│
     │  Exports:       │   │                │
     │  • DATABASE_    │   │  Exports:      │
     │    CONNECTION   │   │  • SalonsService│
     └─────────────────┘   └────────────────┘
```

## Future Architecture (Phase 2+)

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT/FRONTEND                         │
│               (React/Vue/Angular/Mobile)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    JWT Token in
                    Authorization Header
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                          ▼                                   │
│                   FASTIFY SERVER                             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              JWT Auth Guard                            │ │
│  │        (Phase 2: Validates token)                      │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼────────────────────────────┐   │
│  │              Role Guard                              │   │
│  │        (Phase 2: Checks permissions)                 │   │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼────────────────────────────┐   │
│  │                   Controllers                        │   │
│  │                                                      │   │
│  │  • SalonsController                                  │   │
│  │  • UsersController       (Phase 2)                   │   │
│  │  • AuthController        (Phase 2)                   │   │
│  │  • StaffController       (Phase 3)                   │   │
│  │  • ServicesController    (Phase 4)                   │   │
│  │  • AppointmentsController (Phase 4)                  │   │
│  │  • PaymentsController    (Phase 7)                   │   │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼────────────────────────────┐   │
│  │                   Services Layer                     │   │
│  │                                                      │   │
│  │  Business Logic & Data Operations                    │   │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼────────────────────────────┐   │
│  │                  Drizzle ORM                         │   │
│  └─────────────────────────┬──────────────────────────────┘ │
└────────────────────────────┼──────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────┐
│                    PostgreSQL Database                    │
│                                                           │
│  Tables:                                                  │
│  ✅ salons                                                │
│  ⏳ users                    (Phase 2)                    │
│  ⏳ salon_staff              (Phase 3)                    │
│  ⏳ services                 (Phase 4)                    │
│  ⏳ staff_availability       (Phase 3)                    │
│  ⏳ appointments             (Phase 4)                    │
│  ⏳ client_profiles          (Phase 6)                    │
│  ⏳ payments                 (Phase 7)                    │
│  ⏳ reviews                  (Phase 8)                    │
└───────────────────────────────────────────────────────────┘
```

## Request/Response Flow with Validation

```
Client Request
    │
    │ POST /salons
    │ Body: { name: "Barber", email: "test", ... }
    │
    ▼
┌────────────────────────┐
│  Validation Pipe       │
│                        │
│  class-validator       │
│  decorators check:     │
│  • @IsEmail() ────────┼─────▶ FAIL! ────▶ 400 Bad Request
│  • @IsString()         │                   { message: "email must be valid" }
│  • @MinLength()        │
└────────┬───────────────┘
         │ PASS
         ▼
┌────────────────────────┐
│  Controller Method     │
│                        │
│  @Post()               │
│  create(@Body() dto)   │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Service Method        │
│                        │
│  • Business logic      │
│  • Data transformation │
│  • DB operations       │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Database              │
│                        │
│  INSERT INTO salons... │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Return Response       │
│                        │
│  201 Created           │
│  { id, name, ... }     │
└────────────────────────┘
```

## Error Handling Flow

```
Request
   │
   ▼
Try {
   │
   ▼
Service Logic
   │
   ▼
Database Query
   │
} Catch {
   │
   ├─────▶ Unique Constraint Error (23505)
   │       └─▶ throw ConflictException("Slug exists")
   │           └─▶ Response: 409 Conflict
   │
   ├─────▶ Record Not Found
   │       └─▶ throw NotFoundException("Salon not found")
   │           └─▶ Response: 404 Not Found
   │
   ├─────▶ Validation Error
   │       └─▶ throw BadRequestException("Invalid data")
   │           └─▶ Response: 400 Bad Request
   │
   └─────▶ Unknown Error
           └─▶ throw InternalServerErrorException()
               └─▶ Response: 500 Internal Server Error
}
```

---

## Key Architectural Decisions

### 1. Modular Monolith
- Start as monolith for simplicity
- Clean module boundaries for future microservices
- Each feature is a self-contained NestJS module

### 2. Multi-Tenant from Start
- Each salon is a tenant
- Future: Add tenant isolation in queries
- Future: Separate database per tenant option

### 3. Type Safety Everywhere
- TypeScript strict mode
- Drizzle for type-safe queries
- DTOs for API contracts
- Schema inference for compile-time checks

### 4. Separation of Concerns
- Controllers: HTTP layer only
- Services: Business logic
- Schemas: Data structure
- DTOs: Validation & transformation

### 5. Global Providers
- DatabaseModule is @Global()
- Inject DATABASE_CONNECTION anywhere
- No circular dependencies

