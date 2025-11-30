import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';
import { Transform } from 'class-transformer';

export class AvailableSlotsQueryDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one service ID is required' })
  @Transform(({ value }) => {
    // Handle comma-separated string or array
    if (typeof value === 'string') {
      return value.split(',').map(id => id.trim());
    }
    return value;
  })
  serviceIds: string[];

  @IsString()
  @IsNotEmpty()
  date: string;
}

