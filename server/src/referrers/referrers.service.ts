import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReferrerDto } from './dto/create-referrer.dto';

@Injectable()
export class ReferrersService {
  constructor(private prisma: PrismaService) {}

  findAll(all?: boolean) {
    return this.prisma.referrer.findMany({
      where: all ? undefined : { is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: number) {
    return this.prisma.referrer.findUnique({
      where: { id },
      include: {
        candidates: {
          select: { id: true, full_name: true },
        },
      },
    });
  }

  create(dto: CreateReferrerDto) {
    return this.prisma.referrer.create({ data: dto });
  }

  update(id: number, dto: Partial<CreateReferrerDto>) {
    return this.prisma.referrer.update({ where: { id }, data: dto });
  }

  deactivate(id: number) {
    return this.prisma.referrer.update({ where: { id }, data: { is_active: false } });
  }
}
