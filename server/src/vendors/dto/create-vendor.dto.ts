import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber, IsIn, Min } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  service_charge?: number;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
