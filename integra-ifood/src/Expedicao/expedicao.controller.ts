import { Controller, Get, Query, Logger, HttpException, HttpStatus, Post, Body, Param } from '@nestjs/common';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { ExpedicaoService } from './expedicao.service';
import { WhatsappService } from '../WhatsApp/whatsapp.service';
import { PrismaService } from '../Prisma/prisma.service';
import { SalesNotesFilterDto } from '../dto/sales-notes-filter.dto';

@Controller('expedicao')
export class ExpedicaoController {
  private readonly logger = new Logger(ExpedicaoController.name);

  constructor(
    private readonly sankhyaService: SankhyaService,
    private readonly expedicaoService: ExpedicaoService,
    private readonly whatsappService: WhatsappService,
    private readonly prismaService: PrismaService,
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

  @Get('rastreio/:nunota')
  async rastrearPedido(@Param('nunota') nunota: string) {
    if (!nunota) {
      throw new HttpException('O parâmetro NUNOTA é obrigatório.', HttpStatus.BAD_REQUEST);
    }

    const token = await this.sankhyaService.login();

    try {
      this.logger.log(`Buscando rastreio para o NUNOTA: ${nunota}`);
      const pedido = await this.expedicaoService.obterFilaVirtualPorNumNota(token, Number(nunota));

      if (!pedido) {
        // Se o método retornar null, disparamos um erro 404 (Not Found)
        throw new HttpException('Pedido não encontrado ou já finalizado.', HttpStatus.NOT_FOUND);
      }

      return pedido;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar rastreio da nota ${nunota}: ${error.message}`);
      // Se já for uma HttpException (como o 404 acima), repassa
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Erro interno ao buscar o rastreamento.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Garante o logout para não prender a licença do Sankhya
      await this.sankhyaService.logout(token, 'rastrearPedido');
    }
  }

  @Get('notas-pendentes')
  async listarNotasPendentes() {
    const token = await this.sankhyaService.login();

    try {
      this.logger.log('Buscando notas pendentes (TOP 321, 200, 92)...');
      const notas = await this.expedicaoService.listarNotasPendentes(token);
      return notas;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar notas pendentes: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Erro interno ao buscar as notas.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Garante o logout para não prender a licença
      await this.sankhyaService.logout(token, 'listarNotasPendentes');
    }
  }

  @Post('acompanhamento')
  async atualizarAcompanhamento(@Body() body: { nunota: number; status: string }) {
    if (!body.nunota || !body.status) {
      throw new HttpException('Parâmetros nunota e status são obrigatórios.', HttpStatus.BAD_REQUEST);
    }

    try {
      // O Prisma espera nunota como String (conforme seu schema), então fazemos o cast
      const result = await this.prismaService.registrarStatusAcompanhamento(
        String(body.nunota),
        body.status
      );

      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Erro ao atualizar acompanhamento da nota ${body.nunota}: ${error.message}`);
      throw new HttpException('Erro interno ao registrar status.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('acompanhamento/:nunota')
  async buscarTempoAcompanhamento(@Param('nunota') nunota: string) {
    if (!nunota) {
      throw new HttpException('Parâmetro nunota é obrigatório.', HttpStatus.BAD_REQUEST);
    }

    try {
      const dados = await this.prismaService.buscarAcompanhamentoTempo(nunota);
      return dados || {}; // Retorna vazio caso a nota ainda não tenha sido processada pela esteira
    } catch (error: any) {
      this.logger.error(`Erro ao buscar tempos da nota ${nunota}: ${error.message}`);
      throw new HttpException('Erro interno ao buscar acompanhamento.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('auditoria-entrada')
  async buscarAuditoriaEntrada(
    @Query('dtIni') dtIni: string,
    @Query('dtFim') dtFim: string,
  ) {
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.getAuditoriaEntrada(token, dtIni, dtFim);
    } finally {
      await this.sankhyaService.logout(token, 'auditoria-entrada');
    }
  }

  @Get('auditoria-saida')
  async buscarAuditoriaSaida(
    @Query('dtIni') dtIni: string,
    @Query('dtFim') dtFim: string,
  ) {
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.getAuditoriaSaida(token, dtIni, dtFim);
    } finally {
      await this.sankhyaService.logout(token, 'auditoria-saida');
    }
  }

  @Get('auditoria-quebra-sequencia')
  async buscarQuebraSequencia(
    @Query('dtIni') dtIni: string,
    @Query('dtFim') dtFim: string,
  ) {
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.getQuebraSequencia(token, dtIni, dtFim);
    } finally {
      await this.sankhyaService.logout(token, 'auditoria-quebra-sequencia');
    }
  }

  @Get('auditoria-notas-omissas')
  async buscarNotasOmissas(
    @Query('dtIni') dtIni: string,
    @Query('dtFim') dtFim: string,
  ) {
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.getNotasOmissas(token, dtIni, dtFim);
    } finally {
      await this.sankhyaService.logout(token, 'auditoria-notas-omissas');
    }
  }

  @Post('sales-notes-custo')
  async getSalesNotesWithCusto(@Body() filters: SalesNotesFilterDto) {
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.getSalesNotesWithCusto(filters, token);
    } finally {
      await this.sankhyaService.logout(token, 'getSalesNotesWithCusto');
    }
  }

  @Get('xml-nota/:numnota')
  async buscarXmlNota(@Param('numnota') numnota: string) {
    if (!numnota) {
      throw new HttpException('Parâmetro NUMNOTA é obrigatório.', HttpStatus.BAD_REQUEST);
    }

    const token = await this.sankhyaService.login();
    try {
      const xml = await this.expedicaoService.getXmlNota(token, Number(numnota));
      if (!xml) {
        throw new HttpException('XML não encontrado para esta nota.', HttpStatus.NOT_FOUND);
      }
      return { xml };
    } catch (error: any) {
      this.logger.error(`Erro ao buscar XML da nota ${numnota}: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Erro interno ao buscar XML.', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      await this.sankhyaService.logout(token, 'buscarXmlNota');
    }
  }

  @Get('giro')
  async getGiroEstoque(@Query('dias') diasStr?: string) {
    this.logger.log('Iniciando busca de projeção de estoque...');
    const token = await this.sankhyaService.login();
    const diasAnalise = diasStr ? parseInt(diasStr, 10) : 30;

    try {
      return await this.expedicaoService.listarGiroEstoque(token, diasAnalise);
    } catch (error: any) {
      this.logger.error(`Erro ao buscar giro de estoque: ${error.message}`);
      throw error;
    } finally {
      if (token) {
        await this.sankhyaService.logout(token, 'getGiroEstoque');
      }
    }
  }

  // Novo endpoint para o modal de pedidos
  @Get('pedidos-produto/:codprod')
  async getPedidosProduto(@Param('codprod') codprod: string, @Query('dias') diasStr?: string) {
    this.logger.log(`Buscando pedidos para o produto ${codprod}...`);
    const token = await this.sankhyaService.login();
    const diasAnalise = diasStr ? parseInt(diasStr, 10) : 30;

    try {
      return await this.expedicaoService.listarPedidosProduto(token, Number(codprod), diasAnalise);
    } catch (error: any) {
      this.logger.error(`Erro ao buscar pedidos do produto ${codprod}: ${error.message}`);
      throw error;
    } finally {
      if (token) {
        await this.sankhyaService.logout(token, 'getPedidosProduto');
      }
    }
  }

  @Get('marcas')
  async getMarcas(
    @Query('apenasNegativos') apenasNegativos?: string,
    @Query('eletroFarias') eletroFarias?: string,
    @Query('lid') lid?: string,
  ) {
    this.logger.log('Buscando resumo de marcas...');
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.listarMarcas(token, apenasNegativos, eletroFarias, lid);
    } catch (error: any) {
      this.logger.error(`Erro ao buscar marcas: ${error.message}`);
      throw error;
    } finally {
      if (token) await this.sankhyaService.logout(token, 'getMarcas');
    }
  }

  @Get('marcas/itens')
  async getItensMarca(
    @Query('marca') marca?: string,
    @Query('apenasNegativos') apenasNegativos?: string,
    @Query('eletroFarias') eletroFarias?: string,
    @Query('lid') lid?: string,
  ) {
    this.logger.log(`Buscando itens da marca: ${marca}`);
    const token = await this.sankhyaService.login();
    try {
      return await this.expedicaoService.listarItensMarca(token, marca, apenasNegativos, eletroFarias, lid);
    } catch (error: any) {
      this.logger.error(`Erro ao buscar itens da marca: ${error.message}`);
      throw error;
    } finally {
      if (token) await this.sankhyaService.logout(token, 'getItensMarca');
    }
  }

}