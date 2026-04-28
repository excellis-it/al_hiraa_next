import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MastersService {
  constructor(private prisma: PrismaService) {}

  // ─── TRADES ───────────────────────────────────────
  async getTrades(activeOnly = true) {
    return this.prisma.trade.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { display_order: 'asc' },
    });
  }

  async createTrade(data: { name: string; display_order?: number }) {
    return this.prisma.trade.create({ data });
  }

  async updateTrade(id: number, data: { name?: string; display_order?: number; is_active?: boolean }) {
    const trade = await this.prisma.trade.findUnique({ where: { id } });
    if (!trade) throw new NotFoundException('Trade not found');
    return this.prisma.trade.update({ where: { id }, data });
  }

  // ─── STATES ───────────────────────────────────────
  async getStates(activeOnly = true) {
    return this.prisma.state.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { display_order: 'asc' },
    });
  }

  async createState(data: { name: string; display_order?: number }) {
    return this.prisma.state.create({ data });
  }

  async updateState(id: number, data: { name?: string; display_order?: number; is_active?: boolean }) {
    const state = await this.prisma.state.findUnique({ where: { id } });
    if (!state) throw new NotFoundException('State not found');
    return this.prisma.state.update({ where: { id }, data });
  }

  // ─── CITIES ───────────────────────────────────────
  async getCities(stateId?: number, activeOnly = true) {
    return this.prisma.city.findMany({
      where: {
        ...(stateId ? { state_id: stateId } : {}),
        ...(activeOnly ? { is_active: true } : {}),
      },
      include: { state: { select: { name: true } } },
      orderBy: { display_order: 'asc' },
    });
  }

  async createCity(data: { name: string; state_id: number; display_order?: number }) {
    return this.prisma.city.create({ data });
  }

  async updateCity(id: number, data: { name?: string; state_id?: number; display_order?: number; is_active?: boolean }) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('City not found');
    return this.prisma.city.update({ where: { id }, data });
  }

  // ─── SOURCES ──────────────────────────────────────
  async getSources(activeOnly = true) {
    return this.prisma.source.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { display_order: 'asc' },
    });
  }

  async createSource(data: { name: string; display_order?: number }) {
    return this.prisma.source.create({ data });
  }

  async updateSource(id: number, data: { name?: string; display_order?: number; is_active?: boolean }) {
    const source = await this.prisma.source.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Source not found');
    return this.prisma.source.update({ where: { id }, data });
  }

  // ─── INTERVIEW VENUES ─────────────────────────────
  async getVenues(activeOnly = true) {
    return this.prisma.interviewVenue.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { display_order: 'asc' },
    });
  }

  async createVenue(data: { name: string; address?: string; city?: string; phone?: string; google_maps_url?: string; display_order?: number }) {
    return this.prisma.interviewVenue.create({ data });
  }

  async updateVenue(id: number, data: { name?: string; address?: string; city?: string; phone?: string; google_maps_url?: string; display_order?: number; is_active?: boolean }) {
    const venue = await this.prisma.interviewVenue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('Interview venue not found');
    return this.prisma.interviewVenue.update({ where: { id }, data });
  }
}
