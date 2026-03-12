import { Controller, Get, Query, Logger, HttpException, HttpStatus, Post, Body } from '@nestjs/common';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { ExpedicaoService } from './expedicao.service';
import { WhatsappService } from '../WhatsApp/whatsapp.service';

@Controller('expedicao')
export class ExpedicaoController {
  private readonly logger = new Logger(ExpedicaoController.name);

  constructor(
    private readonly sankhyaService: SankhyaService,
    private readonly expedicaoService: ExpedicaoService,
    private readonly whatsappService: WhatsappService,
  ) { }

  @Get('fila-cabos')
  async listarFilaCabos() {
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.listarFilaCabos(token);
    } finally {
      await this.sankhyaService.logout(token, 'listarFilaCabos');
    }
  }

  @Get('itens-pendentes')
  async listarItensPendentes() {
    const token = await this.sankhyaService.login();
    try {
      const retorno = await this.expedicaoService.listarItensLid(token);
      return retorno.filter((p) => p[32] <= p[35]);
    } finally {
      await this.sankhyaService.logout(token, 'listarItensPendentes');
    }
  }

  @Get('itens-nota-lid')
  async listarItensNotaLid(@Query('nunota') nunota: string) {
    if (!nunota) {
      throw new HttpException('O parâmetro nunota é obrigatório', HttpStatus.BAD_REQUEST);
    }

    const nunotaNumber = Number(nunota);
    const token = await this.sankhyaService.login();

    try {
      const retorno = await this.expedicaoService.listarItensLid(token);
      const filtrado = retorno.filter(
        (p) => p[5] === nunotaNumber && p[32] <= p[35],
      );
      return filtrado;
    } finally {
      await this.sankhyaService.logout(token, 'listarItensNotaLid');
    }
  }

  @Get('pedidos-lid')
  async pedidosLid() {
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.listarPedidosLid(token);
    } finally {
      await this.sankhyaService.logout(token, 'listarPedidosLid');
    }
  }

  @Get('notas-expedicao')
  async getNotasExpedicao() {
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.listarNotasExpedicao(token);
    } finally {
      await this.sankhyaService.logout(token, 'getNotasExpedicao');
    }
  }

  @Get('notas-separacao')
  async getNotasSeparacao() {
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.listarNotasSeparacao(token);
    } finally {
      await this.sankhyaService.logout(token, 'getNotasSeparacao');
    }
  }

  @Get('notas-dfarias')
  async getNotasDfarias() {
    const token = await this.sankhyaService.login();
    try {
      const notas = await this.expedicaoService.listarNotasDfarias(token);
      return notas.filter((n) => n.codtipoper === 322);
    } finally {
      await this.sankhyaService.logout(token, 'getNotasDfarias');
    }
  }

  @Get('notas-tv')
  async getAllNotasTV() {
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.listarNotasTV(token);
    } finally {
      await this.sankhyaService.logout(token, 'getAllNotasTV');
    }
  }

  @Get('notas-loja')
  async getNotasLoja() {
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.listarNotasTV(token);
    } finally {
      await this.sankhyaService.logout(token, 'getNotasLoja');
    }
  }

  @Get('listarItensLoc2')
  async listarItensLoc2() {
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.listarItensLocalizacao2AR02(token);
    } finally {
      await this.sankhyaService.logout(token, 'getNotasLoja');
    }
  }

  @Get('fila-virtual')
  async getFilaVirtual() {
    this.logger.log('Iniciando busca de pedidos para a Fila Virtual...');
    const token = await this.sankhyaService.login();

    try {
      return await this.expedicaoService.listarFilaVirtual(token);
    } catch (error) {
      this.logger.error(`Erro ao buscar fila virtual: ${error.message}`);
      throw error;
    } finally {
      await this.sankhyaService.logout(token, 'getFilaVirtual');
    }
  }

  @Post('disparar-whatsapp')
  async dispararWhatsapp(
    @Body() body: { celular: string; cliente: string; numnota: number; status: string; linkRastreio: string }
  ) {
    // Agora validamos também se o linkRastreio chegou corretamente
    if (!body.celular || !body.numnota || !body.linkRastreio) {
      throw new HttpException('Dados insuficientes (celular, numnota ou linkRastreio faltando).', HttpStatus.BAD_REQUEST);
    }

    try {
      // Chama a nova função do serviço, passando todos os dados necessários
      await this.whatsappService.enviarNotificacaoRastreio(
        body.celular,
        body.cliente,
        body.numnota,
        body.linkRastreio
      );
      return { message: 'WhatsApp com link de rastreio enviado com sucesso!' };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('wesley')
  async getNotasWesley(
    @Query('codEmp') codEmp: string,
    @Query('dtIni') dtIni: string,
    @Query('dtFim') dtFim: string,
  ) {
    // Validação básica dos parâmetros recebidos
    if (!codEmp || !dtIni || !dtFim) {
      throw new HttpException(
        'Os parâmetros codEmp, dtIni e dtFim são obrigatórios.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const token = await this.sankhyaService.login();
    
    try {
      // Chama o método atualizado no seu ExpedicaoService
      return await this.expedicaoService.getTodasNotasMes(
        token,
        Number(codEmp),
        dtIni,
        dtFim,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar notas em /wesley: ${error.message}`);
      throw new HttpException(
        error.message || 'Erro interno ao buscar as notas.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Garante que o logout do Sankhya será feito, mesmo se der erro
      await this.sankhyaService.logout(token, 'getNotasWesley');
    }
  }

}