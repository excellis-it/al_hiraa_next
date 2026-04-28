import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class MessageTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { type?: string; is_active?: boolean }) {
    const where: any = {};

    // schema field is template_type
    if (params.type) {
      where.template_type = params.type;
    }

    return this.prisma.messageTemplate.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { id },
    });

    if (!template) throw new NotFoundException('Message template not found');
    return template;
  }

  async create(dto: CreateTemplateDto) {
    return this.prisma.messageTemplate.create({
      data: {
        name: dto.name,
        template_type: dto.type,
        body: dto.body,
        // is_active is not in the Prisma schema but accepted via DTO for future use
      },
    });
  }

  async update(id: number, dto: UpdateTemplateDto) {
    await this.findOne(id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.template_type = dto.type;
    if (dto.body !== undefined) data.body = dto.body;

    return this.prisma.messageTemplate.update({
      where: { id },
      data,
    });
  }

  async preview(id: number, sampleData: Record<string, string>): Promise<{ preview: string }> {
    const template = await this.findOne(id);

    let preview = template.body;

    // Replace all {{placeholder}} occurrences with sampleData values
    for (const [key, value] of Object.entries(sampleData)) {
      const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      preview = preview.replace(placeholder, value);
    }

    return { preview };
  }
}
