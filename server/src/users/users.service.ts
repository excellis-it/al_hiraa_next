import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../generated/prisma';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private readonly selectFields = {
    id: true,
    full_name: true,
    email: true,
    phone: true,
    role: true,
    is_active: true,
    created_at: true,
    updated_at: true,
  };

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        select: this.selectFields,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.selectFields,
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, data: { full_name?: string; phone?: string; role?: any; is_active?: boolean }) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data,
      select: this.selectFields,
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { is_active: false },
      select: this.selectFields,
    });
  }

  async create(dto: {
    full_name: string;
    email: string;
    phone: string;
    role: UserRole;
    password?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('A user with this email already exists');

    const rawPassword = dto.password || 'Password@123';
    const password_hash = await bcrypt.hash(rawPassword, 10);

    return this.prisma.user.create({
      data: {
        full_name: dto.full_name,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        password_hash,
      },
      select: this.selectFields,
    });
  }
}
