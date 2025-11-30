import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
  MinLength,
  IsUrl,
  IsIn,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateScheduleDto } from './create-schedule.dto';

export class CreateEmployeeDto {
  @IsUUID()
  salonId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(50)
  phone: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @IsIn(['barber', 'senior_barber', 'manager', 'receptionist'])
  role?: string;

  @IsDateString()
  hiredAt: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Work schedule - REQUIRED when creating employee
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one work schedule is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateScheduleDto)
  workSchedule: CreateScheduleDto[];
}
