# Time Slot Generation & Appointment Booking System

## Overview

Design for dynamic time slot generation based on employee schedules, with automatic slot availability calculation considering existing appointments.

## Core Concept: Dynamic Slot Generation

**DON'T store slots in database** ❌
**DO generate slots dynamically** ✅

### Why Dynamic Generation?

1. **Scalability:** Avoid millions of slot records
2. **Flexibility:** Easily change slot intervals
3. **Accuracy:** Always reflects current schedule changes
4. **Efficiency:** Only compute what's needed, when needed

## Data Structure Design

### 1. Appointments Table (NEW)

```typescript
appointments {
  id: UUID (PK)
  salonId: UUID (FK → salons.id) CASCADE
  employeeId: UUID (FK → employees.id) CASCADE
  clientId: UUID (FK → clients.id) CASCADE  // Future: when we add clients
  serviceId: UUID (FK → services.id) CASCADE
  
  // Appointment date and time
  appointmentDate: DATE
  startTime: TIME
  endTime: TIME
  
  // Duration (cached from service, allows custom durations)
  duration: INTEGER (minutes)
  
  // Status
  status: ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')
  
  // Client information (temporary, until clients table exists)
  clientName: VARCHAR(255)
  clientEmail: VARCHAR(255)
  clientPhone: VARCHAR(50)
  
  // Pricing (cached from service, allows custom pricing)
  price: DECIMAL(10,2)
  
  // Notes
  notes: TEXT
  cancellationReason: TEXT
  
  // Reminders
  reminderSent: BOOLEAN DEFAULT false
  
  // Timestamps
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

### 2. Salon Configuration (ADD to existing salon table)

```typescript
// Add to salons table:
defaultSlotInterval: INTEGER DEFAULT 10 (minutes)
allowDoubleBooking: BOOLEAN DEFAULT false
maxAdvanceBookingDays: INTEGER DEFAULT 90
minAdvanceBookingHours: INTEGER DEFAULT 2
```

## Slot Generation Algorithm

### Step 1: Get Employee Schedule

```typescript
function getEmployeeScheduleForDate(
  employeeId: string,
  date: Date
): EmployeeSchedule | null {
  const dayOfWeek = date.getDay(); // 0-6
  
  // Get schedule from employee_schedules table
  const schedule = await db
    .select()
    .from(employeeSchedules)
    .where(and(
      eq(employeeSchedules.employeeId, employeeId),
      eq(employeeSchedules.dayOfWeek, dayOfWeek),
      eq(employeeSchedules.isAvailable, true)
    ));
  
  return schedule[0] || null;
}
```

### Step 2: Generate All Possible Slots

```typescript
function generateTimeSlots(
  startTime: string,    // "08:00"
  endTime: string,      // "18:00"
  interval: number      // 10 minutes
): string[] {
  const slots: string[] = [];
  let currentMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);
  
  while (currentMinutes < endMinutes) {
    slots.push(formatTime(currentMinutes));
    currentMinutes += interval;
  }
  
  return slots;
}

