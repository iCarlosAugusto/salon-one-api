import {
  IsString,
  IsUUID,
  IsDateString,
  IsEmail,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  salonId: string;

  @IsUUID()
  employeeId: string;

  @IsUUID()
  serviceId: string;

  @IsDateString()
  appointmentDate: string; // YYYY-MM-DD

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in format HH:MM',
  })
  startTime: string;

  // Client information
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  clientName: string;

  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(50)
  clientPhone: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

