import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAppointmentStatusDto {
  @IsIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cancellationReason?: string;
}

