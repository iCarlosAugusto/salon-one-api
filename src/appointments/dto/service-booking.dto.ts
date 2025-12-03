import { IsUUID, IsOptional } from 'class-validator';

/**
 * DTO for individual service booking within an appointment
 * Each service can have a specific employee or null for auto-assignment
 */
export class ServiceBookingDto {
  @IsUUID('4')
  serviceId: string;

  @IsOptional()
  @IsUUID('4')
  employeeId?: string | null;
}

