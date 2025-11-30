# Services & Employees Architecture Design

## Overview

This document describes the database structure and business logic for managing barbershop services and employees, including work schedules, service assignments, and validation rules.

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐
│     Salons      │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────┴────┬──────────────────┐
    │         │                  │
    ▼         ▼                  ▼
┌─────────┐ ┌──────────┐  ┌────────────────┐
│Services │ │Employees │  │Employee        │
│         │ │          │  │Schedules       │
└────┬────┘ └────┬─────┘  └────────────────┘
     │           │
     │           │ N:M
     │           │
     └────┬──────┘
          │
          ▼
    ┌────────────────┐
    │Employee        │
    │Services        │
    │(Junction)      │
    └────────────────┘
```

### Tables

#### 1. Services
Represents services offered by the barbershop.

```typescript
services {
  id: UUID (PK)
  salonId: UUID (FK → salons.id) CASCADE
  name: VARCHAR(255)
  description: TEXT
  price: DECIMAL(10,2)
  duration: INTEGER (minutes)
  category: VARCHAR(100)
  imageUrl: VARCHAR(500)
  isActive: BOOLEAN DEFAULT true
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

**Business Rules:**
- Duration must be between 5 and 480 minutes (8 hours)
- Price must be positive
- Service belongs to one salon
- Can be performed by multiple employees

#### 2. Employees
Represents barbershop staff members.

```typescript
employees {
  id: UUID (PK)
  salonId: UUID (FK → salons.id) CASCADE
  firstName: VARCHAR(100)
  lastName: VARCHAR(100)
  email: VARCHAR(255)
  phone: VARCHAR(50)
  avatar: VARCHAR(500)
  bio: TEXT
  role: VARCHAR(50) DEFAULT 'barber'
  hiredAt: DATE
  isActive: BOOLEAN DEFAULT true
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

**Roles:**
- `barber` - Regular barber
- `senior_barber` - Experienced barber
- `manager` - Shop manager
- `receptionist` - Front desk staff

**Business Rules:**
- Employee belongs to one salon
- Email must be unique within salon
- Can perform multiple services
- Has weekly schedule

#### 3. Employee Services (Junction Table)
Links employees to services they can perform.

```typescript
employee_services {
  id: UUID (PK)
  employeeId: UUID (FK → employees.id) CASCADE
  serviceId: UUID (FK → services.id) CASCADE
  createdAt: TIMESTAMP
  
  UNIQUE(employeeId, serviceId)
}
```

**Business Rules:**
- An employee can perform multiple services
- A service can be performed by multiple employees
- No duplicate assignments

#### 4. Employee Schedules
Defines when employees work.

```typescript
employee_schedules {
  id: UUID (PK)
  employeeId: UUID (FK → employees.id) CASCADE
  salonId: UUID (FK → salons.id) CASCADE
  dayOfWeek: INTEGER (0-6, Sunday-Saturday)
  startTime: TIME
  endTime: TIME
  isAvailable: BOOLEAN DEFAULT true
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
  
  UNIQUE(employeeId, dayOfWeek)
}
```

**Business Rules:**
- One schedule entry per employee per day
- startTime must be before endTime
- Schedule must be within salon operating hours
- Cannot overlap with other employee schedules (optional)

## Validation Logic

### 1. Schedule Within Salon Operating Hours

```typescript
function validateScheduleWithinSalonHours(
  employeeSchedule: EmployeeSchedule,
  salonOperatingHours: SalonOperatingHours
): ValidationResult {
  const dayName = getDayName(employeeSchedule.dayOfWeek); // 'monday', 'tuesday', etc.
  const salonHours = salonOperatingHours[dayName];
  
  // Check if salon is open that day
  if (salonHours.closed) {
    return {
      valid: false,
      error: `Salon is closed on ${dayName}`
    };
  }
  
  // Check if employee start time is not before salon opening
  if (employeeSchedule.startTime < salonHours.open) {
    return {
      valid: false,
      error: `Employee start time (${employeeSchedule.startTime}) is before salon opens (${salonHours.open})`
    };
  }
  
  // Check if employee end time is not after salon closing
  if (employeeSchedule.endTime > salonHours.close) {
    return {
      valid: false,
      error: `Employee end time (${employeeSchedule.endTime}) is after salon closes (${salonHours.close})`
    };
  }
  
  return { valid: true };
}
```

### 2. Schedule Time Validation

```typescript
function validateScheduleTimes(schedule: EmployeeSchedule): ValidationResult {
  // Parse times
  const start = parseTime(schedule.startTime);
  const end = parseTime(schedule.endTime);
  
  // Start must be before end
  if (start >= end) {
    return {
      valid: false,
      error: 'Start time must be before end time'
    };
  }
  
  // Minimum shift duration (e.g., 2 hours)
  const duration = end - start;
  if (duration < 120) { // 2 hours in minutes
    return {
      valid: false,
      error: 'Shift must be at least 2 hours long'
    };
  }
  
  // Maximum shift duration (e.g., 12 hours)
  if (duration > 720) { // 12 hours in minutes
    return {
      valid: false,
      error: 'Shift cannot exceed 12 hours'
    };
  }
  
  return { valid: true };
}
```

### 3. Service Duration Validation

```typescript
function validateServiceDuration(duration: number): ValidationResult {
  if (duration < 5) {
    return {
      valid: false,
      error: 'Service duration must be at least 5 minutes'
    };
  }
  
  if (duration > 480) {
    return {
      valid: false,
      error: 'Service duration cannot exceed 8 hours'
    };
  }
  
  // Duration should be in 5-minute increments
  if (duration % 5 !== 0) {
    return {
      valid: false,
      error: 'Service duration must be in 5-minute increments'
    };
  }
  
  return { valid: true };
}
```

### 4. Employee Service Assignment Validation

```typescript
function validateEmployeeServiceAssignment(
  employee: Employee,
  service: Service
): ValidationResult {
  // Check if both belong to same salon
  if (employee.salonId !== service.salonId) {
    return {
      valid: false,
      error: 'Employee and service must belong to the same salon'
    };
  }
  
  // Check if employee is active
  if (!employee.isActive) {
    return {
      valid: false,
      error: 'Cannot assign services to inactive employee'
    };
  }
  
  // Check if service is active
  if (!service.isActive) {
    return {
      valid: false,
      error: 'Cannot assign inactive service to employee'
    };
  }
  
  return { valid: true };
}
```

### 5. Conflict Detection for Schedules

```typescript
function detectScheduleConflicts(
  newSchedule: EmployeeSchedule,
  existingSchedules: EmployeeSchedule[]
): ConflictResult {
  const conflicts: string[] = [];
  
  for (const existing of existingSchedules) {
    // Check same day
    if (existing.dayOfWeek !== newSchedule.dayOfWeek) {
      continue;
    }
    
    // Skip if same schedule (for updates)
    if (existing.id === newSchedule.id) {
      continue;
    }
    
    // Check time overlap
    const existingStart = parseTime(existing.startTime);
    const existingEnd = parseTime(existing.endTime);
    const newStart = parseTime(newSchedule.startTime);
    const newEnd = parseTime(newSchedule.endTime);
    
    // Overlap detection
    if (
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    ) {
      conflicts.push(
        `Overlaps with existing schedule: ${existing.startTime} - ${existing.endTime}`
      );
    }
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
}
```

## API Design

### Services Endpoints

```
POST   /api/salons/:salonId/services
GET    /api/salons/:salonId/services
GET    /api/salons/:salonId/services/:id
PATCH  /api/salons/:salonId/services/:id
DELETE /api/salons/:salonId/services/:id
GET    /api/salons/:salonId/services/:id/employees (get employees who can perform service)
```

### Employees Endpoints

```
POST   /api/salons/:salonId/employees
GET    /api/salons/:salonId/employees
GET    /api/salons/:salonId/employees/:id
PATCH  /api/salons/:salonId/employees/:id
DELETE /api/salons/:salonId/employees/:id
GET    /api/salons/:salonId/employees/:id/services (get services employee can perform)
POST   /api/salons/:salonId/employees/:id/services (assign services to employee)
DELETE /api/salons/:salonId/employees/:id/services/:serviceId (remove service)
```

### Employee Schedules Endpoints

```
POST   /api/salons/:salonId/employees/:employeeId/schedules
GET    /api/salons/:salonId/employees/:employeeId/schedules
GET    /api/salons/:salonId/employees/:employeeId/schedules/:dayOfWeek
PATCH  /api/salons/:salonId/employees/:employeeId/schedules/:id
DELETE /api/salons/:salonId/employees/:employeeId/schedules/:id
POST   /api/salons/:salonId/employees/:employeeId/schedules/bulk (set entire week)
```

## Business Logic Examples

### Creating Employee Schedule

```typescript
async createEmployeeSchedule(
  salonId: string,
  employeeId: string,
  scheduleDto: CreateScheduleDto
): Promise<EmployeeSchedule> {
  // 1. Validate employee belongs to salon
  const employee = await this.employeesRepository.findById(employeeId);
  if (employee.salonId !== salonId) {
    throw new BadRequestException('Employee does not belong to this salon');
  }
  
  // 2. Get salon operating hours
  const salon = await this.salonsRepository.findById(salonId);
  
  // 3. Validate schedule times
  const timeValidation = this.validateScheduleTimes(scheduleDto);
  if (!timeValidation.valid) {
    throw new BadRequestException(timeValidation.error);
  }
  
  // 4. Validate within salon hours
  const salonHoursValidation = this.validateScheduleWithinSalonHours(
    scheduleDto,
    salon.operatingHours
  );
  if (!salonHoursValidation.valid) {
    throw new BadRequestException(salonHoursValidation.error);
  }
  
  // 5. Check for conflicts (optional - based on business requirements)
  const existingSchedules = await this.schedulesRepository.findByEmployee(employeeId);
  const conflicts = this.detectScheduleConflicts(scheduleDto, existingSchedules);
  if (conflicts.hasConflicts) {
    throw new ConflictException(`Schedule conflicts: ${conflicts.conflicts.join(', ')}`);
  }
  
  // 6. Create schedule
  return await this.schedulesRepository.create({
    ...scheduleDto,
    employeeId,
    salonId,
  });
}
```

### Assigning Service to Employee

```typescript
async assignServiceToEmployee(
  salonId: string,
  employeeId: string,
  serviceId: string
): Promise<void> {
  // 1. Validate employee and service exist
  const employee = await this.employeesRepository.findById(employeeId);
  const service = await this.servicesRepository.findById(serviceId);
  
  if (!employee || !service) {
    throw new NotFoundException('Employee or service not found');
  }
  
  // 2. Validate assignment
  const validation = this.validateEmployeeServiceAssignment(employee, service);
  if (!validation.valid) {
    throw new BadRequestException(validation.error);
  }
  
  // 3. Check if already assigned
  const exists = await this.employeeServicesRepository.exists(employeeId, serviceId);
  if (exists) {
    throw new ConflictException('Service already assigned to employee');
  }
  
  // 4. Create assignment
  await this.employeeServicesRepository.create({
    employeeId,
    serviceId,
  });
}
```

## Helper Functions

### Day of Week Mapping

```typescript
const DAYS_OF_WEEK = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

function getDayName(dayOfWeek: number): string {
  return DAYS_OF_WEEK[dayOfWeek];
}

function getDayNumber(dayName: string): number {
  return Object.entries(DAYS_OF_WEEK)
    .find(([_, name]) => name === dayName)?.[0] as number;
}
```

### Time Parsing

```typescript
function parseTime(timeString: string): number {
  // timeString format: "HH:MM" (24-hour format)
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes; // Convert to minutes since midnight
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function isTimeWithinRange(
  time: string,
  startRange: string,
  endRange: string
): boolean {
  const timeMinutes = parseTime(time);
  const startMinutes = parseTime(startRange);
  const endMinutes = parseTime(endRange);
  
  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}
```

## Module Structure

Each entity will follow the Repository Pattern:

```
src/
├── services/
│   ├── dto/
│   │   ├── create-service.dto.ts
│   │   └── update-service.dto.ts
│   ├── services.controller.ts
│   ├── services.service.ts
│   ├── services.repository.ts
│   └── services.module.ts
│
├── employees/
│   ├── dto/
│   │   ├── create-employee.dto.ts
│   │   ├── update-employee.dto.ts
│   │   ├── create-schedule.dto.ts
│   │   └── assign-service.dto.ts
│   ├── employees.controller.ts
│   ├── employees.service.ts
│   ├── employees.repository.ts
│   ├── employee-schedules.repository.ts
│   ├── employee-services.repository.ts
│   └── employees.module.ts
│
└── common/
    ├── validators/
    │   ├── time.validator.ts
    │   └── schedule.validator.ts
    └── utils/
        ├── time.utils.ts
        └── schedule.utils.ts
```

## Next Steps

1. ✅ Define database schemas
2. ⏳ Create DTOs for validation
3. ⏳ Implement repositories
4. ⏳ Implement services with validation logic
5. ⏳ Create controllers
6. ⏳ Add comprehensive tests
7. ⏳ Generate and run migrations

This design ensures:
- ✅ Clear separation of concerns
- ✅ Comprehensive validation
- ✅ Conflict detection
- ✅ Type safety
- ✅ Scalable architecture

