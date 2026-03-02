import { Controller, Get, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { ExpedicaoService } from './expedicao.service';

@Controller('expedicao')
export class ExpedicaoController {
  private readonly logger = new Logger(ExpedicaoController.name);

  constructor(
    private readonly sankhyaService: SankhyaService,
    private readonly expedicaoService: ExpedicaoService,
  ) {}

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
      // Log opcional apenas para debug
      // notas.forEach(n => this.logger.debug(`Nunota: ${n.nunota} TOP: ${n.codtipoper}`));
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

  
}