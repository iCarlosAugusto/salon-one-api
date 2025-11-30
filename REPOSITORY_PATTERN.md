# Repository Pattern Implementation

## Overview

We've implemented the **Repository Pattern** to separate data access logic from business logic. This provides better separation of concerns and makes the codebase more maintainable and testable.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                      Controller                         │
│              (HTTP Request/Response)                    │
│                                                         │
│  • Handles HTTP requests                                │
│  • Validates input (via DTOs)                           │
│  • Returns responses                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Calls methods
                     │
┌────────────────────▼────────────────────────────────────┐
│                      Service                            │
│                (Business Logic)                         │
│                                                         │
│  • Orchestrates business operations                     │
│  • Handles business rules and validation                │
│  • Manages transactions                                 │
│  • Throws domain exceptions (NotFoundException, etc.)   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Uses repository
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Repository                            │
│                (Data Access Layer)                      │
│                                                         │
│  • Abstracts database operations                        │
│  • Contains all SQL/ORM queries                         │
│  • No business logic                                    │
│  • Returns entities or undefined/null                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Uses ORM
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Drizzle ORM                            │
│              (Database Abstraction)                     │
│                                                         │
│  • Type-safe query builder                              │
│  • Generates SQL                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Executes SQL
                     │
┌────────────────────▼────────────────────────────────────┐
│                  PostgreSQL                             │
│                  (Database)                             │
└─────────────────────────────────────────────────────────┘
```

## Responsibilities

### Controller Layer
- **What:** HTTP request/response handling
- **Does:** 
  - Receives HTTP requests
  - Validates DTOs
  - Calls service methods
  - Returns HTTP responses
- **Does NOT:**
  - Contain business logic
  - Access database directly
  - Handle exceptions (except HTTP-specific)

### Service Layer
- **What:** Business logic orchestration
- **Does:**
  - Implements business rules
  - Validates business constraints
  - Orchestrates multiple repository calls
  - Throws domain exceptions
  - Transforms DTOs to entities
- **Does NOT:**
  - Know about HTTP
  - Write SQL queries
  - Access database directly

### Repository Layer
- **What:** Data access abstraction
- **Does:**
  - Encapsulates database queries
  - Provides CRUD operations
  - Handles ORM interactions
  - Returns entities or undefined
- **Does NOT:**
  - Contain business logic
  - Throw domain exceptions (only DB errors)
  - Know about DTOs or HTTP

## File Structure

```
src/salons/
├── dto/
│   ├── create-salon.dto.ts      # Input validation
│   └── update-salon.dto.ts      # Input validation
├── salons.controller.ts         # HTTP layer
├── salons.service.ts            # Business logic
├── salons.repository.ts         # Data access
└── salons.module.ts             # DI configuration
```

## Example Flow: Create Salon

### 1. Controller (`salons.controller.ts`)
```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
create(@Body() createSalonDto: CreateSalonDto) {
  return this.salonsService.create(createSalonDto);
}
```

### 2. Service (`salons.service.ts`)
```typescript
async create(createSalonDto: CreateSalonDto): Promise<Salon> {
  // Business logic: set defaults, validate
  const newSalon: NewSalon = {
    ...createSalonDto,
    country: createSalonDto.country || 'Brazil',
    timezone: createSalonDto.timezone || 'America/Sao_Paulo',
    // ... more defaults
  };

  // Delegate to repository
  return await this.salonsRepository.create(newSalon);
}
```

### 3. Repository (`salons.repository.ts`)
```typescript
async create(data: NewSalon): Promise<Salon> {
  // Pure data access - no business logic
  const [salon] = await this.db
    .insert(salons)
    .values(data)
    .returning();
  return salon;
}
```

## Benefits

### 1. **Separation of Concerns**
- Each layer has a single responsibility
- Easy to understand and maintain
- Clear boundaries between layers

### 2. **Testability**
```typescript
// Easy to mock repository in service tests
const mockRepository = {
  create: jest.fn().mockResolvedValue(mockSalon),
  findAll: jest.fn().mockResolvedValue([mockSalon]),
};

const service = new SalonsService(mockRepository);
```

### 3. **Maintainability**
- Change database queries without touching business logic
- Change business rules without touching data access
- Swap ORMs easily (Drizzle → Prisma → TypeORM)

### 4. **Reusability**
- Repository methods can be reused across services
- Common queries in one place
- Avoid duplicated code

### 5. **Type Safety**
- Repository enforces correct data types
- Service works with domain entities
- Compile-time checking

## Repository Methods

### Standard CRUD Operations

| Method | Purpose | Returns |
|--------|---------|---------|
| `create(data)` | Create new record | `Promise<Salon>` |
| `findAll()` | Get all records | `Promise<Salon[]>` |
| `findById(id)` | Get by ID | `Promise<Salon \| undefined>` |
| `update(id, data)` | Update record | `Promise<Salon>` |
| `delete(id)` | Delete record | `Promise<void>` |

### Additional Query Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `findBySlug(slug)` | Get by slug | `Promise<Salon \| undefined>` |
| `exists(id)` | Check existence | `Promise<boolean>` |
| `existsBySlug(slug)` | Check slug exists | `Promise<boolean>` |

## Key Design Decisions

### 1. Repository Returns `undefined` for Not Found
```typescript
// Repository
async findById(id: string): Promise<Salon | undefined> {
  // Returns undefined if not found
  return salon;
}

