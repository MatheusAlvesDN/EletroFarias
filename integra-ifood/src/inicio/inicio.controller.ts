import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class InicioController {
  @UseGuards(JwtAuthGuard)
  @Get()
  root() {
    return { message: 'Bem-vindo! (rota / protegida por JWT)' };
  }
}
