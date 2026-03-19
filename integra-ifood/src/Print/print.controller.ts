import { Controller, Post, Body, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PrintService } from './print.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as bwipjs from 'bwip-js';

import { SankhyaService } from '../Sankhya/sankhya.service';
import { PrismaService } from '../Prisma/prisma.service';
import type {
  EnderecoMascara,
  EtiquetaCabo,
  Localizacoes,
} from '../types/print.types';
import { orderByEnderecoStrict } from '../utils/order-helper';

type ItemMapa = {
  codprod?: number;
  descrprod?: string;
  codbarra?: string;
  imagemBuffer?: Buffer | null;
  barcodeBuffer?: Buffer | null;
  localizacao2?: string;
  qtdneg?: number;
};

@Controller('print')
export class PrintController {
  constructor(
    private readonly printService: PrintService,
    private readonly sankhyaService: SankhyaService,
    private readonly http: HttpService,
    private readonly prismaService: PrismaService,
  ) {}

  // Caches de valor final
  private descrCache = new Map<number, string>();
  private barrasCache = new Map<number, string>();
  private imageCache = new Map<number, Buffer | null>();
  private barcodeCache = new Map<string, Buffer | null>();

  // Caches de promises em andamento
  private produtoPromiseCache = new Map<number, Promise<string>>();
  private barrasPromiseCache = new Map<number, Promise<string>>();
  private imagePromiseCache = new Map<number, Promise<Buffer | null>>();
  private barcodePromiseCache = new Map<string, Promise<Buffer | null>>();

  @Post('etiqueta-cabo')
  async imprimirEtiquetaCabo(@Body() data: any, @Res() res: Response) {
    const { nunota, parceiro, sequencia, vendedor, codprod, descrprod, qtdneg } =
      data;

    const token = await this.sankhyaService.login();

    try {
      const body: EtiquetaCabo = {
        nunota,
        parceiro,
        vendedor,
        codprod,
        descrprod,
        qtdneg,
        codbarras: String(codprod),
      };

      await this.sankhyaService.updateImpresso(nunota, sequencia, token);

      const pdfBuffer = await this.printService.gerarEtiquetaCaboPdf(body);

      await this.prismaService.createLogSync(
        'Imprimir Etiqueta Cabo',
        'FINALIZADO',
        `Nunota: ${nunota} || Parceiro: ${parceiro} || Vendedor: ${vendedor} || CodProd: ${codprod} || DescrProd: ${descrprod}`,
        'SYSTEM',
      );

      this.sendPdf(res, pdfBuffer, 'etiqueta_cabo.pdf');
    } finally {
      await this.sankhyaService.logout(token, 'imprimirEtiquetaCabo');
    }
  }

  @Post('etiqueta-loc')
  async imprimirEtiquetaLoc(
    @Body() localizacao: Localizacoes,
    @Res() res: Response,
  ) {
    const token = await this.sankhyaService.login();

    try {
      const pdfBuffer = await this.printService.gerarEtiquetaLocPDF(
        localizacao.Endereco,
        localizacao.Armazenamento,
      );

      this.sendPdf(res, pdfBuffer, 'etiqueta_loc.pdf');
    } finally {
      await this.sankhyaService.logout(token, 'imprimirEtiquetaLoc');
    }
  }

  @Get('etiqueta-loc-gerar-range')
  async imprimirEtiquetaLoc2(@Res() res: Response) {
    const enderecos: EnderecoMascara[] = [];
    const token = await this.sankhyaService.login();

    try {
      for (let r = 5; r <= 8; r++) {
        for (let p = 1; p <= 6; p++) {
          for (let a = 1; a <= 1; a++) {
            const R = r.toString().padStart(2, '0');
            const P = p.toString().padStart(3, '0');
            const A = a.toString().padStart(2, '0');

            const Endereco = `01.02.${R}.${P}.01.${A}`;
            const mascara = `AR 02 R ${R} P ${P} N 01 A ${A}`;
            enderecos.push({ Endereco, mascara });
          }
        }
      }

      const items = enderecos.map((loc) => ({
        endereco: loc.Endereco,
        localizacao: loc.mascara,
      }));

      const etiquetas = orderByEnderecoStrict(items);
      const pdfBuffer =
        await this.printService.gerarEtiquetaLocMultiPaletteQrCode(etiquetas);

      this.sendPdf(res, pdfBuffer, 'etiquetas_loc_range.pdf');
    } finally {
      await this.sankhyaService.logout(token, 'imprimirEtiquetaLoc');
    }
  }

