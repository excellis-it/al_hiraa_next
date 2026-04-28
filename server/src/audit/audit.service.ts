import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    entity_type?: string;
    user_id?: string;
    action?: string;
  }) {
    const { page = 1, limit = 50, entity_type, user_id, action } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (entity_type) where.entity_type = entity_type;
    if (user_id) where.user_id = user_id;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: { user: { select: { full_name: true, email: true } } },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
}
