import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const { page = 1, limit = 20, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { contact_person: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: {
          _count: {
            select: { jobs: true },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data: companies,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            status: true,
            positions_required: true,
            positions_filled: true,
            priority: true,
          },
          orderBy: { created_at: 'desc' },
        },
        _count: {
          select: { jobs: true },
        },
      },
    });

    if (!company) throw new NotFoundException('Company not found');

    return company;
  }

  async create(dto: CreateCompanyDto) {
    const data: any = { name: dto.name };
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.industry !== undefined) data.industry = dto.industry;
    if (dto.contact_person !== undefined) data.contact_person = dto.contact_person;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.agreement_details !== undefined) data.agreement_details = dto.agreement_details;
    if (dto.status !== undefined) data.status = dto.status;
    return this.prisma.company.create({ data });
  }

  async update(id: number, dto: UpdateCompanyDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.industry !== undefined) data.industry = dto.industry;
    if (dto.contact_person !== undefined) data.contact_person = dto.contact_person;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.agreement_details !== undefined) data.agreement_details = dto.agreement_details;
    if (dto.status !== undefined) data.status = dto.status;
    return this.prisma.company.update({ where: { id }, data });
  }
}
