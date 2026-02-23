import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SankhyaService } from './sankhya.service';

@Controller('sankhya')
export class SankhyaController {

  constructor(private readonly sankhyaService: SankhyaService) {}

  @Get()
  index() {
    return { ok: true, area: 'sankhya' }
    
  }
 // Controller
  @Get('nfe')
  async getAllNotas(
    @Query('dtIni') dtIni?: string,
    @Query('dtFim') dtFim?: string,
  ) {
    if (!dtIni || !dtFim) {
      throw new BadRequestException('Informe dtIni e dtFim (formato YYYY-MM-DD).');
    }
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(dtIni) || !re.test(dtFim)) {
      throw new BadRequestException('dtIni/dtFim inválidos. Use YYYY-MM-DD.');
    }
    const token = await this.sankhyaService.login();
    return this.sankhyaService.getAllTGFIXN(token, dtIni, dtFim);
  }

  @Get('relatorioSaidaIncentivoGerencia')
async getDashboard(
  @Query('dtRef') dtRef: string,
  @Query('visao') visao: string,
  @Query('codParc') codParc?: string,
) {
  /*if (!dtRef || !visao) {
    throw new BadRequestException('Informe dtRef (YYYY-MM-DD) e visao (top|tipo|parceiro|detalhe)');
  }

  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dtRef)) {
    throw new BadRequestException('dtRef inválido. Use YYYY-MM-DD.');
  }

  const allowed = new Set(['top', 'tipo', 'parceiro', 'detalhe']);
  if (!allowed.has(visao)) {
    throw new BadRequestException('visao inválida. Use top|tipo|parceiro|detalhe');
  }

  if (visao === 'detalhe') {
    if (!codParc || !/^\d+$/.test(codParc)) {
      throw new BadRequestException('Para visao=detalhe, informe codParc (inteiro).');
    }
  }*/

  const token = await this.sankhyaService.login();
  return this.sankhyaService.getDashboardData(token, visao, dtRef, codParc);
}
}