import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
  MinLength,
  Min,
  Max,
  IsUrl,
  IsIn,
} from 'class-validator';

export class CreateServiceDto {
  @IsUUID()
  salonId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999.99)
  price: number;

  @IsNumber()
  @Min(5)
  @Max(480)
  duration: number; // Duration in minutes

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsIn(['haircut', 'beard', 'combo', 'coloring', 'styling', 'treatment', 'other'])
  category?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

