import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateNotificationDto {
  user_id: string;
  message: string;
  type?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findForUser(
    userId: string,
    params: { page?: number; limit?: number; unread_only?: boolean },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { user_id: userId };
    if (params.unread_only) {
      where.is_read = false;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async markRead(id: number, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    return { updated: result.count };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });

    return { count };
  }

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        user_id: dto.user_id,
        message: dto.message,
        type: dto.type || 'info',
        // related_entity_type and related_entity_id are not in the current schema
        // but kept in the DTO interface for future extensibility
      },
    });
  }
}
