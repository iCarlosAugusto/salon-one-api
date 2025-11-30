import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsObject,
  MaxLength,
  MinLength,
  IsUrl,
  IsIn,
} from 'class-validator';

export class CreateSalonDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(50)
  phone: string;

  // Address
  @IsString()
  @MaxLength(500)
  address: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  state: string;

  @IsString()
  @MaxLength(20)
  zipCode: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  country?: string;

  // Business info
  @IsOptional()
  @IsUrl()
  logo?: string;

  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  // Operating hours
  @IsOptional()
  @IsObject()
  operatingHours?: {
    monday?: { open: string; close: string; closed: boolean };
    tuesday?: { open: string; close: string; closed: boolean };
    wednesday?: { open: string; close: string; closed: boolean };
    thursday?: { open: string; close: string; closed: boolean };
    friday?: { open: string; close: string; closed: boolean };
    saturday?: { open: string; close: string; closed: boolean };
    sunday?: { open: string; close: string; closed: boolean };
  };

  // Settings
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  allowOnlineBooking?: boolean;

  @IsOptional()
  @IsBoolean()
  requireBookingApproval?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['free', 'basic', 'premium', 'enterprise'])
  plan?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

