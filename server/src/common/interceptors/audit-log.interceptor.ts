import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only log mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user;
    const path = request.route?.path || request.url;
    const ip = request.ip || request.headers['x-forwarded-for'];

    // Determine entity type from path
    const pathParts = path.split('/').filter(Boolean);
    const entityType = pathParts.find(
      (p: string) => !p.startsWith(':') && p !== 'api',
    ) || 'unknown';

    const actionMap: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };

    // Capture request body before handler runs (this is the update payload)
    const requestBody = request.body ? JSON.parse(JSON.stringify(request.body)) : null;

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          const entityId = request.params?.id || responseData?.id || '';
          // For PUT/PATCH: old_value = fields before update (fetched from response's before-state isn't available
          // without a pre-fetch, so we store the changes_applied payload for auditability)
          const oldValue = (method === 'PUT' || method === 'PATCH')
            ? { changes_applied: requestBody }
            : Prisma.DbNull;

          await this.prisma.activityLog.create({
            data: {
              user_id: user?.id || null,
              entity_type: entityType,
              entity_id: String(entityId),
              action: actionMap[method] || method,
              old_value: oldValue,
              new_value: responseData ? JSON.parse(JSON.stringify(responseData)) : null,
              ip_address: typeof ip === 'string' ? ip : ip?.[0] || null,
            },
          });
        } catch {
          // Don't fail the request if audit logging fails
        }
      }),
    );
  }
}
