import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';

const vendorId = (id: number) => `VEN-${String(id).padStart(5, '0')}`;

const format = (v: any) => ({
  ...v,
  vendor_id: vendorId(v.id),
  service_charge: Number(v.service_charge),
});

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { page?: number; limit?: number; search?: string; status?: string }) {
    const { page = 1, limit = 20, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' } }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      data: vendors.map(format),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return format(vendor);
  }

  async create(dto: CreateVendorDto) {
    const vendor = await this.prisma.vendor.create({
      data: {
        name: dto.name,
        phone: dto.phone || null,
        email: dto.email || null,
        service_charge: dto.service_charge ?? 0,
        status: dto.status ?? 'active',
      },
    });
    return format(vendor);
  }

  async update(id: number, dto: Partial<CreateVendorDto>) {
    await this.findOne(id);
    const data: any = {};
    if (dto.name !== undefined)           data.name           = dto.name;
    if (dto.phone !== undefined)          data.phone          = dto.phone || null;
    if (dto.email !== undefined)          data.email          = dto.email || null;
    if (dto.service_charge !== undefined) data.service_charge = dto.service_charge;
    if (dto.status !== undefined)         data.status         = dto.status;

    const vendor = await this.prisma.vendor.update({ where: { id }, data });
    return format(vendor);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.vendor.update({ where: { id }, data: { status: 'inactive' } });
    return { message: 'Vendor deactivated' };
  }
}
