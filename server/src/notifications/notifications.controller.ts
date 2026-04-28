import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  // NOTE: /unread-count is declared BEFORE /:id to avoid route collision
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Get()
  findForUser(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('unread_only') unreadOnly?: string,
  ) {
    return this.notificationsService.findForUser(user.id, {
      page: +page,
      limit: +limit,
      unread_only: unreadOnly === 'true',
    });
  }

  @Put('mark-all-read')
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Put(':id/read')
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markRead(id, user.id);
  }
}
