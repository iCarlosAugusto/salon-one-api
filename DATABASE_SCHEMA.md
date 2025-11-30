# Database Schema Visualization

## Complete Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────┐
│                         SALONS                          │
│                                                         │
│  • id (UUID, PK)                                        │
│  • name, slug, email, phone                             │
│  • address, city, state, zipCode, country               │
│  • operatingHours (JSONB)                               │
│  • timezone, currency                                   │
│  • allowOnlineBooking, requireBookingApproval           │
│  • isActive, plan                                       │
│  • createdAt, updatedAt                                 │
└───────┬─────────────────────┬───────────────────────────┘
        │                     │
        │ 1:N                 │ 1:N
        │                     │
        ▼                     ▼
┌──────────────────┐   ┌──────────────────────────────┐
│    SERVICES      │   │        EMPLOYEES             │
│                  │   │                              │
│  • id (PK)       │   │  • id (PK)                   │
│  • salonId (FK)  │   │  • salonId (FK)              │
│  • name          │   │  • firstName, lastName       │
│  • description   │   │  • email, phone              │
│  • price         │   │  • avatar, bio               │
│  • duration (min)│   │  • role                      │
│  • category      │   │  • hiredAt                   │
│  • imageUrl      │   │  • isActive                  │
│  • isActive      │   │  • createdAt, updatedAt      │
│  • createdAt     │   └────────┬─────────────────────┘
│  • updatedAt     │            │
└────────┬─────────┘            │ 1:N
         │                      │
         │                      ▼
         │              ┌───────────────────────────┐
         │              │  EMPLOYEE_SCHEDULES       │
         │              │                           │
         │              │  • id (PK)                │
         │              │  • employeeId (FK)        │
         │              │  • salonId (FK)           │
         │              │  • dayOfWeek (0-6)        │
         │              │  • startTime              │
         │              │  • endTime                │
         │              │  • isAvailable            │
         │              │  • createdAt, updatedAt   │
         │              │  UNIQUE(employeeId, day)  │
         │              └───────────────────────────┘
         │
         │ N:M (via junction table)
         │
         └──────────────┬─────────────────────┐
                        │                     │
                        ▼                     │
           ┌────────────────────────┐         │
           │  EMPLOYEE_SERVICES     │         │
           │  (Junction Table)      │         │
           │                        │         │
           │  • id (PK)             │         │
           │  • employeeId (FK) ────┼─────────┘
           │  • serviceId (FK)      │
           │  • createdAt           │
           │  UNIQUE(emp, service)  │
           └────────────────────────┘
```

## Table Relationships

### 1. Salons → Services (1:N)
- One salon has many services
- CASCADE DELETE: Deleting salon deletes all its services

### 2. Salons → Employees (1:N)
- One salon has many employees
- CASCADE DELETE: Deleting salon deletes all its employees

### 3. Employees → Employee Schedules (1:N)
- One employee has multiple schedules (one per day of week)
- CASCADE DELETE: Deleting employee deletes all their schedules
- UNIQUE CONSTRAINT: One schedule per employee per day

### 4. Services ←→ Employees (N:M)
- Many employees can perform many services
- Relationship managed through `employee_services` junction table
- CASCADE DELETE: Deleting employee or service removes the link

## Data Flow Examples

### Example 1: Creating a Service

```sql
-- 1. Salon must exist
SELECT id FROM salons WHERE id = 'salon-uuid';

-- 2. Create service
INSERT INTO services (id, salon_id, name, price, duration)
VALUES ('service-uuid', 'salon-uuid', 'Haircut', 25.00, 30);

-- 3. Assign to employees (optional)
INSERT INTO employee_services (employee_id, service_id)
VALUES ('employee1-uuid', 'service-uuid'),
       ('employee2-uuid', 'service-uuid');
```

### Example 2: Creating Employee with Schedule

```sql
-- 1. Create employee
INSERT INTO employees (id, salon_id, first_name, last_name, email, phone, hired_at)
VALUES ('employee-uuid', 'salon-uuid', 'John', 'Doe', 'john@example.com', '+1234567890', '2024-01-15');

-- 2. Create weekly schedule
INSERT INTO employee_schedules (employee_id, salon_id, day_of_week, start_time, end_time)
VALUES 
  ('employee-uuid', 'salon-uuid', 1, '09:00', '18:00'), -- Monday
  ('employee-uuid', 'salon-uuid', 2, '09:00', '18:00'), -- Tuesday
  ('employee-uuid', 'salon-uuid', 3, '09:00', '18:00'), -- Wednesday
  ('employee-uuid', 'salon-uuid', 4, '09:00', '18:00'), -- Thursday
  ('employee-uuid', 'salon-uuid', 5, '09:00', '18:00'); -- Friday