  @Get('etiqueta-loc-multi')
  async imprimirEtiquetaLocMulti(@Res() res: Response) {
    const token = await this.sankhyaService.login();

    try {
      const localizacoes = await this.prismaService.getAllLocalizacoes();

      const items = localizacoes.map((loc) => ({
        endereco: loc.Endereco,
        localizacao: loc.Armazenamento,
      }));

      const etiquetas = orderByEnderecoStrict(items);
      const pdfBuffer =
        await this.printService.gerarEtiquetaLocQRCodeMultiBig(etiquetas);

      this.sendPdf(res, pdfBuffer, 'etiquetas_loc_multi.pdf');
    } finally {
      await this.sankhyaService.logout(token, 'imprimirEtiquetaLoc');
    }
  }

  @Post('etiqueta-lid')
  async imprimirEtiquetaLid(@Body() data: any, @Res() res: Response) {
    const { nunota, parceiro, vendedor, codprod, descrprod, qtd_negociada } =
      data;

    const pdf = await this.printService.gerarEtiquetaLidPdf(
      nunota,
      parceiro,
      vendedor,
      codprod,
      descrprod,
      qtd_negociada,
    );

    this.sendPdf(res, pdf, 'etiqueta_lid.pdf');
  }

  @Get('test')
  async imprimirEtiquetaTest(@Res() res: Response) {
    const pdf = await this.printService.gerarEtiquetaTeste();
    this.sendPdf(res, pdf, 'teste.pdf');
  }

  @Post('etiqueta-geral')
  async imprimirEtiqueta(@Body() data: any, @Res() res: Response) {
    const { nunota, parceiro, vendedor, codprod, descrprod, qtdneg, sequencia } =
      data;

    const token = await this.sankhyaService.login();

    try {
      await this.sankhyaService.updateImpresso(nunota, sequencia, token);

      const body: EtiquetaCabo = {
        nunota,
        parceiro,
        vendedor,
        codprod,
        descrprod,
        qtdneg,
        codbarras: String(codprod),
      };

      const pdf = await this.printService.gerarEtiquetaPdf(body);

      this.sendPdf(res, pdf, 'etiqueta.pdf');
    } finally {
      await this.sankhyaService.logout(token, 'imprimir etiqueta');
    }
  }

  @Post('marcar-impresso')
  async impresso(@Body() data: { nunota: number; codprod: number }) {
    const token = await this.sankhyaService.login();

    try {
      return await this.sankhyaService.updateImpresso(
        data.nunota,
        data.codprod,
        token,
      );
    } finally {
      await this.sankhyaService.logout(token, 'updateImpresso');
    }
  }

  @Post('mapa-separacao-loc2')
  async mapaSeparacaoLoc2(
    @Body() data: { nunota: number; items: ItemMapa[] },
    @Res() res: Response,
  ) {
    let token: string | null = null;

    try {
      if (!data?.nunota || !Array.isArray(data.items)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Payload inválido.',
        });
      }

      token = await this.sankhyaService.login();

      await this.enriquecerItensMapa(data.items, token);

      const pdfBuffer = await this.printService.gerarMapaSeparacaoLoc2(
        data.nunota,
        data.items,
      );

