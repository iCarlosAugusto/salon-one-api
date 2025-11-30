import { IsUUID, IsArray } from 'class-validator';

export class AssignServicesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds: string[];
}