-- 3. Assign services
INSERT INTO employee_services (employee_id, service_id)
SELECT 'employee-uuid', id FROM services WHERE salon_id = 'salon-uuid';
```

### Example 3: Querying Employee Availability

```sql
-- Get all employees who can perform a specific service and work on Monday
SELECT DISTINCT
  e.id,
  e.first_name,
  e.last_name,
  es_schedule.start_time,
  es_schedule.end_time
FROM employees e
INNER JOIN employee_services es ON e.id = es.employee_id
INNER JOIN employee_schedules es_schedule ON e.id = es_schedule.employee_id
WHERE es.service_id = 'service-uuid'
  AND es_schedule.day_of_week = 1  -- Monday
  AND es_schedule.is_available = true
  AND e.is_active = true;
```

## Validation Rules Summary

### Service Validation
✅ Duration: 5-480 minutes (8 hours max)  
✅ Duration: Must be in 5-minute increments  
✅ Price: Must be positive  
✅ Must belong to existing salon  

### Employee Validation
✅ Email: Must be valid format  
✅ Must belong to existing salon  
✅ Role: Must be valid role type  
✅ HiredAt: Cannot be in future  

### Schedule Validation
✅ Start time < End time  
✅ Minimum shift: 2 hours  
✅ Maximum shift: 12 hours  
✅ Must be within salon operating hours  
✅ One schedule per employee per day  
✅ No time conflicts (optional)  

### Service Assignment Validation
✅ Employee and service must belong to same salon  
✅ Employee must be active  
✅ Service must be active  
✅ No duplicate assignments  

## Query Patterns

### 1. Get Services with Employee Count
```sql
SELECT 
  s.*,
  COUNT(es.employee_id) as employee_count
FROM services s
LEFT JOIN employee_services es ON s.id = es.service_id
WHERE s.salon_id = 'salon-uuid'
GROUP BY s.id;
```

### 2. Get Employees with Their Services
```sql
SELECT 
  e.*,
  json_agg(
    json_build_object(
      'id', s.id,
      'name', s.name,
      'price', s.price,
      'duration', s.duration
    )
  ) as services
FROM employees e
LEFT JOIN employee_services es ON e.id = es.employee_id
LEFT JOIN services s ON es.service_id = s.id
WHERE e.salon_id = 'salon-uuid'
GROUP BY e.id;
```

### 3. Get Employee Schedule for Week
```sql
SELECT 
  day_of_week,
  start_time,
  end_time,
  is_available
FROM employee_schedules
WHERE employee_id = 'employee-uuid'
ORDER BY day_of_week;
```

### 4. Find Available Time Slots
```sql
-- Complex query to find available slots considering:
-- - Employee schedules
-- - Existing appointments
-- - Service duration
-- This will be implemented in the service layer
```

## Indexes for Performance

```sql
-- Services
CREATE INDEX idx_services_salon_id ON services(salon_id);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(is_active);

-- Employees
CREATE INDEX idx_employees_salon_id ON employees(salon_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_active ON employees(is_active);

-- Employee Services
CREATE INDEX idx_employee_services_employee ON employee_services(employee_id);
CREATE INDEX idx_employee_services_service ON employee_services(service_id);

-- Employee Schedules
CREATE INDEX idx_employee_schedules_employee ON employee_schedules(employee_id);
CREATE INDEX idx_employee_schedules_salon ON employee_schedules(salon_id);
CREATE INDEX idx_employee_schedules_day ON employee_schedules(day_of_week);
```

## Migration Strategy

### Step 1: Create Tables
```bash
bun run db:push
```

### Step 2: Seed Initial Data
```typescript
// Create sample services
await db.insert(services).values([
  {
    salonId: 'salon-1',
    name: 'Classic Haircut',
    description: 'Traditional men\'s haircut',
    price: '25.00',
    duration: 30,
    category: 'haircut',
  },
  {
    salonId: 'salon-1',
    name: 'Beard Trim',
    description: 'Professional beard shaping and trim',
    price: '15.00',
    duration: 15,
    category: 'beard',
  },
  {
    salonId: 'salon-1',
    name: 'Haircut + Beard Combo',
    description: 'Complete grooming package',
    price: '35.00',
    duration: 45,
    category: 'combo',
  },
]);
```

## Future Enhancements

### 1. Break Time Management
```typescript
employee_breaks {
  id: UUID
  employeeId: UUID
  dayOfWeek: INTEGER
  startTime: TIME
  endTime: TIME
}
```

### 2. Service Variants/Add-ons
```typescript
service_variants {
  id: UUID
  serviceId: UUID
  name: VARCHAR
  priceModifier: DECIMAL
  durationModifier: INTEGER
}
```

### 3. Employee Commission Rates
```typescript
employee_service_rates {
  employeeId: UUID
  serviceId: UUID
  commissionRate: DECIMAL
}
```

### 4. Service Categories Table
```typescript
service_categories {
  id: UUID
  salonId: UUID
  name: VARCHAR
  description: TEXT
  displayOrder: INTEGER
}
```