// Example output:
// ["08:00", "08:10", "08:20", ..., "17:40", "17:50"]
// Note: 18:00 is not included as it's the end time
```

### Step 3: Get Existing Appointments

```typescript
function getAppointmentsForDate(
  employeeId: string,
  date: Date
): Appointment[] {
  return await db
    .select()
    .from(appointments)
    .where(and(
      eq(appointments.employeeId, employeeId),
      eq(appointments.appointmentDate, date),
      inArray(appointments.status, ['pending', 'confirmed', 'in_progress'])
    ))
    .orderBy(appointments.startTime);
}
```

### Step 4: Calculate Occupied Slots

```typescript
function getOccupiedSlots(
  appointments: Appointment[],
  interval: number
): Set<string> {
  const occupied = new Set<string>();
  
  for (const appointment of appointments) {
    const startMinutes = parseTime(appointment.startTime);
    const endMinutes = parseTime(appointment.endTime);
    
    // Mark all slots from start to end as occupied
    let current = startMinutes;
    while (current < endMinutes) {
      occupied.add(formatTime(current));
      current += interval;
    }
  }
  
  return occupied;
}
```

### Step 5: Filter Available Slots

```typescript
function getAvailableSlots(
  allSlots: string[],
  occupiedSlots: Set<string>,
  serviceDuration: number,
  interval: number
): string[] {
  const available: string[] = [];
  
  for (let i = 0; i < allSlots.length; i++) {
    const slot = allSlots[i];
    
    // Skip if this slot is occupied
    if (occupiedSlots.has(slot)) {
      continue;
    }
    
    // Check if there's enough consecutive free slots for the service
    const requiredSlots = Math.ceil(serviceDuration / interval);
    let hasEnoughSpace = true;
    
    for (let j = 0; j < requiredSlots; j++) {
      const nextSlotIndex = i + j;
      if (nextSlotIndex >= allSlots.length) {
        hasEnoughSpace = false;
        break;
      }
      
      const nextSlot = allSlots[nextSlotIndex];
      if (occupiedSlots.has(nextSlot)) {
        hasEnoughSpace = false;
        break;
      }
    }
    
    if (hasEnoughSpace) {
      available.push(slot);
    }
  }
  
  return available;
}
```

### Complete Algorithm

```typescript
async function getAvailableTimeSlotsForService(
  employeeId: string,
  serviceId: string,
  date: Date,
  salonId: string
): Promise<string[]> {
  // 1. Get salon configuration
  const salon = await salonsRepository.findById(salonId);
  const interval = salon.defaultSlotInterval || 10;
  
  // 2. Get employee schedule for this day
  const schedule = await getEmployeeScheduleForDate(employeeId, date);
  if (!schedule) {
    return []; // Employee doesn't work this day
  }
  
  // 3. Get service duration
  const service = await servicesRepository.findById(serviceId);
  if (!service) {
    throw new NotFoundException('Service not found');
  }
  
  // 4. Generate all possible time slots
  const allSlots = generateTimeSlots(
    schedule.startTime,
    schedule.endTime,
    interval
  );
  
  // 5. Get existing appointments for this employee on this date
  const appointments = await getAppointmentsForDate(employeeId, date);
  
  // 6. Calculate occupied slots
  const occupiedSlots = getOccupiedSlots(appointments, interval);
  
  // 7. Filter available slots (considering service duration)
  const availableSlots = getAvailableSlots(
    allSlots,
    occupiedSlots,
    service.duration,
    interval
  );
  
  return availableSlots;
}
```

## Booking Flow

### Create Appointment

```typescript
async function createAppointment(dto: CreateAppointmentDto): Promise<Appointment> {
  // 1. Validate employee works on this date
  const schedule = await getEmployeeScheduleForDate(
    dto.employeeId,
    new Date(dto.appointmentDate)
  );
  
  if (!schedule) {
    throw new BadRequestException('Employee does not work on this date');
  }
  
  // 2. Validate time is within employee schedule
  const startMinutes = parseTime(dto.startTime);
  const scheduleStart = parseTime(schedule.startTime);
  const scheduleEnd = parseTime(schedule.endTime);
  
  if (startMinutes < scheduleStart || startMinutes >= scheduleEnd) {
    throw new BadRequestException('Time is outside employee working hours');
  }
  
  // 3. Get service to determine duration
  const service = await servicesRepository.findById(dto.serviceId);
  const endTime = calculateEndTime(dto.startTime, service.duration);
  
  // 4. Check for conflicts with existing appointments
  const conflicts = await checkAppointmentConflicts(
    dto.employeeId,
    dto.appointmentDate,
    dto.startTime,
    endTime
  );
  
  if (conflicts.length > 0) {
    throw new ConflictException('Time slot is already booked');
  }
  
  // 5. Validate end time doesn't exceed employee schedule
  const endMinutes = parseTime(endTime);
  if (endMinutes > scheduleEnd) {
    throw new BadRequestException(
      'Service duration extends beyond employee working hours'
    );
  }
  
  // 6. Create appointment
  return await appointmentsRepository.create({
    ...dto,
    endTime,
    duration: service.duration,
    price: service.price,
    status: 'pending',
  });
}
```

### Check Conflicts

```typescript
async function checkAppointmentConflicts(
  employeeId: string,
  appointmentDate: Date,
  startTime: string,
  endTime: string
): Promise<Appointment[]> {
  // Get all active appointments for this employee on this date
  const appointments = await db
    .select()
    .from(appointments)
    .where(and(
      eq(appointments.employeeId, employeeId),
      eq(appointments.appointmentDate, appointmentDate),
      inArray(appointments.status, ['pending', 'confirmed', 'in_progress'])
    ));
  
  // Check for time overlaps
  const conflicts = appointments.filter(apt => {
    return doTimeRangesOverlap(
      { start: startTime, end: endTime },
      { start: apt.startTime, end: apt.endTime }
    );
  });
  
  return conflicts;
}
```

## API Endpoints

```typescript
// Get available time slots
GET /appointments/available-slots?employeeId=xxx&serviceId=xxx&date=2024-01-15
Response: ["08:00", "08:10", "08:20", ...]

// Get available employees for a service on a date
GET /appointments/available-employees?serviceId=xxx&date=2024-01-15&time=10:00
Response: [{ employeeId, firstName, lastName, availableSlots: [...] }]

// Create appointment
POST /appointments
{
  "salonId": "uuid",
  "employeeId": "uuid",
  "serviceId": "uuid",
  "appointmentDate": "2024-01-15",
  "startTime": "10:00",
  "clientName": "John Doe",
  "clientEmail": "john@example.com",
  "clientPhone": "+1234567890"
}

// Get appointments for employee on date
GET /appointments?employeeId=xxx&date=2024-01-15

// Get appointments for salon on date
GET /appointments?salonId=xxx&date=2024-01-15

// Update appointment status
PATCH /appointments/:id/status
{ "status": "confirmed" }

