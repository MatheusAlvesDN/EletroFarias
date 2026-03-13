import { Controller, Post, Body, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PrintService } from './print.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { SankhyaService } from '../Sankhya/sankhya.service'; // Adjust paths as needed
import { PrismaService } from '../Prisma/prisma.service';
import type { EnderecoMascara, EtiquetaCabo, Localizacoes } from '../types/print.types'; // Adjust paths as needed
import { orderByEnderecoStrict } from '../utils/order-helper';

@Controller('print')
export class PrintController {
  constructor(
    private readonly printService: PrintService,
    private readonly sankhyaService: SankhyaService,
    private readonly http: HttpService,
    private readonly prismaService: PrismaService,
  ) {}

  @Post('etiqueta-cabo')
  async imprimirEtiquetaCabo(@Body() data: any, @Res() res: Response) {
    const { nunota, parceiro, sequencia, vendedor, codprod, descrprod, qtdneg } = data;
    
    const token = await this.sankhyaService.login();
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
    await this.prismaService.createLogSync("Imprimir Etiqueta Cabo", "FINALIZADO", `Nunota: ${nunota} || Parceiro: ${parceiro} || Vendedor: ${vendedor} || CodProd: ${codprod} || DescrProd: ${descrprod}`, "SYSTEM")

    await this.sankhyaService.logout(token, "imprimirEtiquetaCabo");

    this.sendPdf(res, pdfBuffer, 'etiqueta_cabo.pdf');
  }

  @Post('etiqueta-loc')
  async imprimirEtiquetaLoc(@Body() localizacao: Localizacoes, @Res() res: Response) {
    const token = await this.sankhyaService.login();
    const pdfBuffer = await this.printService.gerarEtiquetaLocPDF(localizacao.Endereco, localizacao.Armazenamento);
    await this.sankhyaService.logout(token, "imprimirEtiquetaLoc");
    
    this.sendPdf(res, pdfBuffer, 'etiqueta_loc.pdf');
  }

  @Get('etiqueta-loc-gerar-range')
  async imprimirEtiquetaLoc2(@Res() res: Response) {
    const enderecos: EnderecoMascara[] = [];
    const token = await this.sankhyaService.login();

    for (let r = 5; r <= 8; r++) {
      for (let p = 1; p <= 6; p++) {
        for (let a = 1; a <= 1; a++) {
          const R = r.toString().padStart(2, "0");
          const P = p.toString().padStart(3, "0");
          const A = a.toString().padStart(2, "0");

          const Endereco = `01.02.${R}.${P}.01.${A}`;
          const mascara = `AR 02 R ${R} P ${P} N 01 A ${A}`;
          enderecos.push({ Endereco, mascara });
        }
      }
    }

    const items = enderecos.map(loc => ({ endereco: loc.Endereco, localizacao: loc.mascara }));
    const etiquetas = orderByEnderecoStrict(items);
    const pdfBuffer = await this.printService.gerarEtiquetaLocMultiPaletteQrCode(etiquetas);
    
    await this.sankhyaService.logout(token, "imprimirEtiquetaLoc");
    this.sendPdf(res, pdfBuffer, 'etiquetas_loc_range.pdf');
  }

  @Get('etiqueta-loc-multi')
  async imprimirEtiquetaLocMulti(@Res() res: Response) {
    const token = await this.sankhyaService.login();
    const localizacoes = await this.prismaService.getAllLocalizacoes();
    
    const items = localizacoes.map(loc => ({ endereco: loc.Endereco, localizacao: loc.Armazenamento }));
    const etiquetas = orderByEnderecoStrict(items);
    const pdfBuffer = await this.printService.gerarEtiquetaLocQRCodeMultiBig(etiquetas);
    
    await this.sankhyaService.logout(token, "imprimirEtiquetaLoc");
    this.sendPdf(res, pdfBuffer, 'etiquetas_loc_multi.pdf');
  }

