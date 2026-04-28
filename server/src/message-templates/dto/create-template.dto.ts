import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export enum TemplateType {
  whatsapp = 'whatsapp',
  email = 'email',
  sms = 'sms',
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TemplateType)
  type: TemplateType;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;
}
