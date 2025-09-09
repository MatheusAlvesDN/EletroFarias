import { Body, Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: { email: string; password: string }) {
    return this.auth.login(dto.email, dto.password);
  }

  // Verifica token via Bearer <token> no header Authorization
  @UseGuards(JwtAuthGuard)
  @Get('verify')
  verify(@Req() req: any) {
    // Se chegou aqui, o token é válido
    return { valid: true, user: req.user };
  }
}