      if (!pdfBuffer) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Não foi possível gerar o PDF para este pedido.',
        });
      }

      this.sendPdf(res, pdfBuffer, `mapa_separacao_loc2_${data.nunota}.pdf`);
    } catch (error: any) {
      console.error('Erro ao processar mapa de separação:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Ocorreu um erro ao gerar o mapa de separação.',
        detalhe: error?.message ?? 'Erro inesperado',
      });
    } finally {
      if (token) {
        try {
          await this.sankhyaService.logout(token, 'mapaSeparacaoLoc2');
        } catch (e) {
          console.error('Erro ao fazer logout do Sankhya:', e);
        }
      }
    }
  }

  private async enriquecerItensMapa(
    items: ItemMapa[],
    token: string,
  ): Promise<void> {
    const grupos = new Map<number, ItemMapa[]>();

    for (const item of items) {
      if (!item?.codprod) continue;

      const cod = Number(item.codprod);
      if (!grupos.has(cod)) grupos.set(cod, []);
      grupos.get(cod)!.push(item);
    }

    const codigos = Array.from(grupos.keys());
    const concorrencia = 8;

    for (let i = 0; i < codigos.length; i += concorrencia) {
      const lote = codigos.slice(i, i + concorrencia);

      await Promise.all(
        lote.map(async (cod) => {
          const itensDoProduto = grupos.get(cod)!;
          const itemBase = itensDoProduto[0];

          const [descrprod, codbarra, imagemBuffer] = await Promise.all([
            this.getDescricaoProduto(cod, token, itemBase.descrprod),
            this.getCodigoBarras(cod, token),
            this.getImagemProduto(cod, token),
          ]);

          let barcodeBuffer: Buffer | null = null;

          if (codbarra && codbarra !== '-') {
            barcodeBuffer = await this.getBarcodeBuffer(codbarra);
          }

          for (const item of itensDoProduto) {
            item.descrprod = descrprod;
            item.codbarra = codbarra;
            item.imagemBuffer = imagemBuffer;
            item.barcodeBuffer = barcodeBuffer;
          }
        }),
      );
    }
  }

  private getDescricaoProduto(
    cod: number,
    token: string,
    fallback?: string,
  ): Promise<string> {
    if (this.descrCache.has(cod)) {
      return Promise.resolve(this.descrCache.get(cod)!);
    }

    const emAndamento = this.produtoPromiseCache.get(cod);
    if (emAndamento) return emAndamento;

    const promise = (async () => {
      try {
        const produtoData = await this.sankhyaService.getProduto(cod, token);
        const produto = Array.isArray(produtoData) ? produtoData[0] : produtoData;

        const descr =
          produto?.DESCRPROD?.$ ?? produto?.DESCRPROD ?? fallback ?? '-';

        this.descrCache.set(cod, descr);
        return descr;
      } catch {
        const descr = fallback ?? '-';
        this.descrCache.set(cod, descr);
        return descr;
      } finally {
        this.produtoPromiseCache.delete(cod);
      }
    })();

    this.produtoPromiseCache.set(cod, promise);
    return promise;
  }

  private getCodigoBarras(cod: number, token: string): Promise<string> {
    if (this.barrasCache.has(cod)) {
      return Promise.resolve(this.barrasCache.get(cod)!);
    }

    const emAndamento = this.barrasPromiseCache.get(cod);
    if (emAndamento) return emAndamento;

    const promise = (async () => {
      try {
        const barras = await this.sankhyaService.getCodBarras(cod, token);

        const barraValida =
          Array.isArray(barras) && barras.length > 0 ? String(barras[0]) : '-';

        this.barrasCache.set(cod, barraValida);
        return barraValida;
      } catch {
        this.barrasCache.set(cod, '-');
        return '-';
      } finally {
        this.barrasPromiseCache.delete(cod);
      }
    })();

    this.barrasPromiseCache.set(cod, promise);
    return promise;
  }

  private getImagemProduto(cod: number, token: string): Promise<Buffer | null> {
    if (this.imageCache.has(cod)) {
      return Promise.resolve(this.imageCache.get(cod)!);
    }

    const emAndamento = this.imagePromiseCache.get(cod);
    if (emAndamento) return emAndamento;

    const promise = (async () => {
      try {
        const imageUrl = `https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${cod}.dbimage`;

        const imageResponse = await firstValueFrom(
          this.http.get<ArrayBuffer>(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 2500,
            headers: {
              Cookie: `JSESSIONID=${token}`,
            },
          }),
        );

        const contentType = imageResponse.headers['content-type'];
        const isImage =
          typeof contentType === 'string' && contentType.startsWith('image/');

        const buffer = isImage
          ? Buffer.from(imageResponse.data as any)
          : null;

        this.imageCache.set(cod, buffer);
        return buffer;
      } catch {
        this.imageCache.set(cod, null);
        return null;
      } finally {
        this.imagePromiseCache.delete(cod);
      }
    })();

    this.imagePromiseCache.set(cod, promise);
    return promise;
  }

  private getBarcodeBuffer(codbarra: string): Promise<Buffer | null> {
    if (this.barcodeCache.has(codbarra)) {
      return Promise.resolve(this.barcodeCache.get(codbarra)!);
    }

    const emAndamento = this.barcodePromiseCache.get(codbarra);
    if (emAndamento) return emAndamento;

    const promise = (async () => {
      try {
        const buffer = await bwipjs.toBuffer({
          bcid: 'code128',
          text: codbarra,
          scale: 2,
          height: 12,
          includetext: true,
          textxalign: 'center',
        });

        this.barcodeCache.set(codbarra, buffer);
        return buffer;
      } catch (error) {
        console.error(
          `Erro ao gerar código de barras BWIPJS para ${codbarra}:`,
          error,
        );
        this.barcodeCache.set(codbarra, null);
        return null;
      } finally {
        this.barcodePromiseCache.delete(codbarra);
      }
    })();

    this.barcodePromiseCache.set(codbarra, promise);
    return promise;
  }

  private sendPdf(res: Response, buffer: Buffer, filename: string) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=${filename}`,
      'Content-Length': buffer.length,
    });

    res.status(HttpStatus.OK).send(buffer);
  }
}