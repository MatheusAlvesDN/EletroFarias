// src/Sankhya/sankhya.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('sankhya')
export class SankhyaController {
  @Get()
  index() {
    return { ok: true, area: 'sankhya' };
  }
}
