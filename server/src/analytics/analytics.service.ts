import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getPipelineVelocity() {
    // Weekly pipeline additions for last 8 weeks
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const weeklyRaw = await this.prisma.$queryRaw<
      { week: Date; count: bigint }[]
    >`
      SELECT
        DATE_TRUNC('week', created_at) AS week,
        COUNT(*) AS count
      FROM candidate_jobs
      WHERE created_at >= ${eightWeeksAgo}
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week ASC
    `;

    const weekly_additions = weeklyRaw.map((r) => ({
      week: r.week,
      count: Number(r.count),
    }));

    // Average days from created_at to interview_selected (using updated_at as proxy)
    const selectionTimesRaw = await this.prisma.$queryRaw<
      { avg_days: number | null }[]
    >`
      SELECT AVG(
        EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400.0
      ) AS avg_days
      FROM candidate_jobs
      WHERE status = 'interview_selected'
    `;

    const avg_days_to_selection = selectionTimesRaw[0]?.avg_days
      ? Math.round(Number(selectionTimesRaw[0].avg_days) * 10) / 10
      : 0;

    // Breakdown by trade
    const byTradeRaw = await this.prisma.$queryRaw<
      { trade_name: string; count: bigint; avg_days: number | null }[]
    >`
      SELECT
        t.name AS trade_name,
        COUNT(cj.id) AS count,
        AVG(
          EXTRACT(EPOCH FROM (cj.updated_at - cj.created_at)) / 86400.0
        ) AS avg_days
      FROM candidate_jobs cj
      JOIN jobs j ON cj.job_id = j.id
      JOIN trades t ON j.trade_id = t.id
      WHERE cj.status = 'interview_selected'
      GROUP BY t.name
      ORDER BY count DESC
    `;

    const by_trade = byTradeRaw.map((r) => ({
      trade_name: r.trade_name,
      count: Number(r.count),
      avg_days: r.avg_days ? Math.round(Number(r.avg_days) * 10) / 10 : 0,
    }));

    return {
      avg_days_to_selection,
      weekly_additions,
      by_trade,
    };
  }

  async getSourcePerformance() {
    // Total candidates per source
    const sourceTotals = await this.prisma.candidate.groupBy({
      by: ['source_id'],
      _count: { id: true },
    });

    if (sourceTotals.length === 0) {
      return { sources: [] };
    }

    const sourceIds = sourceTotals
      .map((s) => s.source_id)
      .filter((id): id is number => id !== null);

    // Get source names
    const sources = await this.prisma.source.findMany({
      where: { id: { in: sourceIds } },
      select: { id: true, name: true },
    });
    const sourceMap = new Map(sources.map((s) => [s.id, s.name]));

    // Candidates who reached lined_up or above per source (using ORM to avoid raw array param issues)
    const linedUpCandidates = await this.prisma.candidateJob.findMany({
      where: {
        status: {
          in: ['lined_up', 'interview_selected', 'interview_rejected', 'interview_on_hold'] as any,
        },
      },
      select: { candidate: { select: { source_id: true } } },
      distinct: ['candidate_id'],
    });

    const linedUpMap = new Map<number, number>();
    for (const cj of linedUpCandidates) {
      const sid = cj.candidate.source_id;
      if (sid !== null) {
        linedUpMap.set(sid, (linedUpMap.get(sid) ?? 0) + 1);
      }
    }

    const result = sourceTotals
      .filter((s): s is typeof s & { source_id: number } => s.source_id !== null)
      .map((s) => {
        const total = s._count.id;
        const lined_up = linedUpMap.get(s.source_id) ?? 0;
        const conversion_rate =
          total > 0 ? Math.round((lined_up / total) * 1000) / 10 : 0;
        return {
          source_id: s.source_id,
          source_name: sourceMap.get(s.source_id) ?? 'Unknown',
          total_candidates: total,
          lined_up,
          conversion_rate,
        };
      });

    result.sort((a, b) => b.total_candidates - a.total_candidates);

    return { sources: result };
  }

  async getDropoutAnalysis() {
    // Dropout count by reason
    const byReasonRaw = await this.prisma.dropout.groupBy({
      by: ['dropout_reason'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const by_reason = byReasonRaw.map((r) => ({
      reason: r.dropout_reason,
      count: r._count.id,
    }));

    // Dropout count by stage
    const byStageRaw = await this.prisma.dropout.groupBy({
      by: ['dropout_stage'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const by_stage = byStageRaw.map((r) => ({
      stage: r.dropout_stage,
      count: r._count.id,
    }));

    // Monthly dropout trend for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRaw = await this.prisma.$queryRaw<
      { month: Date; count: bigint }[]
    >`
      SELECT
        DATE_TRUNC('month', created_at) AS month,
        COUNT(*) AS count
      FROM dropouts
      WHERE created_at >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `;

    const monthly_trend = monthlyRaw.map((r) => ({
      month: r.month,
      count: Number(r.count),
    }));

    return { by_reason, by_stage, monthly_trend };
  }

  async getDeploymentSpeed() {
    // Funnel: registered → pipeline → lined_up → selected → process_started → deployed
    const [
      totalCandidates,
      totalCandidateJobs,
      linedUpCount,
      selectedCount,
      processStartedCount,
      deployedCount,
    ] = await Promise.all([
      this.prisma.candidate.count(),
      this.prisma.candidateJob.count(),
      this.prisma.candidateJob.count({ where: { status: 'lined_up' } }),
      this.prisma.candidateJob.count({ where: { status: 'interview_selected' } }),
      this.prisma.processTracking.count({
        where: { step_number: 1, status: { not: 'not_started' } },
      }),
      this.prisma.candidate.count({ where: { status: 'deployed' } }),
    ]);

    const funnel = [
      { stage: 'registered', count: totalCandidates },
      { stage: 'in_pipeline', count: totalCandidateJobs },
      { stage: 'lined_up', count: linedUpCount },
      { stage: 'interview_selected', count: selectedCount },
      { stage: 'process_started', count: processStartedCount },
      { stage: 'deployed', count: deployedCount },
    ];

    // Average time per step (completed steps only)
    const stepDurationsRaw = await this.prisma.$queryRaw<
      { step_name: string; avg_days: number | null; total: bigint }[]
    >`
      SELECT
        step_name,
        AVG(
          EXTRACT(EPOCH FROM (completed_at - started_at)) / 86400.0
        ) AS avg_days,
        COUNT(*) AS total
      FROM process_tracking
      WHERE status = 'completed'
        AND started_at IS NOT NULL
        AND completed_at IS NOT NULL
      GROUP BY step_name
      ORDER BY avg_days DESC NULLS LAST
    `;

    const step_durations = stepDurationsRaw.map((r) => ({
      step_name: r.step_name,
      avg_days: r.avg_days ? Math.round(Number(r.avg_days) * 10) / 10 : 0,
      completed_count: Number(r.total),
    }));

    // Identify bottleneck: step with highest avg_days
    const bottleneck =
      step_durations.length > 0 ? step_durations[0].step_name : 'No data yet';

    // Count of candidates in each process step status
    const stepStatusRaw = await this.prisma.processTracking.groupBy({
      by: ['step_name', 'status'],
      _count: { id: true },
      orderBy: { step_name: 'asc' },
    });

    // Group by step_name
    const stepStatusMap: Record<string, Record<string, number>> = {};
    for (const row of stepStatusRaw) {
      if (!stepStatusMap[row.step_name]) {
        stepStatusMap[row.step_name] = {};
      }
      stepStatusMap[row.step_name][row.status] = row._count.id;
    }

    const step_counts = Object.entries(stepStatusMap).map(([step_name, statuses]) => ({
      step_name,
      not_started: statuses['not_started'] ?? 0,
      in_progress: statuses['in_progress'] ?? 0,
      completed: statuses['completed'] ?? 0,
      on_hold: statuses['on_hold'] ?? 0,
      failed: statuses['failed'] ?? 0,
    }));

    return { funnel, step_durations, step_counts, bottleneck };
  }

  async getOverview() {
    const [pipelineVelocity, sourcePerformance, dropoutAnalysis, deploymentSpeed] =
      await Promise.all([
        this.getPipelineVelocity(),
        this.getSourcePerformance(),
        this.getDropoutAnalysis(),
        this.getDeploymentSpeed(),
      ]);

    return {
      pipeline_velocity: {
        avg_days_to_selection: pipelineVelocity.avg_days_to_selection,
        weekly_additions: pipelineVelocity.weekly_additions,
      },
      source_performance: {
        top_sources: sourcePerformance.sources.slice(0, 5),
      },
      dropout_analysis: {
        total_dropouts: dropoutAnalysis.by_reason.reduce(
          (sum, r) => sum + r.count,
          0,
        ),
        top_reasons: dropoutAnalysis.by_reason.slice(0, 3),
        monthly_trend: dropoutAnalysis.monthly_trend,
      },
      deployment_speed: {
        funnel: deploymentSpeed.funnel,
        bottleneck: deploymentSpeed.bottleneck,
      },
    };
  }
}