  @Post('etiqueta-lid')
  async imprimirEtiquetaLid(@Body() data: any, @Res() res: Response) {
    const { nunota, parceiro, vendedor, codprod, descrprod, qtd_negociada } = data;
    const pdf = await this.printService.gerarEtiquetaLidPdf(nunota, parceiro, vendedor, codprod, descrprod, qtd_negociada);
    
    this.sendPdf(res, pdf, 'etiqueta_lid.pdf');
  }

  @Get('test')
  async imprimirEtiquetaTest(@Res() res: Response) {
    const pdf = await this.printService.gerarEtiquetaTeste();
    this.sendPdf(res, pdf, 'teste.pdf');
  }

  @Post('etiqueta-geral')
  async imprimirEtiqueta(@Body() data: any, @Res() res: Response) {
    const { nunota, parceiro, vendedor, codprod, descrprod, qtdneg, sequencia } = data;
    const token = await this.sankhyaService.login();
    
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
    
    await this.sankhyaService.logout(token, "imprimir etiqueta");
    
    this.sendPdf(res, pdf, 'etiqueta.pdf');
  }

  @Post('marcar-impresso')
  async impresso(@Body() data: { nunota: number; codprod: number }) {
    const token = await this.sankhyaService.login();
    try {
      return await this.sankhyaService.updateImpresso(data.nunota, data.codprod, token);
    } finally {
      await this.sankhyaService.logout(token, 'updateImpresso');
    }
  }

@Post('mapa-separacao-loc2')
  async mapaSeparacaoLoc2(
    @Body() data: { nunota: number; items: any[] },
    @Res() res: Response
  ) {
    try {
      const token = await this.sankhyaService.login();

      // Mapeia todos os itens e roda as requisições em PARALELO
      await Promise.all(data.items.map(async (item) => {
        if (!item.codprod) return;

        const imageUrl = `https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${item.codprod}.dbimage`;

        // Montamos as 3 Promises separadamente
        const produtoPromise = this.sankhyaService.getProduto(item.codprod, token).catch(() => null);
        
        const barrasPromise = this.sankhyaService.getCodBarras(item.codprod, token).catch(() => []);
        
        // Na imagem, adicionamos um 'timeout' no Axios para não travar a aplicação
        const imagemPromise = firstValueFrom(
          this.http.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 2500 // Se a imagem demorar mais de 2.5s, ele aborta e segue sem imagem
          })
        )
        .then(response => {
          if (response && response.data) {
            return Buffer.from(response.data).toString('base64');
          }
          return null;
        })
        .catch((err) => {
          console.warn(`[Timeout/Erro] Falha ao buscar imagem do codprod ${item.codprod}`);
          return null;
        });

        // Dispara as 3 buscas DESTE item simultaneamente
        const [produtoData, barras, imageBase64] = await Promise.all([
          produtoPromise, 
          barrasPromise, 
          imagemPromise
        ]);

        // 1. Processa Produto
        if (produtoData) {
          const produto = Array.isArray(produtoData) ? produtoData[0] : produtoData;
          item.descrprod = produto.DESCRPROD?.$ || produto.DESCRPROD || item.descrprod;
        }

        // 2. Processa Imagem
        item.imagem = imageBase64;

        // 3. Processa Código de Barras
        item.codbarra = barras && barras.length > 0 ? barras[0] : '-';
      }));

      // 4. Gera o PDF
      const pdfBuffer = await this.printService.gerarMapaSeparacaoLoc2(data.nunota, data.items);

      if (!pdfBuffer) {
        return res.status(HttpStatus.NOT_FOUND).json({ 
          message: 'Não foi possível gerar o PDF para este pedido.' 
        });
      }

      this.sendPdf(res, pdfBuffer, `mapa_separacao_loc2_${data.nunota}.pdf`);

    } catch (error: any) {
      console.error('Erro ao processar mapa de separação:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Ocorreu um erro ao gerar o mapa de separação.',
        detalhe: error.message
      });
    }
  }



  /**
   * Helper to set headers and send PDF
   */
  private sendPdf(res: Response, buffer: Buffer, filename: string) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=${filename}`,
      'Content-Length': buffer.length,
    });
    res.status(HttpStatus.OK).send(buffer);
  }


}

