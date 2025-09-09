import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SankhyaService } from './sankhya.service';

@UseGuards(JwtAuthGuard)
@Controller('sankhya')
export class SankhyaController {
  constructor(private readonly sankhya: SankhyaService) {}

  // GET /sankhya
  @Get()
  index() {
    // Você pode chamar métodos do SankhyaService aqui, se quiser.
    return { ok: true, area: 'sankhya' };
  }
}