import { BadRequestException, Controller, Get, Query, UseGuards, Post, Body, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SankhyaService } from './sankhya.service';
import { DashboardFiltrosDto } from '../dto/sankhya-dashboard.dto';

@Controller('sankhya')
export class SankhyaController {

  constructor(private readonly sankhyaService: SankhyaService) { }

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

  @Get('getNotaByChaveNFE')
  async getNotaByChaveNFE(
    @Query('chavenfe') chavenfe: string,

  ) {

    const token = await this.sankhyaService.login();
    return this.sankhyaService.getNotaPorChaveNfe(chavenfe, token);
  }

  @Get('getItensNota')
  async getItensNota(
    @Query('chavenfe') chavenfe: string,

  ) {
    console.log(chavenfe)
    const token = await this.sankhyaService.login();
    const nota = await this.sankhyaService.getNotaPorChaveNfe(chavenfe, token)
    console.log(nota)
    return await this.sankhyaService.getItensNotaNfe(token, nota.NUNOTA);
  }

  @Get('notas-mes')
  async getNotasMes(
    @Query('codEmp') codEmp: string,
    @Query('dtIni') dtIni: string,
    @Query('dtFim') dtFim: string,
  ) {
    const token = await this.sankhyaService.login();
    return await this.sankhyaService.getNotasMesGadget(token, Number(codEmp), dtIni, dtFim);
  }

  @Get('notas-detalhadas')
  async getNotasDetalhadas(
    @Query('codEmp') codEmp: string,
    @Query('dtIni') dtIni: string,
    @Query('dtFim') dtFim: string,
    @Query('contrib') contrib: string,
    @Query('nContrib') nContrib: string,
    @Query('cfops') cfops?: string, // Recebe a query 'cfops' ao invés de 'cfop'
  ) {
    const token = await this.sankhyaService.login();

    // Converte a string "5102,5405" em um array ["5102", "5405"]
    const cfopsArray = cfops
      ? cfops.split(',').map(c => c.trim()).filter(Boolean)
      : undefined;

    return await this.sankhyaService.getNotasMesDetalhado(
      token,
      Number(codEmp),
      dtIni,
      dtFim,
      contrib === 'true',
      nContrib === 'true',
      cfopsArray
    );
  }

  @Get('notas-entradas')
  async getNotasEntradaMes(
    @Query('codEmp') codEmp: string,
    @Query('dtIni') dtIni: string,
    @Query('dtFim') dtFim: string,

  ) {
    const token = await this.sankhyaService.login();

    return await this.sankhyaService.getNotasEntradaMes(
      token,
      Number(codEmp),
      dtIni,
      dtFim,
    );
  }


  @Get('livro-cfop-aliquota')
  async getLivroCfopAliquota(
    @Query('codEmp') codEmp: string,
    @Query('dtIni') dtIni: string,
    @Query('dtFim') dtFim: string,
    @Query('tipo') tipo: string,
  ) {
    const token = await this.sankhyaService.login();

    const items = await this.sankhyaService.getLivroCfopAliquota(
      token,
      Number(codEmp),
      dtIni,
      dtFim,
      Number(tipo),
    );
    return items.filter(item => item.CFOP == '1102' || item.CFOP == '2102');
  }

  @Post('agrupado')
  async getAgrupadoPorCfop(
    @Body() filtros: DashboardFiltrosDto
  ) {
    const token = await this.sankhyaService.login();
    const retorno = await this.sankhyaService.obterConferenciaAgrupada(token, filtros);
    await this.sankhyaService.logout(token, "agrupado");
    return retorno;
  }

  @Post('analitico/:cfop')
  async getAnalitico(

    @Param('cfop') cfop: number,
    @Body() filtros: DashboardFiltrosDto
  ) {
    const token = await this.sankhyaService.login();
    const retorno = await this.sankhyaService.obterListagemAnalitica(token, filtros, cfop);
    await this.sankhyaService.logout(token, "analitico");
    return retorno;
  }


   @Post('separadoLoc2')
  async separadoLoc2(
    @Param('nunota') nunota: number,
    @Body() dto: { nunota: number},
  ) {
    console.log('Controller separadoLoc2 - nunota:', nunota);
    console.log('Controller separadoLoc2 - dto:', dto);
    const token = await this.sankhyaService.login();
    const retorno = await this.sankhyaService.separadoLoc2(dto.nunota, token);
    await this.sankhyaService.logout(token, "separadoLoc2");
    return retorno;
  }

  @Get('notas-pendentes-faturamento')
  async buscarNotasPendentes() {
    const token = await this.sankhyaService.login();
    const retorno = await  this.sankhyaService.getNotasPendentesFaturamento(token);
    await this.sankhyaService.logout(token, "separadoLoc2");
    return retorno;
  }

  @Post('lancamento-lote')
  async lancamentoLote(
    @Body() data: { codParc: number, codTipOper: number, codTipVenda: number, tipMov?: string, produtos: any[] }
  ) {
    const token = await this.sankhyaService.login();
    try {
      const retorno = await this.sankhyaService.incluirNotaEmLote(
        data.codParc || 1,
        data.codTipOper || 314,
        data.codTipVenda || 40,
        data.produtos,
        token,
        data.tipMov || 'V'
      );
      return retorno;
    } finally {
      await this.sankhyaService.logout(token, "lancamento-lote");
    }
  }

  @Post('ncm/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadNcm(
    @UploadedFile() file: any
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    // Copia o buffer para não ser perdido caso o interceptor limpe da memória quando a requisição encerrar
    const bufferCopy = Buffer.from(file.buffer);

    // Disparo Assíncrono para o Background (Non-Blocking)
    setTimeout(async () => {
      try {
        const token = await this.sankhyaService.login();
        try {
          await this.sankhyaService.uploadNcmCsv(bufferCopy, token);
        } finally {
          await this.sankhyaService.logout(token, "uploadNcmCsvBg");
        }
      } catch (err) {
        console.error('Erro irrecuperável na thread background do NCM:', err);
      }
    }, 100);

    return { ok: true, message: 'Arquivo recebido com sucesso. Processamento massivo ocorrerá em segundo plano para não travar a tela.' };
  }

  @Get('ncm')
  async getAllNcm() {
    return this.sankhyaService.getAllNcmLocais();
  }

}