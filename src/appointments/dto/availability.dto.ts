import { IsUUID, IsDateString, IsString, Matches } from 'class-validator';

export class GetAvailableSlotsDto {
  @IsUUID()
  employeeId: string;

  @IsUUID()
  serviceId: string;

  @IsDateString()
  date: string; // YYYY-MM-DD
}

export class CheckAvailabilityDto {
  @IsUUID()
  employeeId: string;

  @IsUUID()
  serviceId: string;

  @IsDateString()
  appointmentDate: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in format HH:MM',
  })
  startTime: string;
}

