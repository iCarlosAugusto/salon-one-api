import { IsString, IsNotEmpty, IsArray, ArrayMinSize, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class AvailableSlotsQueryDto {
  /**
   * Optional array of employee IDs.
   * - If provided: returns availability only for the specified employees
   * - If not provided: returns availability for ALL employees who can perform the requested services
   */
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (!value) return undefined;
    // Handle comma-separated string or array
    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim());
    }
    return value;
  })
  employeeIds?: string[];

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one service ID is required' })
  @Transform(({ value }) => {
    // Handle comma-separated string or array
    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim());
    }
    return value;
  })
  serviceIds: string[];

  @IsString()
  @IsNotEmpty()
  date: string;
}
