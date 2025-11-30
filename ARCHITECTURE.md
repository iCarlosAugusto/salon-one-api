# SalonOne - Architecture & Database Design

## System Architecture

### Tech Stack
- **Runtime:** Bun (for speed and TypeScript support)
- **Framework:** NestJS (modular, scalable architecture)
- **HTTP Server:** Fastify (fast, low overhead)
- **Database:** PostgreSQL (reliable, feature-rich)
- **ORM:** Drizzle (type-safe, lightweight)
- **Validation:** class-validator (declarative validation)

### Architecture Pattern
- **Layered Architecture:**
  - **Controllers:** Handle HTTP requests/responses
  - **Services:** Business logic and orchestration
  - **Repositories:** Data access layer (NEW!)
  - **DTOs:** Data validation and transformation
  - **Schemas:** Database structure and types
  - **Modules:** Encapsulated feature domains

### Layer Responsibilities

#### Controller Layer
- HTTP request/response handling
- Route definitions
- DTO validation (via pipes)
- Status code management

#### Service Layer
- Business logic implementation
- Business rule validation
- Orchestration of repositories
- Domain exception handling
- Transaction management

#### Repository Layer (Data Access)
- Database query abstraction
- CRUD operations
- ORM interactions
- No business logic
- Returns entities or undefined

See `REPOSITORY_PATTERN.md` for detailed documentation.

## Database Design

### Current Schema (Phase 1)

#### Salons Table
Multi-tenant base entity representing barbershop establishments.

```typescript
salons
├── id: UUID (PK)
├── name: VARCHAR(255)
├── slug: VARCHAR(255) UNIQUE
├── description: TEXT
├── email: VARCHAR(255)
├── phone: VARCHAR(50)
├── address: VARCHAR(500)
├── city: VARCHAR(100)
├── state: VARCHAR(100)
├── zipCode: VARCHAR(20)
├── country: VARCHAR(100) DEFAULT 'Brazil'
├── logo: VARCHAR(500)
├── coverImage: VARCHAR(500)
├── website: VARCHAR(255)
├── operatingHours: JSONB
├── timezone: VARCHAR(100) DEFAULT 'America/Sao_Paulo'
├── currency: VARCHAR(3) DEFAULT 'BRL'
├── allowOnlineBooking: BOOLEAN DEFAULT true
├── requireBookingApproval: BOOLEAN DEFAULT false
├── plan: VARCHAR(50) DEFAULT 'free'
├── isActive: BOOLEAN DEFAULT true
├── createdAt: TIMESTAMP
└── updatedAt: TIMESTAMP
```

### Planned Schema (Phases 2-5)

#### Users Table
System users (salon owners, staff, clients).

```typescript
users
├── id: UUID (PK)
├── email: VARCHAR(255) UNIQUE
├── password: VARCHAR(255) (hashed)
├── firstName: VARCHAR(100)
├── lastName: VARCHAR(100)
├── phone: VARCHAR(50)
├── avatar: VARCHAR(500)
├── role: ENUM('admin', 'salon_owner', 'staff', 'client')
├── isEmailVerified: BOOLEAN DEFAULT false
├── isActive: BOOLEAN DEFAULT true
├── lastLoginAt: TIMESTAMP
├── createdAt: TIMESTAMP
└── updatedAt: TIMESTAMP
```

#### Salon_Staff (Junction Table)
Relationship between salons and staff members.

```typescript
salon_staff
├── id: UUID (PK)
├── salonId: UUID (FK → salons.id)
├── userId: UUID (FK → users.id)
├── role: ENUM('owner', 'manager', 'barber', 'receptionist')
├── isActive: BOOLEAN DEFAULT true
├── hiredAt: TIMESTAMP
├── createdAt: TIMESTAMP
└── updatedAt: TIMESTAMP
```

#### Services Table
Services offered by salons.

```typescript
services
├── id: UUID (PK)
├── salonId: UUID (FK → salons.id)
├── name: VARCHAR(255)
├── description: TEXT
├── duration: INTEGER (minutes)
├── price: DECIMAL(10,2)
├── category: VARCHAR(100)
├── isActive: BOOLEAN DEFAULT true
├── imageUrl: VARCHAR(500)
├── createdAt: TIMESTAMP
└── updatedAt: TIMESTAMP
```

#### Staff_Availability Table
Staff working hours and availability.

```typescript
staff_availability
├── id: UUID (PK)
├── staffId: UUID (FK → users.id)
├── salonId: UUID (FK → salons.id)
├── dayOfWeek: INTEGER (0-6, Sunday-Saturday)
├── startTime: TIME
├── endTime: TIME
├── isAvailable: BOOLEAN DEFAULT true
├── createdAt: TIMESTAMP
└── updatedAt: TIMESTAMP
```

#### Appointments Table
Booking appointments.

```typescript
appointments
├── id: UUID (PK)
├── salonId: UUID (FK → salons.id)
├── clientId: UUID (FK → users.id)
├── staffId: UUID (FK → users.id)
├── serviceId: UUID (FK → services.id)
├── appointmentDate: DATE
├── startTime: TIME
├── endTime: TIME
├── status: ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')
├── notes: TEXT
├── cancellationReason: TEXT
├── reminderSent: BOOLEAN DEFAULT false
├── createdAt: TIMESTAMP
└── updatedAt: TIMESTAMP
```

