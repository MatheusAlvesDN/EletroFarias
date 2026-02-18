import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dash')
export class DashController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('relatorioSaidaIncentivoGerencia')
  async getRelatorio(
    @Query('visao') visao: string,
    @Query('dtRef') dtRef: string,
    @Query('codParc') codParc?: string,
  ) {
    if (!dtRef) throw new BadRequestException('O parâmetro dtRef é obrigatório (YYYY-MM ou YYYY-MM-DD).');

    const visoesValidas = ['top', 'perfil', 'parceiro', 'detalhe', 'entrada'] as const;
    if (!visoesValidas.includes(visao as any)) {
      throw new BadRequestException(`Visão inválida. Permitidas: ${visoesValidas.join(', ')}`);
    }

    const codParcNum = codParc != null && codParc !== '' ? Number(codParc) : undefined;
    if (codParcNum != null && (!Number.isFinite(codParcNum) || codParcNum <= 0)) {
      throw new BadRequestException('codParc inválido (deve ser número > 0).');
    }

    if (visao === 'detalhe' && !codParcNum) {
      throw new BadRequestException('Para a visão detalhe, o parâmetro codParc é obrigatório.');
    }

    return this.dashboardService.getDadosIncentivo(
      visao as (typeof visoesValidas)[number],
      dtRef,
      codParcNum,
    );
  }
}