// Cancel appointment
PATCH /appointments/:id/cancel
{ "cancellationReason": "Client request" }
```

## Optimization Strategies

### 1. Caching

```typescript
// Cache available slots for popular queries
const cacheKey = `slots:${employeeId}:${serviceId}:${date}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const slots = await getAvailableTimeSlotsForService(...);
await redis.setex(cacheKey, 300, JSON.stringify(slots)); // Cache for 5 min
return slots;

// Invalidate cache when:
// - New appointment created
// - Appointment cancelled
// - Employee schedule changed
```

### 2. Database Indexes

```sql
-- Appointments table indexes
CREATE INDEX idx_appointments_employee_date ON appointments(employee_id, appointment_date);
CREATE INDEX idx_appointments_salon_date ON appointments(salon_id, appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);

-- Composite index for common queries
CREATE INDEX idx_appointments_lookup ON appointments(
  employee_id, 
  appointment_date, 
  status
) WHERE status IN ('pending', 'confirmed', 'in_progress');
```

### 3. Batch Queries

```typescript
// Get availability for multiple days at once
async function getAvailabilitySummary(
  employeeId: string,
  serviceId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, number>> {
  const availability = new Map<string, number>();
  
  // Get all schedules for date range
  // Get all appointments for date range
  // Calculate for all dates in one go
  
  return availability; // { "2024-01-15": 24, "2024-01-16": 18, ... }
}
```

## Edge Cases & Validations

### 1. Booking Window Validation

```typescript
// Min advance booking (e.g., 2 hours ahead)
const now = new Date();
const appointmentTime = new Date(`${dto.appointmentDate} ${dto.startTime}`);
const hoursDiff = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

if (hoursDiff < salon.minAdvanceBookingHours) {
  throw new BadRequestException(
    `Appointments must be booked at least ${salon.minAdvanceBookingHours} hours in advance`
  );
}

// Max advance booking (e.g., 90 days)
const daysDiff = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

if (daysDiff > salon.maxAdvanceBookingDays) {
  throw new BadRequestException(
    `Appointments can only be booked up to ${salon.maxAdvanceBookingDays} days in advance`
  );
}
```

### 2. Service Duration vs Remaining Time

```typescript
// Ensure service can fit before end of shift
const startMinutes = parseTime(dto.startTime);
const endMinutes = startMinutes + service.duration;
const scheduleEnd = parseTime(schedule.endTime);

if (endMinutes > scheduleEnd) {
  throw new BadRequestException(
    `Service duration (${service.duration} min) extends beyond employee schedule`
  );
}
```

### 3. Lunch Breaks (Future Enhancement)

```typescript
// Add breaks to employee_schedules table
breaks: JSONB // [{ start: "12:00", end: "13:00" }]

// When generating slots, exclude break times
function isInBreak(time: string, breaks: Break[]): boolean {
  const timeMinutes = parseTime(time);
  
  return breaks.some(breakPeriod => {
    const breakStart = parseTime(breakPeriod.start);
    const breakEnd = parseTime(breakPeriod.end);
    return timeMinutes >= breakStart && timeMinutes < breakEnd;
  });
}
```

## Multi-Tenant Considerations

### Data Isolation

```typescript
// Always filter by salonId
const appointments = await db
  .select()
  .from(appointments)
  .where(and(
    eq(appointments.salonId, salonId),  // ← Tenant isolation
    eq(appointments.employeeId, employeeId),
    eq(appointments.appointmentDate, date)
  ));
```

### Per-Salon Configuration

```typescript
// Each salon can have different settings
salon1: { slotInterval: 10, maxAdvanceBookingDays: 90 }
salon2: { slotInterval: 15, maxAdvanceBookingDays: 60 }
salon3: { slotInterval: 30, maxAdvanceBookingDays: 30 }
```

## Performance Metrics

### Expected Performance

```
Generate slots for 1 day: < 1ms
Get availability with 10 appointments: < 10ms
Create appointment with validation: < 50ms
Get monthly availability summary: < 100ms
```

### Scalability

```
1 salon, 5 employees, 50 appointments/day: Excellent
100 salons, 500 employees, 5000 appointments/day: Good (with caching)
1000 salons, 5000 employees, 50000 appointments/day: Requires optimization
```

## Summary

### Key Design Decisions

1. ✅ **Dynamic slot generation** (not stored in DB)
2. ✅ **Appointment-based availability** (compute from appointments)
3. ✅ **Service duration awareness** (require consecutive free slots)
4. ✅ **Employee schedule enforcement** (always within working hours)
5. ✅ **Conflict detection** (prevent double-booking)
6. ✅ **Multi-tenant isolation** (salon-based filtering)

### Benefits

- **Flexible:** Easy to change slot intervals per salon
- **Accurate:** Always reflects current state
- **Scalable:** No explosion of slot records
- **Performant:** Optimized with indexes and caching
- **Maintainable:** Clean separation of concerns

### Next Steps

1. Create appointments table schema
2. Implement slot generation utility functions
3. Create appointments repository
4. Create appointments service with validation
5. Create appointments controller
6. Add caching layer (optional)
7. Add real-time availability updates (WebSocket - future)

