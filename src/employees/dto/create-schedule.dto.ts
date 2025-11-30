import {
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateScheduleDto {
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in format HH:MM',
  })
  startTime: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in format HH:MM',
  })
  endTime: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

