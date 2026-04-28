import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { MastersService } from './masters.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../generated/prisma';

@Controller('masters')
@UseGuards(JwtAuthGuard)
export class MastersController {
  constructor(private mastersService: MastersService) {}

  // ─── TRADES ───────────────────────────────────────
  @Get('trades')
  getTrades(@Query('all') all?: string) {
    return this.mastersService.getTrades(all !== 'true');
  }

  @Post('trades')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  createTrade(@Body() body: { name: string; display_order?: number }) {
    return this.mastersService.createTrade(body);
  }

  @Put('trades/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  updateTrade(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; display_order?: number; is_active?: boolean },
  ) {
    return this.mastersService.updateTrade(id, body);
  }

  // ─── STATES ───────────────────────────────────────
  @Get('states')
  getStates(@Query('all') all?: string) {
    return this.mastersService.getStates(all !== 'true');
  }

  @Post('states')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  createState(@Body() body: { name: string; display_order?: number }) {
    return this.mastersService.createState(body);
  }

  @Put('states/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  updateState(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; display_order?: number; is_active?: boolean },
  ) {
    return this.mastersService.updateState(id, body);
  }

  // ─── CITIES ───────────────────────────────────────
  @Get('cities')
  getCities(@Query('state_id') stateId?: string, @Query('all') all?: string) {
    return this.mastersService.getCities(
      stateId ? +stateId : undefined,
      all !== 'true',
    );
  }

  @Post('cities')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  createCity(@Body() body: { name: string; state_id: number; display_order?: number }) {
    return this.mastersService.createCity(body);
  }

  @Put('cities/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  updateCity(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; state_id?: number; display_order?: number; is_active?: boolean },
  ) {
    return this.mastersService.updateCity(id, body);
  }

  // ─── SOURCES ──────────────────────────────────────
  @Get('sources')
  getSources(@Query('all') all?: string) {
    return this.mastersService.getSources(all !== 'true');
  }

  @Post('sources')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  createSource(@Body() body: { name: string; display_order?: number }) {
    return this.mastersService.createSource(body);
  }

  @Put('sources/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  updateSource(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; display_order?: number; is_active?: boolean },
  ) {
    return this.mastersService.updateSource(id, body);
  }

  // ─── INTERVIEW VENUES ─────────────────────────────
  @Get('venues')
  getVenues(@Query('all') all?: string) {
    return this.mastersService.getVenues(all !== 'true');
  }

  @Post('venues')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  createVenue(@Body() body: { name: string; address?: string; city?: string; phone?: string; google_maps_url?: string; display_order?: number }) {
    return this.mastersService.createVenue(body);
  }

  @Put('venues/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  updateVenue(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; address?: string; city?: string; phone?: string; google_maps_url?: string; display_order?: number; is_active?: boolean },
  ) {
    return this.mastersService.updateVenue(id, body);
  }
}