// Service decides how to handle
async findOne(id: string): Promise<Salon> {
  const salon = await this.salonsRepository.findById(id);
  if (!salon) {
    throw new NotFoundException(`Salon with ID ${id} not found`);
  }
  return salon;
}
```

**Why?** 
- Repository shouldn't throw business exceptions
- Service controls error handling
- Repository is about data access only

### 2. Service Handles Business Defaults
```typescript
// Service sets business defaults
const newSalon: NewSalon = {
  ...createSalonDto,
  country: createSalonDto.country || 'Brazil',
  timezone: createSalonDto.timezone || 'America/Sao_Paulo',
  currency: createSalonDto.currency || 'BRL',
};
```

**Why?**
- Business rules belong in service
- Repository is dumb - just saves data
- Easy to change defaults without touching repository

### 3. Repository Auto-Updates `updatedAt`
```typescript
async update(id: string, data: Partial<NewSalon>): Promise<Salon> {
  const [updatedSalon] = await this.db
    .update(salons)
    .set({
      ...data,
      updatedAt: new Date(), // Always set
    })
    // ...
}
```

**Why?**
- Technical requirement, not business logic
- Consistent across all updates
- Repository owns data integrity

## Testing Strategy

### Repository Tests (Integration)
```typescript
describe('SalonsRepository', () => {
  // Use real database connection
  // Test actual SQL queries
  it('should create a salon', async () => {
    const salon = await repository.create(salonData);
    expect(salon.id).toBeDefined();
  });
});
```

### Service Tests (Unit)
```typescript
describe('SalonsService', () => {
  // Mock repository
  const mockRepo = createMock<SalonsRepository>();
  
  it('should apply defaults when creating salon', async () => {
    await service.create(dto);
    expect(mockRepo.create).toHaveBeenCalledWith({
      ...dto,
      country: 'Brazil', // Default applied
    });
  });
});
```

### Controller Tests (E2E)
```typescript
describe('SalonsController (e2e)', () => {
  // Full integration test
  it('POST /salons', () => {
    return request(app.getHttpServer())
      .post('/salons')
      .send(createSalonDto)
      .expect(201);
  });
});
```

## When to Add New Repository Methods

Add a new repository method when you need to:

1. **Custom queries**
   ```typescript
   async findByCityAndState(city: string, state: string) {
     return await this.db
       .select()
       .from(salons)
       .where(and(eq(salons.city, city), eq(salons.state, state)));
   }
   ```

2. **Filtering**
   ```typescript
   async findActiveSalons() {
     return await this.db
       .select()
       .from(salons)
       .where(eq(salons.isActive, true));
   }
   ```

3. **Complex queries**
   ```typescript
   async findSalonsWithServices() {
     return await this.db
       .select()
       .from(salons)
       .leftJoin(services, eq(salons.id, services.salonId));
   }
   ```

## Future Enhancements

### Generic Repository Base Class
```typescript
abstract class BaseRepository<T, TInsert> {
  abstract create(data: TInsert): Promise<T>;
  abstract findAll(): Promise<T[]>;
  abstract findById(id: string): Promise<T | undefined>;
  abstract update(id: string, data: Partial<TInsert>): Promise<T>;
  abstract delete(id: string): Promise<void>;
}

class SalonsRepository extends BaseRepository<Salon, NewSalon> {
  // Specific methods
  async findBySlug(slug: string): Promise<Salon | undefined> {
    // ...
  }
}
```

### Pagination Support
```typescript
interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

async findAllPaginated(options: PaginationOptions): Promise<PaginatedResult<Salon>> {
  // Implement pagination
}
```

### Filtering Support
```typescript
interface SalonFilters {
  city?: string;
  state?: string;
  isActive?: boolean;
  plan?: string;
}

async findWithFilters(filters: SalonFilters): Promise<Salon[]> {
  // Dynamic where clauses
}
```

## Comparison: Before vs After

### Before (Service with Direct DB Access)
```typescript
export class SalonsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<{ salons: typeof salons }>,
  ) {}

  async create(dto: CreateSalonDto): Promise<Salon> {
    const [salon] = await this.db.insert(salons).values(dto).returning();
    return salon;
  }
}
```

**Issues:**
- Service knows about ORM
- Hard to test (need database)
- Mixed concerns
- Duplicate queries across services

### After (Service with Repository)
```typescript
export class SalonsService {
  constructor(private readonly salonsRepository: SalonsRepository) {}

  async create(dto: CreateSalonDto): Promise<Salon> {
    const newSalon = { ...dto, /* defaults */ };
    return await this.salonsRepository.create(newSalon);
  }
}
```

**Benefits:**
- Clean separation
- Easy to test (mock repository)
- Business logic clear
- Repository reusable

## Summary

The Repository Pattern provides:

✅ **Clean Architecture** - Clear layer separation  
✅ **Testability** - Easy to mock and test  
✅ **Maintainability** - Changes isolated to layers  
✅ **Reusability** - Queries in one place  
✅ **Type Safety** - Compile-time checking  
✅ **Flexibility** - Easy to swap implementations  

This pattern will scale well as we add more entities (Users, Services, Appointments, etc.) in future phases.