#### Payments Table
Payment transactions.

```typescript
payments
├── id: UUID (PK)
├── appointmentId: UUID (FK → appointments.id)
├── salonId: UUID (FK → salons.id)
├── clientId: UUID (FK → users.id)
├── amount: DECIMAL(10,2)
├── currency: VARCHAR(3)
├── paymentMethod: ENUM('cash', 'card', 'pix', 'online')
├── status: ENUM('pending', 'completed', 'failed', 'refunded')
├── transactionId: VARCHAR(255)
├── paidAt: TIMESTAMP
├── createdAt: TIMESTAMP
└── updatedAt: TIMESTAMP
```

#### Client_Profiles Table
Extended client information (CRM).

```typescript
client_profiles
├── id: UUID (PK)
├── userId: UUID (FK → users.id)
├── dateOfBirth: DATE
├── address: VARCHAR(500)
├── city: VARCHAR(100)
├── state: VARCHAR(100)
├── zipCode: VARCHAR(20)
├── notes: TEXT (preferences, allergies, etc.)
├── totalVisits: INTEGER DEFAULT 0
├── totalSpent: DECIMAL(10,2) DEFAULT 0
├── lastVisitAt: TIMESTAMP
├── createdAt: TIMESTAMP
└── updatedAt: TIMESTAMP
```

#### Reviews Table
Client reviews and ratings.

```typescript
reviews
├── id: UUID (PK)
├── salonId: UUID (FK → salons.id)
├── clientId: UUID (FK → users.id)
├── appointmentId: UUID (FK → appointments.id)
├── rating: INTEGER (1-5)
├── comment: TEXT
├── staffRating: INTEGER (1-5)
├── createdAt: TIMESTAMP
└── updatedAt: TIMESTAMP
```

## Development Roadmap

### ✅ Phase 1: Foundation (CURRENT)
- [x] Project setup with NestJS + Fastify + Drizzle
- [x] Salon CRUD operations
- [x] Basic validation and error handling
- [x] Database schema for salons

### 📋 Phase 2: Authentication & Users
- [ ] JWT authentication
- [ ] User registration and login
- [ ] Role-based access control (RBAC)
- [ ] Email verification
- [ ] Password reset functionality

### 📋 Phase 3: Staff Management
- [ ] Staff CRUD operations
- [ ] Staff-salon relationship management
- [ ] Staff availability scheduling
- [ ] Staff profile management

### 📋 Phase 4: Services & Appointments
- [ ] Service CRUD operations
- [ ] Service categories
- [ ] Appointment booking system
- [ ] Appointment status management
- [ ] Conflict detection (double booking prevention)
- [ ] Email/SMS notifications

### 📋 Phase 5: Calendar & Dashboard
- [ ] Calendar view (daily/weekly/monthly)
- [ ] Appointment filtering and search
- [ ] Dashboard analytics
- [ ] Real-time updates (WebSocket)

### 📋 Phase 6: CRM Features
- [ ] Client profiles
- [ ] Service history
- [ ] Client notes and preferences
- [ ] Visit tracking
- [ ] Loyalty programs

### 📋 Phase 7: Payments
- [ ] Payment integration (Stripe/MercadoPago)
- [ ] Online prepaid bookings
- [ ] Payment history
- [ ] Invoice generation
- [ ] Refund handling

### 📋 Phase 8: Advanced Features
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Review and rating system
- [ ] Waiting list management
- [ ] Inventory management
- [ ] Reports and analytics
- [ ] Export functionality

## API Design Principles

1. **RESTful conventions:** Standard HTTP methods and status codes
2. **Validation:** Input validation on all endpoints
3. **Error handling:** Consistent error response format
4. **Pagination:** For list endpoints (to be added)
5. **Filtering:** Query parameters for data filtering (to be added)
6. **Versioning:** API versioning strategy (to be added)

## Security Considerations

1. **Authentication:** JWT with refresh tokens
2. **Authorization:** Role-based access control
3. **Rate limiting:** Prevent abuse
4. **CORS:** Properly configured for frontend
5. **SQL injection:** Protected by Drizzle ORM
6. **XSS:** Input sanitization
7. **HTTPS:** Required in production
8. **Environment variables:** Sensitive data protection

## Deployment Strategy

### Development
- Local PostgreSQL
- Bun runtime
- Hot reload enabled

### Staging
- Docker containers
- PostgreSQL (managed service)
- Environment-specific configs

### Production
- Docker/Kubernetes
- PostgreSQL (RDS/managed service)
- Load balancing
- Monitoring and logging
- Automated backups

## Performance Optimization

1. **Database:**
   - Proper indexing on frequently queried columns
   - Connection pooling
   - Query optimization

2. **Caching:**
   - Redis for session management
   - Cache frequently accessed data

3. **API:**
   - Response compression
   - Pagination for large datasets
   - Lazy loading where appropriate

## Testing Strategy

1. **Unit tests:** Service logic
2. **Integration tests:** API endpoints
3. **E2E tests:** Critical user flows
4. **Load testing:** Performance benchmarks

