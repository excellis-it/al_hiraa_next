import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CandidatesModule } from './candidates/candidates.module';
import { MastersModule } from './masters/masters.module';
import { AuditModule } from './audit/audit.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { CompaniesModule } from './companies/companies.module';
import { JobsModule } from './jobs/jobs.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { CallLogsModule } from './call-logs/call-logs.module';
import { ProcessTrackingModule } from './process-tracking/process-tracking.module';
import { PaymentsModule } from './payments/payments.module';
import { DropoutsModule } from './dropouts/dropouts.module';
import { FeeChangeRequestsModule } from './fee-change-requests/fee-change-requests.module';
import { InterviewEventsModule } from './interview-events/interview-events.module';
import { InterviewCheckinsModule } from './interview-checkins/interview-checkins.module';
import { MessageTemplatesModule } from './message-templates/message-templates.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FinanceModule } from './finance/finance.module';
import { AssociatesModule } from './associates/associates.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { ProcessDetailsModule } from './process-details/process-details.module';
import { ReferrersModule } from './referrers/referrers.module';
import { VendorsModule } from './vendors/vendors.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CandidatesModule,
    MastersModule,
    AuditModule,
    CompaniesModule,
    JobsModule,
    PipelineModule,
    CallLogsModule,
    ProcessTrackingModule,
    PaymentsModule,
    DropoutsModule,
    FeeChangeRequestsModule,
    InterviewEventsModule,
    InterviewCheckinsModule,
    MessageTemplatesModule,
    NotificationsModule,
    FinanceModule,
    AssociatesModule,
    AnalyticsModule,
    DeploymentsModule,
    ProcessDetailsModule,
    ReferrersModule,
    VendorsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
