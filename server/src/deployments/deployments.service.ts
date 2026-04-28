import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CandidateStatus, DeploymentStatus } from '../generated/prisma';

@Injectable()
export class DeploymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    company_id?: number;
    expiring_days?: number;
  }) {
    const { page = 1, limit = 20, search, status, company_id, expiring_days } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (company_id) where.company_id = company_id;
    if (search) {
      where.candidate = {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { passport_no: { contains: search, mode: 'insensitive' } },
          { whatsapp_no: { contains: search } },
        ],
      };
    }
    if (expiring_days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + expiring_days);
      where.contract_end_date = { lte: cutoff };
      where.status = DeploymentStatus.active;
    }

    const [deployments, total] = await Promise.all([
      this.prisma.deployment.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true,
              full_name: true,
              whatsapp_no: true,
              passport_no: true,
              state: { select: { name: true } },
            },
          },
          company: { select: { id: true, name: true, country: true } },
          position: { select: { id: true, name: true } },
          created_by_user: { select: { id: true, full_name: true } },
        },
        skip,
        take: limit,
        orderBy: { deployment_date: 'desc' },
      }),
      this.prisma.deployment.count({ where }),
    ]);

    // Compute days_remaining for each
    const today = new Date();
    const data = deployments.map((d) => {
      const end = new Date(d.contract_end_date);
      const days_remaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...d, days_remaining };
    });

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: number) {
    const dep = await this.prisma.deployment.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            id: true,
            full_name: true,
            whatsapp_no: true,
            alternate_contact: true,
            passport_no: true,
            gender: true,
            dob: true,
            state: { select: { name: true } },
            city: { select: { name: true } },
          },
        },
        company: true,
        position: { select: { id: true, name: true } },
        created_by_user: { select: { id: true, full_name: true } },
      },
    });
    if (!dep) throw new NotFoundException('Deployment not found');

    const today = new Date();
    const end = new Date(dep.contract_end_date);
    const days_remaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return { ...dep, days_remaining };
  }

  async create(dto: {
    candidate_id: number;
    candidate_job_id?: number;
    company_id: number;
    position_id: number;
    deployment_date: string;
    contract_end_date: string;
    salary_amount: number;
    salary_currency?: string;
    country: string;
    visa_number?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    notes?: string;
  }, createdBy: string) {
    const deploymentDate = new Date(dto.deployment_date);

    const deployment = await this.prisma.$transaction(async (tx) => {
      const dep = await tx.deployment.create({
        data: {
          candidate_id: dto.candidate_id,
          candidate_job_id: dto.candidate_job_id ?? null,
          company_id: dto.company_id,
          position_id: dto.position_id,
          deployment_date: deploymentDate,
          contract_end_date: new Date(dto.contract_end_date),
          salary_amount: dto.salary_amount,
          salary_currency: dto.salary_currency ?? 'SAR',
          country: dto.country as any,
          visa_number: dto.visa_number,
          emergency_contact_name: dto.emergency_contact_name,
          emergency_contact_phone: dto.emergency_contact_phone,
          notes: dto.notes,
          created_by: createdBy,
        },
        include: {
          candidate: { select: { id: true, full_name: true, associate_id: true } },
          company: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
        },
      });

      // Sync candidate status to deployed
      await tx.candidate.update({
        where: { id: dto.candidate_id },
        data: { status: CandidateStatus.deployed },
      });

      // Auto-sync ProcessDetails.deployment_date when candidate_job_id is known
      if (dto.candidate_job_id) {
        await tx.processDetails.upsert({
          where: { candidate_job_id: dto.candidate_job_id },
          create: {
            candidate_job_id: dto.candidate_job_id,
            deployment_date: deploymentDate,
            candidate_status: 'deployed',
          },
          update: {
            deployment_date: deploymentDate,
            candidate_status: 'deployed',
          },
        });
      }

      // Auto-create AssociateCommission if candidate has an associate
      if (dep.candidate.associate_id && dto.candidate_job_id) {
        const associate = await tx.associate.findUnique({
          where: { id: dep.candidate.associate_id },
          select: { commission_rate: true, commission_type: true },
        });
        if (associate) {
          const commissionAmount =
            associate.commission_type === 'percentage'
              ? (Number(associate.commission_rate) / 100) * dto.salary_amount
              : Number(associate.commission_rate);

          await tx.associateCommission.create({
            data: {
              associate_id: dep.candidate.associate_id,
              candidate_job_id: dto.candidate_job_id,
              commission_amount: commissionAmount,
              status: 'earned',
            },
          });
        }
      }

      return dep;
    });

    // Notify all managers (outside transaction — non-critical)
    await this.notifyManagers(
      `${deployment.candidate.full_name} has been deployed to ${deployment.company.name} as ${deployment.position.name}`,
      'deployment',
    );

    return deployment;
  }

  async update(id: number, dto: Partial<{
    contract_end_date: string;
    salary_amount: number;
    salary_currency: string;
    visa_number: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    status: string;
    notes: string;
  }>) {
    await this.findOne(id);
    const data: any = {};
    if (dto.contract_end_date) data.contract_end_date = new Date(dto.contract_end_date);
    if (dto.salary_amount !== undefined) data.salary_amount = dto.salary_amount;
    if (dto.salary_currency) data.salary_currency = dto.salary_currency;
    if (dto.visa_number !== undefined) data.visa_number = dto.visa_number;
    if (dto.emergency_contact_name !== undefined) data.emergency_contact_name = dto.emergency_contact_name;
    if (dto.emergency_contact_phone !== undefined) data.emergency_contact_phone = dto.emergency_contact_phone;
    if (dto.status) {
      data.status = dto.status;
      // If completed/terminated, update candidate status back to inactive
      if (dto.status === DeploymentStatus.completed || dto.status === DeploymentStatus.terminated) {
        const dep = await this.prisma.deployment.findUnique({ where: { id } });
        if (dep) {
          await this.prisma.candidate.update({
            where: { id: dep.candidate_id },
            data: { status: CandidateStatus.inactive },
          });
        }
      }
    }
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.deployment.update({ where: { id }, data });
  }

  async getExpiringSoon(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    return this.prisma.deployment.findMany({
      where: {
        status: DeploymentStatus.active,
        contract_end_date: { lte: cutoff },
        expiry_notified: false,
      },
      include: {
        candidate: { select: { full_name: true, whatsapp_no: true } },
        company: { select: { name: true } },
      },
      orderBy: { contract_end_date: 'asc' },
    });
  }

  async sendExpiryNotifications() {
    const expiring = await this.getExpiringSoon(30);
    if (!expiring.length) return { notified: 0 };

    const managers = await this.prisma.user.findMany({
      where: { role: { in: ['manager', 'admin'] as any }, is_active: true },
      select: { id: true },
    });

    for (const dep of expiring) {
      const today = new Date();
      const end = new Date(dep.contract_end_date);
      const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const message = `Contract expiring in ${days} day${days !== 1 ? 's' : ''}: ${dep.candidate.full_name} at ${dep.company.name}`;

      for (const mgr of managers) {
        await this.prisma.notification.create({
          data: { user_id: mgr.id, message, type: 'contract_expiry' },
        });
      }

      await this.prisma.deployment.update({
        where: { id: dep.id },
        data: { expiry_notified: true },
      });
    }

    return { notified: expiring.length };
  }

  async getSummary() {
    const today = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const [active, expiringSoon, completed, terminated] = await Promise.all([
      this.prisma.deployment.count({ where: { status: DeploymentStatus.active } }),
      this.prisma.deployment.count({
        where: { status: DeploymentStatus.active, contract_end_date: { lte: thirtyDays } },
      }),
      this.prisma.deployment.count({ where: { status: DeploymentStatus.completed } }),
      this.prisma.deployment.count({ where: { status: DeploymentStatus.terminated } }),
    ]);

    return { active, expiring_soon: expiringSoon, completed, terminated };
  }

  private async notifyManagers(message: string, type: string) {
    const managers = await this.prisma.user.findMany({
      where: { role: { in: ['manager', 'admin'] as any }, is_active: true },
      select: { id: true },
    });
    for (const mgr of managers) {
      await this.prisma.notification.create({
        data: { user_id: mgr.id, message, type },
      });
    }
  }
}
