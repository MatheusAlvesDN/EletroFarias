import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { format, subHours } from 'date-fns';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import * as fS from 'node:fs/promises';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as https from 'https';
import { AxiosError } from 'axios';
import { IncentivoResumoParceiro, ItemImpostoIncentivo } from '../types/relatorio.types';
import { DashboardFiltrosDto } from '../dto/sankhya-dashboard.dto';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../Prisma/prisma.service';

const onlyDigits = (v: any) => String(v ?? '').replace(/\D/g, '');

export type ProdutoInfos = {
  CODPROD: number;
  DESCRPROD: string | null;
  MARCA: string | null;
  CARACTERISTICAS: string | null;
  CODVOL: string | null;
  CODGRUPOPROD: number | null;
  LOCALIZACAO: string | null;
  UNIDADE?: string | null; // <-- ADICIONE ESTA LINHA
  DESCRGRUPOPROD: string | null;
  ENDIMAGEM: string | null;
  AD_UNIDADELV: string | null;
};

type PedidoPendenteSankhya = {
  NUNOTA: number;
  NUMNOTA: number;
  DESCROPER: string;
  DTALTER: string;
  HRALTER: string;
  PARCEIRO: string;
  VENDEDOR: string;
  DESCRPROD: string;
  ESTOQUE_ATUAL: number;
  QTD_NEGOCIADA: number;
  QTD_PENDENTE_CALC: number;
}

type MarcaOption = {
  id: number;
  nome: string;
};

type ProdutoListaParams = {
  groupId?: number;
  manufacturerId?: number;
  manufacturerIds?: number[];
  search?: string;
  limit: number;
  offset: number;
};

type CurvaRow = { CODPROD: number; CURVA_ABC_12M: string };

type GadgetRow = Record<string, any>;


type PreValidacaoResult = {
  validos: Array<{ codProd: number; diference: number }>;
  falhas: PreValidacaoFalha[];
};


export type AjusteLancado = { codProd: number; diference: number };
export type PreValidacaoFalha = { codProd: number; diference: number; motivo: string };

export type IncluirAjustesResult =
  | {
    ok: true;
    nota: any;
    falhas: PreValidacaoFalha[];
    lancados: AjusteLancado[];
  }
  | {
    ok: false;
    nota: null;
    falhas: PreValidacaoFalha[];
    lancados: AjusteLancado[];
    erro: string;
  };



function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}



type AjusteItem = {
  codProd: number;
  diference: number; // quantidade (QTDNEG)
  descricao?: string;
};

type FilaCabosRow = {
  // ordem/cores
  ordemLinha: number;       // ORDEM_GERAL
  bkcolor: string;          // BKCOLOR
  fgcolor: string;          // FGCOLOR
  ordemTipoPri: number;     // ORDEM_TIPO_PRI
  ordemTipo: number;        // ORDEM_TIPO

  // cabeçalho/pedido
  nunota: number;
  numnota: number;
  codtipoper: number;
  descroper: string;

  dtalter: string;          // DTALTER (TRUNC)
  hralter: string;          // HRALTER (HH24:MI:SS)

  codparc: number;
  parceiro: string;

  vlrnota: number;

  codvend: number;
  vendedor: string;

  adTipoDeEntrega: string | null; // CAB.AD_TIPODEENTREGA
  tipoEntrega: string;

  statusNota: string;       // CAB.STATUSNOTA
  statusNotaDesc: string;

  libconf: string | null;

  // conferência
  statusConferenciaCod: string | null;  // MAX(CON.STATUS)
  statusConferenciaDesc: string | null; // label
  qtdRegConferencia: number;

  // item
  sequencia: number;
  codprod: number;
  descrprod: string;
  codgrupoprod: number;
  codvol: string;
  qtdneg: number;
  vlrunit: number;
  vlrtot: number;
  impresso: string;
};


type Produtos = {
  codProduto: number;
  quantidade: number;
  descricao: string;
};

type NotaNaoConfirmada = {
  nunota: number;
  numnota: number | null;
  codparc: number | null;
  codtipoper: number | null;
  dtneg: string | null;
  dtentsai: string | null;
  statusnota: string | null; // L
};

type NotaRow = [
  number,        // 0 NUNOTA
  number,        // 1 NUMNOTA
  any,           // 2 status (você citou)
  any,           // 3 (ignorando)
  number,        // 4 CODPARC
  number,        // 5 CODTIPOPER
  string,        // 6 DTNEG
  string,        // 7 DT2 (DTENTSAI)
  string         // 8 STATUSNOTA ('L' = não confirmada)
];

type NotaConferenciaRow = {
  ordemLinha: number;
  bkcolor: string;
  fgcolor: string;

  nunota: number;
  numnota: number;
  codtipoper: number;
  descroper: string;

  dtneg: string; // vem do oracle como data; pode vir string dependendo do driver
  hrneg: string;
  codparc: number;
  parceiro: string;
  vlrnota: number;

  codvend: number;
  vendedor: string;

  adTipoDeEntrega: string | null;
  tipoEntrega: string;

  statusNota: string;
  statusNotaDesc: string;
  adSeparacao: string;

  libconf: string | null;

  statusConferenciaCod: string | null;
  statusConferenciaDesc: string | null;

  qtdRegConferencia: number;
  codProj?: number;
  descProj?: string | null;
};


export type PedidoConferenciaRow = {
  BKCOLOR: string;
  FGCOLOR: string;
  ORDEM_TIPO_PRI: number;
  ORDEM_TIPO: number;
  ORDEM_GERAL: number;

  NUNOTA: number;
  NUMNOTA: number;
  CODTIPOPER: number;
  DESCROPER: string;

  DTALTER: string;   // dependendo do retorno pode vir como string/ISO
  HRALTER: string;

  CODPARC: number;
  PARCEIRO: string;

  VLRNOTA: number;

  CODVEND: number;
  VENDEDOR: string;

  AD_TIPODEENTREGA: string | null;
  TIPO_ENTREGA: string;

  STATUS_NOTA: string;
  STATUS_NOTA_DESC: string;

  LIBCONF: string | null;

  STATUS_CONFERENCIA_COD: string | null;
  STATUS_CONFERENCIA_DESC: string | null;
  QTD_REG_CONFERENCIA: number;

  SEQUENCIA: number;
  CODPROD: number;
  DESCRPROD: string;
  CODGRUPOPROD: number;
  CODVOL: string;
  QTDNEG: number;
  VLRUNIT: number;
  VLRTOT: number;
};



interface Produto {
  barcode: string;
  name: string;
  plu: string;
  active: boolean;
  inventory: { stock: number };
  details: {
    categorization: {
      department: any;
      category: any;
      subCategory: any;
    };
    brand: any;
    unit: any;
    volume: any;
    imageUrl: string | null;
    description: string | null;
    nearExpiration: boolean;
    family: any;
  };
  prices: {
    price: number;
    promotionPrice: number | null;
  };
  scalePrices: any;
  multiple: any;
  channels: any;
  serving: any;
};

function getFirstThreeColumnsFromSheet(): Array<{ cod: string; name: string; ean: string }> {
  const filePath = path.join(process.cwd(), 'relatorios/cadastrarEAN.xlsx');

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  const result = data
    .slice(1) // Ignora o cabeçalho
    .map(row => ({
      cod: row[0],
      name: row[1],
      ean: row[2],
    }));

  return result;
};

export interface ProdutoLocDTO {
  CODPROD: string | null;
  DESCRPROD: string | null;
  MARCA: string | null;
  CARACTERISTICAS: string | null;
  CODVOL: string | null;
  CODGRUPOPROD: string | null;
  LOCALIZACAO: string | null;
  DESCRGRUPOPROD: string | null; // do join GrupoProduto
};

function toAscii(input: string) {
  // remove acentos/diacríticos e troca ç/Ç por c
  return String(input ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove acentos (inclui a cedilha)
    .replace(/ç/gi, 'c')            // redundante, mas garante
    .trim();
}

type EstoqueLinha = {
  CODLOCAL: number;
  ESTOQUE: number;
  RESERVADO: number;
  DISPONIVEL: number;
  // Se incluir campos de apresentação (ex.: LocalFinanceiro_DESCRLOCAL), eles entram aqui:
  [k: string]: any;
};

type VendedorDTO = {
  CODVEND: number | null;
  CODPARC: number | null;
  APELIDO: string | null;
  AD_TIPOTECNICO: number | null;
};

@Injectable()
export class SankhyaService {
  /*getProductsByLocation(location: string, token: string) {
      throw new Error('Method not implemented.');
  }*/
  private readonly loginUrl = 'https://api.sankhya.com.br/authenticate';
  private readonly queryUrl = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';
  private readonly logoutUrl = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=MobileLoginSP.logout&outputType=json';
  private readonly baseUrl = 'https://api.sankhya.com.br/'
  private readonly grupoUrl = 'https://api.sankhya.com.br/GrupoProduto'
  private readonly outputDir = process.env.OUTPUT_DIR || path.resolve(process.cwd(), 'exports');
  private readonly logger = new Logger(SankhyaService.name);
  private readonly serviceUrl =
    process.env.SANKHYA_SERVICE_URL // ex.: https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
    || 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';
  private readonly token: string;
  private readonly appKey: string;
  private readonly username: string;
  private readonly password: string;


  private readonly executeQueryUrl =
    'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';
  httpService: any;




  private async resolverCodVolPadrao(codProd: number, authToken: string): Promise<string> {
    const headers = { Authorization: `Bearer ${authToken}` };

    // 1) tenta pelos volumes do produto
    const urlVolumes = `https://api.sankhya.com.br/v1/produtos/${codProd}/volumes`;
    const volResp = await firstValueFrom(this.http.get(urlVolumes, { headers }));

    const lista = volResp.data?.content ?? volResp.data?.items ?? volResp.data ?? [];
    // ⚠️ a estrutura exata pode variar; por isso deixei 3 fallbacks comuns

    const padrao =
      lista.find((v: any) => v?.padrao === true || v?.isPadrao === true || v?.unidadePadrao === true) ??
      lista[0];

    const codVol =
      padrao?.codVol ?? padrao?.CODVOL ?? padrao?.codigoVolume ?? padrao?.volume;

    if (codVol) return String(codVol);

    // 2) fallback: tenta pegar do “produto específico”
    const urlProd = `https://api.sankhya.com.br/v1/produtos/${codProd}`;
    const prodResp = await firstValueFrom(this.http.get(urlProd, { headers }));

    const prod = prodResp.data;
    const codVolProd =
      prod?.codVol ?? prod?.CODVOL ?? prod?.unidadePadrao ?? prod?.unidade?.codigo;

    if (codVolProd) return String(codVolProd);

    throw new Error(`Não consegui determinar CODVOL padrão do produto ${codProd}`);
  }


  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.token = this.configService.get<string>('SANKHYA_TOKEN')!;
    this.appKey = this.configService.get<string>('SANKHYA_APPKEY')!;
    this.username = this.configService.get<string>('SANKHYA_USERNAME')!;
    this.password = this.configService.get<string>('SANKHYA_PASSWORD')!;
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_NAME'),
      api_key: this.configService.get('CLOUDINARY_KEY'),
      api_secret: this.configService.get('CLOUDINARY_SECRET'),
    });
  }



  private mapNotaRow(row: any[]): NotaNaoConfirmada | null {
    // suporte ao retorno tipo array
    if (!Array.isArray(row) || row.length < 9) return null;

    const nunota = Number(row[0]);
    if (!Number.isFinite(nunota)) return null;

    return {
      nunota,
      numnota: row[1] != null ? Number(row[1]) : null,
      codparc: row[4] != null ? Number(row[4]) : null,
      codtipoper: row[5] != null ? Number(row[5]) : null,
      dtneg: row[6] ?? null,
      dtentsai: row[7] ?? null,
      statusnota: row[8] ?? null,
    };
  }


  // Dentro do seu service
  /*
  
  async login(): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.http.post(this.loginUrl, null, {
          headers: {
            token: this.token,
            appkey: this.appKey,
            username: this.username,
            password: this.password,
          },
        }),
      );
      const bearerToken = response.data.bearerToken;
      if (!bearerToken) {
        throw new Error('Bearer token não retornado no login.');
      }

      return bearerToken;
    } catch (error: any) {
      console.error(
        'Erro ao autenticar na API Sankhya:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }
    
  
  */

  async login(): Promise<string> {
    const url = 'https://api.sankhya.com.br/login';

    try {
      const resp = await firstValueFrom(
        this.http.post(url, null, {
          timeout: 30000,
          maxRedirects: 0,
          validateStatus: () => true, // captura body mesmo se vier 4xx/5xx
          headers: {
            Accept: 'application/json',
            // IMPORTANTÍSSIMO: impedir que algum default/interceptor injete urlencoded
            'Content-Type': undefined as any,

            token: process.env.SANKHYA_TOKEN!,
            appkey: process.env.SANKHYA_APPKEY!,
            username: process.env.SANKHYA_USERNAME!,
            password: process.env.SANKHYA_PASSWORD!,
          },
        }),
      );

      if (resp.status >= 400) {
        // log útil, sem segredos
        console.error('Login Sankhya falhou:', {
          status: resp.status,
          data: resp.data,
        });
        throw new Error(`Login Sankhya falhou (HTTP ${resp.status})`);
      }

      const bearerToken = resp.data?.bearerToken;
      if (!bearerToken) {
        console.error('Login Sankhya: bearerToken ausente', { data: resp.data });
        throw new Error('bearerToken não retornado no login.');
      }

      return bearerToken;
    } catch (e) {
      const err = e as AxiosError<any>;

      // timeout -> err.code === 'ECONNABORTED' e não tem response
      console.error('Login Sankhya exception:', {
        code: err.code,
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });

      throw e;
    }
  }


  async logout(authToken: string, log: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.get(this.logoutUrl, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
            'Content-Type': 'application/json',
          },
        }),
      );
      console.log(log);
    } catch (error: any) {
      console.error(
        'Erro ao fazer logout:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }



  //#region Cadastro de produtos, com os retornos experados para a API do ifood

  async atualizarPlanilhaComItensRestantes(
    itensRestantes: { cod: string; name: string; ean: string }[],
    caminho = 'relatorios/cadastrarEAN.xlsx'
  ) {
    const filePath = path.join(process.cwd(), caminho);
    const ws = XLSX.utils.json_to_sheet(itensRestantes);
    const wb = XLSX.utils.book_new();

    ws['!cols'] = [
      { wch: 15 }, // cod
      { wch: 50 }, // name
      { wch: 20 }, // ean
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Produtos sem EAN válido');
    XLSX.writeFile(wb, filePath);
  }

  async getProduto(codProd: number, authToken: string): Promise<any> {
    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Produto',
          includePresentationFields: 'N',
          tryJoinedFields: 'true',
          offsetPage: '0',
          criteria: {
            expression: {
              $: 'this.CODPROD = ?',
            },
            parameter: [
              {
                $: codProd.toString(),
                type: 'I',
              },
            ],
          },
          entity: [
            {
              path: '',
              fieldset: {
                // 👇 AQUI: Adicionamos a REFFORN no final da lista
                list: 'CODPROD,DESCRPROD,MARCA,CARACTERISTICAS,CODVOL,CODGRUPOPROD,LOCALIZACAO,AD_LOCALIZACAO,REFFORN',
              },
            },
            {
              path: 'GrupoProduto',
              fieldset: {
                list: 'DESCRGRUPOPROD',
              },
            },
          ],
        },
      },
    };
    try {
      const response = await firstValueFrom(
        this.http.post(this.queryUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
          },
        }),
      );

      return response.data.responseBody?.entities?.entity;
    } catch (error: any) {
      console.error(
        'Erro ao buscar produto:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async getProductsByGroup(
    CategoryID: string,
    categoryName: string,
    authToken: string
  ): Promise<any[]> {
    const produtos: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const payload = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Produto',
            includePresentationFields: 'N',
            tryJoinedFields: 'true',
            offsetPage: page.toString(),
            pageSize: '50',
            criteria: {
              expression: { $: 'this.CODGRUPOPROD = ? AND this.ATIVO = ?' },
              parameter: [
                { $: CategoryID, type: 'S' },
                { $: 'S', type: 'S' },
              ],
            },
            entity: [
              {
                path: '',
                fieldset: {
                  list: 'CODPROD,DESCRPROD,CODGRUPOPROD,CARACTERISTICAS,ATIVO,MARCA,UNIDADE,AD_CODBARRA',
                },
              },
            ],
          },
        },
      };

      try {
        const response = await firstValueFrom(
          this.http.post(this.queryUrl, payload, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
              appkey: this.appKey,
            },
          }),
        );

        const entities = response.data?.responseBody?.entities?.entity || [];
        produtos.push(...entities);
        hasMore = entities.length >= 50;
        page++;
      } catch (error: any) {
        console.error('Erro na paginação de produtos:', error.response?.data || error.message);
        throw error;
      }
    }

    // 🔁 Processar produtos em paralelo
    const produtosFormatados = await Promise.all(
      produtos
        .filter(prod => prod.f4?.['$'] === 'S') // ATIVO
        .map(async (prod) => {
          const codigo = prod.f0?.['$'] ?? '';
          const descricao = prod.f1?.['$'] ?? '';
          const caracteristicas = prod.f3?.['$'] ?? '';
          const marca = prod.f5?.['$'] ?? '';
          const unidade = prod.f6?.['$'] ?? '';
          const ean = prod.f7?.['$'] ?? '';

          const imagemUrlOriginal = `https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${codigo}.dbimage`;

          let imageCloudinary: string | null = null;
          try {
            imageCloudinary = await this.processImageFromUrl(imagemUrlOriginal, `produto_${codigo}`);
          } catch (e) {
            console.warn(`Erro ao processar imagem do produto ${codigo}:`, e.message);
          }

          return {
            barcode: ean.toString(),
            name: descricao,
            plu: codigo.toString(),
            active: true,
            inventory: {
              stock: 1,
            },
            details: {
              categorization: {
                department: categoryName,
                category: marca,
                subCategory: null,
              },
              brand: marca,
              unit: unidade,
              volume: null,
              imageUrl: imageCloudinary,
              description: caracteristicas || null,
              nearExpiration: false,
              family: null,
            },
            prices: {
              price: 999999,
              promotionPrice: null,
            },
            scalePrices: null,
            multiple: null,
            channels: null,
            serving: null
          };
        }),
    );

    return produtosFormatados;
  }

  async filterInvalidEanAndExport(
    categoryId: string,
    categoryName: string,
    authToken: string
  ): Promise<Produto[]> {
    const allProducts: Produto[] = await this.getProductsByGroup(
      categoryId,
      categoryName,
      authToken
    );

    const filePath = path.join(process.cwd(), 'relatorios/cadastrarEAN.xlsx');
    const invalidMap = new Map<string, { name: string; ean: string }>(); // PLU -> { name, ean }

    // Carrega dados existentes da planilha
    if (fs.existsSync(filePath)) {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const existing: { 'Código PLU': string; 'Nome do Produto': string; EAN?: string }[] =
        XLSX.utils.sheet_to_json(sheet);

      for (const { 'Código PLU': plu, 'Nome do Produto': name, EAN: ean } of existing) {
        invalidMap.set(plu, { name, ean: ean ?? '' });
      }
    }

    const validProducts: Produto[] = [];

    for (const prod of allProducts) {
      const ean = prod.barcode?.toString().trim() ?? '';

      if (!ean || ean.length !== 13 || !/^\d{13}$/.test(ean)) {
        invalidMap.set(prod.plu, { name: prod.name, ean });
      } else {
        validProducts.push(prod);
      }
    }

    if (invalidMap.size > 0) {
      const finalData = Array.from(invalidMap.entries()).map(([PLU, { name, ean }]) => ({
        'Código PLU': PLU,
        'Nome do Produto': name,
        'EAN': ean,
      }));

      const ws = XLSX.utils.json_to_sheet(finalData);
      ws['!cols'] = [
        { wch: 15 }, // PLU
        { wch: 50 }, // Nome
        { wch: 20 }, // EAN
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produtos sem EAN válido');
      XLSX.writeFile(wb, filePath);
    }

    return validProducts;
  }

  async readPlanWithEAN(): Promise<{ cod: string; name: string; ean: string }[]> {
    const retorno = getFirstThreeColumnsFromSheet();
    return retorno;
  }

  async atualizarProduto(token: string, codProd: string, codeEAN: string) {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const data = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        entityName: 'Produto',
        standAlone: false,
        fields: ['CODPROD', 'AD_CODBARRA'],
        records: [
          {
            pk: {
              CODPROD: codProd,
            },
            values: {
              1: codeEAN,
            },
          },
        ],
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.post(url, data, { headers }),
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao atualizar produto:', error.response?.data || error.message);
      throw error;
    }
  }

  async getProdutoAlone(codProd: string, authToken: string): Promise<Produto | null> {
    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Produto',
          includePresentationFields: 'N',
          tryJoinedFields: 'true',
          offsetPage: '0',
          criteria: {
            expression: {
              $: 'this.CODPROD = ?',
            },
            parameter: [
              {
                $: codProd.toString(),
                type: 'I',
              },
            ],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'CODPROD,DESCRPROD,MARCA,CARACTERISTICAS,CODVOL,CODGRUPOPROD,ATIVO,AD_CODBARRA',
              },
            },
            {
              path: 'GrupoProduto',
              fieldset: {
                list: 'DESCRGRUPOPROD',
              },
            },
          ],
        },
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.post(this.queryUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
          },
        }),
      );

      const entity = response.data.responseBody?.entities?.entity?.[0];
      if (!entity) return null;

      const codigo = entity.f0?.['$'] ?? '';
      const descricao = entity.f1?.['$'] ?? '';
      const marca = entity.f2?.['$'] ?? '';
      const caracteristicas = entity.f3?.['$'] ?? '';
      const unidade = entity.f4?.['$'] ?? '';
      const grupo = entity.f5?.['$'] ?? '';
      const ativo = entity.f6?.['$'] === 'S';
      const ean = entity.f7?.['$'] ?? '';
      const grupoDescricao = entity.f8?.['$'] ?? ''; // DESCRGRUPOPROD

      // Imagem
      const imagemUrlOriginal = `https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${codigo}.dbimage`;

      let imageCloudinary: string | null = null;
      try {
        imageCloudinary = await this.processImageFromUrl(imagemUrlOriginal, `produto_${codigo}`);
      } catch (e) {
        console.warn(`Erro ao processar imagem do produto ${codigo}:`, e.message);
      }

      const produto: Produto = {
        barcode: ean.toString(),
        name: descricao,
        plu: codigo.toString(),
        active: ativo,
        inventory: {
          stock: 1, // Valor fixo (ajustável se necessário)
        },
        details: {
          categorization: {
            department: grupoDescricao,
            category: marca,
            subCategory: null,
          },
          brand: marca,
          unit: unidade,
          volume: null,
          imageUrl: imageCloudinary,
          description: caracteristicas || null,
          nearExpiration: false,
          family: null,
        },
        prices: {
          price: 999999, // Valor fixo ou carregado de outro lugar
          promotionPrice: null,
        },
        scalePrices: null,
        multiple: null,
        channels: null,
        serving: null,
      };

      return produto;

    } catch (error: any) {
      console.error(
        'Erro ao buscar produto:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  //puxa os produtos por grupo do sankhya com EAN em formato para o ifood grocery e adiciona os que não possuem a planilha para cadastrar

  async enrichWithPricesFromProductList(
    produtos: Array<{
      barcode: string;
      name: string;
      plu: string;
      active: boolean;
      inventory: { stock: number };
      details: {
        categorization: {
          department: any;
          category: any;
          subCategory: any;
        };
        brand: any;
        unit: any;
        volume: any;
        imageUrl: string | null;
        description: string | null;
        nearExpiration: boolean;
        family: any;
      };
      prices: {
        price: number;
        promotionPrice: number | null;
      };
      scalePrices: any;
      multiple: any;
      channels: any;
    }>,
    codigoTabela: number,
    authToken: string,
  ): Promise<typeof produtos> {
    // 1. Extrai os códigos dos produtos
    const codigosProdutos = produtos.map(p => parseInt(p.plu));

    // 2. Consulta os preços da tabela
    const precos = await this.getPrecosProdutosTabelaBatch(codigosProdutos, codigoTabela, authToken);

    // 3. Mapeia código -> preço
    const precoMap = new Map(precos.map(p => [p.codProd.toString(), p.valor]));

    // 4. Atualiza os produtos com os preços reais
    return produtos.map(prod => {
      const preco = precoMap.get(prod.plu) ?? 0;
      return {
        ...prod,
        prices: {
          ...prod.prices,
          price: preco,
        },
      };
    });
  }

  async getPrecosProdutosTabelaBatch(
    codigosProdutos: number[],
    codigoTabela: number,
    authToken: string,
  ): Promise<{ codProd: number; valor: number }[]> {
    const pagina = 1;

    const precos: { codProd: number; valor: number }[] = [];

    for (const codProd of codigosProdutos) {
      try {
        const url = `https://api.sankhya.com.br/v1/precos/produto/${codProd}/tabela/${codigoTabela}`;

        const response$ = this.http.get(url, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          params: { pagina },
        });

        const response = await firstValueFrom(response$);

        const produto = response.data?.produtos?.[0];

        precos.push({
          codProd,
          valor: produto?.valor ? parseFloat(produto.valor) : 0,
        });
      } catch (error: any) {
        console.error(`Erro ao buscar preço do produto ${codProd}:`, error.response?.data || error.message);
        precos.push({
          codProd,
          valor: 0,
        });
      }
    }

    return precos;
  }

  async getStockInLot(
    produtos: Array<{
      barcode: string;
      name: string;
      plu: string;
      active: boolean;
      inventory: { stock: number };
      details: {
        categorization: {
          department: any;
          category: any;
          subCategory: any;
        };
        brand: any;
        unit: any;
        volume: any;
        imageUrl: string | null;
        description: string | null;
        nearExpiration: boolean;
        family: any;
      };
      prices: {
        price: number;
        promotionPrice: number | null;
      };
      scalePrices: any;
      multiple: any;
      channels: any;
    }>,
    codLocal: number,
    authToken: string,
  ): Promise<typeof produtos> {
    const codigos = produtos.map(p => p.plu).filter(c => !isNaN(Number(c)));

    let page = 0;
    const pageSize = 50;
    let hasMore = true;
    const estoqueMap = new Map<string, number>();

    while (hasMore) {
      const payload = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Estoque',
            includePresentationFields: 'S',
            offsetPage: page.toString(),
            pageSize: pageSize.toString(),
            criteria: {
              expression: {
                $: `(${codigos.map(() => '(this.CODPROD = ? AND this.CODLOCAL = ?)').join(' OR ')})`,
              },
              parameter: codigos.flatMap(cod => [
                { $: cod.toString(), type: 'I' },
                { $: codLocal.toString(), type: 'I' },
              ]),
            },
            entity: {
              fieldset: {
                list: 'CODPROD,CODLOCAL,ESTOQUE',
              },
            },
          },
        },
      };

      try {
        const response = await firstValueFrom(
          this.http.post(this.queryUrl, payload, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
              appkey: this.appKey,
            },
          }),
        );

        const entidades = response.data?.responseBody?.entities?.entity;
        const lista = Array.isArray(entidades)
          ? entidades
          : entidades
            ? [entidades]
            : [];

        for (const item of lista) {
          const codProd = item.f0?.['$'];
          const estoque = parseFloat(item.f2?.['$'] ?? '0');
          if (codProd) {
            estoqueMap.set(codProd, estoque);
          }
        }

        hasMore = lista.length === pageSize;
        page++;
      } catch (error: any) {
        console.error('Erro ao buscar estoques em lote:', error.response?.data || error.message);
        throw new Error('Erro ao buscar estoques em lote');
      }
    }

    return produtos.map(produto => ({
      ...produto,
      inventory: {
        ...produto.inventory,
        stock: estoqueMap.get(produto.plu) ?? 0,
      },
    }));
  }

  //#endregion

  //#region Solicitações para Sistema Interno (Intgr)


  //#region Sistema de separação de pedidos

  async NotasPendentesDeSeparacao(authToken: string): Promise<
    { NUNOTA: number; CODPARC: number; NUMNOTA: number; STATUSNOTA: string; STATUSCONFERENCIA: string }[]
  > {
    if (!authToken) throw new Error('authToken é obrigatório');

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          tryJoinedFields: 'S',
          offsetPage: 0,
          criteria: { expression: { $: "this.CODTIPOPER = 601" } },
          entity: [
            { path: '', fieldset: { list: 'NUNOTA,CODPARC,NUMNOTA,STATUSNOTA,STATUSCONFERENCIA' } },
            { path: 'CabecalhoConferencia', fieldset: { list: 'STATUSCONFERENCIA' } },
          ],
        },
      },
    };

    const { data } = await firstValueFrom(
      this.http.post(
        'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        body,
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}`, appkey: this.appKey } }
      )
    );

    if (data?.status !== '1') {
      throw new Error(data?.statusMessage || JSON.stringify(data));
    }

    const entities = data?.responseBody?.entities;
    const entityBlocks = Array.isArray(entities?.entity) ? entities.entity : entities?.entity ? [entities.entity] : [];

    // pega o bloco do path raiz (CabecalhoNota)
    const rootBlock =
      entityBlocks.find((b: any) => String(b?.path ?? b?.name ?? '') === '') ??
      entityBlocks[0];

    if (!rootBlock) return [];

    const fieldsRaw = rootBlock?.metadata?.fields?.field ?? entities?.metadata?.fields?.field ?? [];
    const fieldsArr = Array.isArray(fieldsRaw) ? fieldsRaw : [fieldsRaw];
    const fieldIndex: Record<string, string> = {};
    fieldsArr.forEach((f: any, i: number) => {
      if (f?.name) fieldIndex[String(f.name)] = `f${i}`;
    });

    const recordsRaw = rootBlock?.records ?? rootBlock?.record ?? rootBlock?.entity ?? rootBlock?.entities ?? [];
    const records = Array.isArray(recordsRaw) ? recordsRaw : recordsRaw ? [recordsRaw] : [];

    const read = (row: any, fieldName: string) => {
      const key = fieldIndex[fieldName];
      if (!key) return '';
      const v = row?.[key];
      if (v && typeof v === 'object' && '$' in v) return v.$;
      return v ?? '';
    };

    return records.map((r: any) => ({
      NUNOTA: Number(read(r, 'NUNOTA') || 0),
      CODPARC: Number(read(r, 'CODPARC') || 0),
      NUMNOTA: Number(read(r, 'NUMNOTA') || 0),
      STATUSNOTA: String(read(r, 'STATUSNOTA') || ''),
      // tenta os dois jeitos mais comuns:
      STATUSCONFERENCIA: String(
        read(r, 'STATUSCONFERENCIA') ||
        read(r, 'CabecalhoConferencia_STATUSCONFERENCIA') ||
        ''
      ),
    }));
  }


  async notasPendentesConferencia(
    authToken: string,
  ): Promise<Array<{
    NUNOTA: number;
    CODPARC: number;
    NUMNOTA: number;
    STATUSNOTA: string;
    STATUSCONFERENCIA: any;
    STATUS: string | null;
  }>> {
    const getVal = (row: any, key: string, idxMap?: Record<string, string>) => {
      const direct = row?.[key];
      if (direct !== undefined) return direct?.$ ?? direct;
      const mappedKey = idxMap?.[key];
      if (mappedKey && row?.[mappedKey] !== undefined) {
        return row[mappedKey]?.$ ?? row[mappedKey];
      }
      return undefined;
    };

    const pickVal = (row: any, keys: string[], idxMap?: Record<string, string>) => {
      for (const k of keys) {
        const v = getVal(row, k, idxMap);
        if (v !== undefined && v !== null) return v;
      }
      return undefined;
    };

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          offsetPage: 0,
          recordCount: -1,
          criteria: {
            expression: { $: "this.CODTIPOPER = 601 and this.STATUSNOTA = 'A'" },
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'NUNOTA,CODPARC,NUMNOTA,STATUSNOTA,STATUSCONFERENCIA',
              },
            },
            {
              path: 'CabecalhoConferencia',
              fieldset: {
                list: 'STATUS',
              },
            },
          ],
        },
      },
    };

    const { data } = await firstValueFrom(
      this.http.post(
        'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
          },
        },
      ),
    );

    const entities = data?.responseBody?.entities;
    const fieldsMeta = entities?.metadata?.fields?.field ?? [];
    const idxMap: Record<string, string> = Object.fromEntries(
      (Array.isArray(fieldsMeta) ? fieldsMeta : [fieldsMeta]).map((f, i) => [f.name, `f${i}`]),
    );

    // fonte principal: dataSet.records (quando includePresentationFields = 'S')
    const records =
      data?.responseBody?.dataSet?.records ??
      data?.responseBody?.entities?.entity ??
      [];
    const list: any[] = Array.isArray(records) ? records : records ? [records] : [];

    if (list.length) {
      return list.map((r: any) => ({
        NUNOTA: Number(getVal(r, 'NUNOTA', idxMap) ?? 0),
        CODPARC: Number(getVal(r, 'CODPARC', idxMap) ?? 0),
        NUMNOTA: Number(getVal(r, 'NUMNOTA', idxMap) ?? 0),
        STATUSNOTA: String(getVal(r, 'STATUSNOTA', idxMap) ?? ''),
        STATUSCONFERENCIA: String(
          pickVal(
            r,
            ['STATUSCONFERENCIA', 'Conferencia_STATUSCONFERENCIA', 'CabecalhoConferencia_STATUSCONFERENCIA'],
            idxMap,
          ) ?? '',
        ),
        STATUS: pickVal(r, ['STATUS', 'CabecalhoConferencia_STATUS', 'Conferencia_STATUS'], idxMap) ?? null,
      }));
    }

    const raw = entities?.entity;
    const entitiesList: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return entitiesList.map((e) => ({
      NUNOTA: Number(getVal(e, 'NUNOTA', idxMap) ?? 0),
      CODPARC: Number(getVal(e, 'CODPARC', idxMap) ?? 0),
      NUMNOTA: Number(getVal(e, 'NUMNOTA', idxMap) ?? 0),
      STATUSNOTA: String(getVal(e, 'STATUSNOTA', idxMap) ?? ''),
      STATUSCONFERENCIA: String(
        pickVal(
          e,
          ['STATUSCONFERENCIA', 'Conferencia_STATUSCONFERENCIA', 'CabecalhoConferencia_STATUSCONFERENCIA'],
          idxMap,
        ) ?? '',
      ),
      STATUS: pickVal(e, ['STATUS', 'CabecalhoConferencia_STATUS', 'Conferencia_STATUS'], idxMap) ?? null,
    }));
  }


  //#endregion


  //#region Sistemas inventario

  //consulta o codgigo do produto pelo codigo de barra | 
  async getCodProduto(codBarra: number | string, authToken: string): Promise<number | null> {
    if (!authToken) throw new Error('authToken é obrigatório');

    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CodigoBarras',
          includePresentationFields: 'N',
          tryJoinedFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: { $: 'this.CODBARRA = ?' },
            // CODBARRA costuma ser string (pode ter zero à esquerda)
            parameter: [{ $: String(codBarra).padStart(12, '0'), type: 'S' }],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'CODPROD',
              },
            },
          ],
        },
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.post(this.queryUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
          },
        }),
      );

      // valida status do Sankhya (quando existe)
      const status = response?.data?.status;
      if (status && status !== '1') {
        const msg =
          response?.data?.statusMessage ||
          response?.data?.responseBody?.errorMessage ||
          JSON.stringify(response?.data);
        throw new Error(`Sankhya loadRecords falhou: ${msg}`);
      }

      const entities = response.data?.responseBody?.entities;
      if (!entities) return null;

      const raw = entities?.entity;
      const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
      if (list.length === 0) return null;

      // Como o fieldset é só 'CODPROD', ele normalmente vira f0
      const codProdRaw = list[0]?.f0?.$ ?? null;
      if (codProdRaw === null || codProdRaw === undefined || codProdRaw === '') return null;

      const codProd = Number(codProdRaw);
      return Number.isFinite(codProd) ? codProd : null;
    } catch (error: any) {
      console.error('Erro ao buscar CODPROD por CODBARRA:', error.response?.data || error.message);
      throw error;
    }
  }

  //consulta os codigos de barras pelo codigo do produto | pode retornar mais de um codigo de barras para o mesmo produto
  async getCodBarras(
    codProd: number,
    authToken: string,
  ): Promise<string[]> {
    if (!authToken) throw new Error('authToken é obrigatório');
    //if (!Number.isFinite(codProd)) throw new Error('codProd inválido');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      appkey: this.appKey,
    };

    const all: string[] = [];
    let offsetPage = 0;

    // helper: força array
    const asArray = <T>(x: T | T[] | null | undefined): T[] =>
      Array.isArray(x) ? x : x ? [x] : [];

    while (true) {
      const payload = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'CodigoBarras',
            includePresentationFields: 'N',
            tryJoinedFields: 'S',
            offsetPage: String(offsetPage), // Sankhya costuma aceitar string
            criteria: {
              expression: { $: 'this.CODPROD = ?' },
              parameter: [{ $: String(codProd), type: 'I' }],
            },
            entity: [
              {
                path: '',
                fieldset: { list: 'CODBARRA' },
              },
            ],
          },
        },
      };

      const resp = await firstValueFrom(
        this.http.post(this.queryUrl, payload, { headers }),
      );

      if (resp?.data?.status && resp.data.status !== '1') {
        const msg =
          resp?.data?.statusMessage ||
          resp?.data?.responseBody?.errorMessage ||
          JSON.stringify(resp?.data);
        throw new Error(`Falha no loadRecords (CodigoBarras): ${msg}`);
      }

      const entities = resp.data?.responseBody?.entities;
      const fields = asArray(entities?.metadata?.fields?.field);

      // mapeia nome -> f#
      const fieldMap: Record<string, string> = {};
      fields.forEach((f: any, i: number) => {
        if (f?.name) fieldMap[String(f.name)] = `f${i}`;
      });

      const rows = asArray<any>(entities?.entity);
      if (rows.length === 0) break;

      const key = fieldMap['CODBARRA'] ?? 'f0';

      for (const r of rows) {
        const v = r?.[key]?.$ ?? null;
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          all.push(String(v));
        }
      }

      // próxima página
      offsetPage += 1;
    }

    return all;
  }

  //retirba a localização do produto pelo codigo do produto
  async getProdutoLoc(codProd: number, authToken: string): Promise<Record<string, any> | null> {
    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Produto',
          includePresentationFields: 'N',
          tryJoinedFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: { $: 'this.CODPROD = ?' },
            parameter: [{ $: codProd.toString(), type: 'I' }],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'CODPROD,DESCRPROD,MARCA,CARACTERISTICAS,CODVOL,CODGRUPOPROD,LOCALIZACAO,REFFORN,AD_LOCALIZACAO,AD_QTDMAX,ATIVO',
              },
            },
            {
              path: 'GrupoProduto',
              fieldset: { list: 'DESCRGRUPOPROD' },
            },
          ],
        },
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.post(this.queryUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
          },
        }),
      );

      const entities = response.data?.responseBody?.entities;
      if (!entities) return null;

      const fields = entities?.metadata?.fields?.field;
      const arrFields = Array.isArray(fields) ? fields : fields ? [fields] : [];

      // pega entidade (só uma neste caso)
      const raw = entities?.entity;
      const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
      if (list.length === 0) return null;

      const e = list[0];

      // monta objeto usando os nomes do metadata
      const result: Record<string, any> = {};
      arrFields.forEach((f: any, i: number) => {
        const key = f.name; // nome oficial do campo
        result[key] = e?.[`f${i}`]?.$ ?? null;
      });

      return result;
    } catch (error: any) {
      console.error('Erro ao buscar produto:', error.response?.data || error.message);
      throw error;
    }
  }


  //adiciona um novo codigo de barras para o produto
  async criarCodigoBarras(codBarra: number, codProd: number, authToken: string) {

    console.log("sankhyaservice/codBarra: " + codBarra)
    console.log("sankhyaservice/codProd: " + codProd)
    if (!authToken?.trim()) throw new Error('authToken é obrigatório');
    //if (!Number.isFinite(codBarra))  throw new Error('codBarra é obrigatório');
    if (!Number.isFinite(codProd)) throw new Error('codProd inválido');

    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'CodigoBarras',
        standAlone: false,
        fields: ['CODBARRA', 'CODPROD'],
        records: [
          {
            // normalmente CODBARRA é a PK
            pk: { CODBARRA: codBarra },
            // valores na mesma ordem de "fields"
            values: {
              0: codBarra,
              1: codProd,
            },
          },
        ],
      },
    };

    const { data } = await firstValueFrom(
      this.http.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          appkey: this.appKey,
        },
      }),
    );

    if (data?.status !== '1') {
      const msg =
        data?.statusMessage ||
        data?.responseBody?.errorMessage ||
        JSON.stringify(data);
      throw new Error(`Falha ao criar CodigoBarras: ${msg}`);
    }

    return data;
  }


  //atualiza a localização do produto
  async updateLocation(codProd: number, localizacao: string, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'Produto',
        standAlone: false,
        fields: ['CODPROD', 'LOCALIZACAO'],
        records: [
          {
            pk: { CODPROD: codProd },
            values: { 1: localizacao }, // equivalente ao { 1: "S" }
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }

  //atualiza a localização 2(campo AD_LOCALIZACAO) do produto
  async updateLocation2(codProd: number, localizacao: string, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'Produto',
        standAlone: false,
        fields: ['CODPROD', 'AD_LOCALIZACAO'],
        records: [
          {
            pk: { CODPROD: codProd },
            values: { 1: localizacao }, // equivalente ao { 1: "S" }
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }

  //atualiza a quantidade maxima (campo AD_QTDMAX) do produto
  async updateQtdMax(codProd: number, quantidade: number, authToken: string) {
    console.log("SANKHYA SERVICE{")
    console.log(codProd)
    console.log(quantidade)
    console.log("}")
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'Produto',
        standAlone: false,
        fields: ['CODPROD', 'AD_QTDMAX'],
        records: [
          {
            pk: { CODPROD: codProd },
            values: { 1: quantidade }, // equivalente ao { 1: "S" }
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }

  async getEstoqueFront(codProd: number, bearerToken: string): Promise<EstoqueLinha[]> {
    const payload = {
      requestBody: {
        dataSet: {
          rootEntity: 'Estoque',
          includePresentationFields: 'S',
          // Se quiser habilitar joins para pegar campos apresentados como descrições:
          // tryJoinedFields: 'true',
          offsetPage: '0',
          recordCount: '100',
          criteria: {
            expression: { $: 'this.CODPROD = ? and this.CODPARC = 0' },
            parameter: [{ $: String(codProd), type: 'I' }],
          },
          entity: {
            fieldset: {
              // Dica: para também trazer a descrição do local, use:
              // list: 'CODLOCAL,LocalFinanceiro_DESCRLOCAL,ESTOQUE,RESERVADO'
              list: 'CODLOCAL,ESTOQUE,RESERVADO',
            },
          },
        },
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
      // appkey: this.appKey, // se sua instância exigir
    };

    const { data } = await firstValueFrom(
      this.http.post(this.queryUrl, payload, { headers }),
    );

    const entities = data?.responseBody?.entities;
    if (!entities) return [];

    // metadata -> nomes dos campos
    const fieldsMeta = entities?.metadata?.fields?.field;
    const fieldsArr = Array.isArray(fieldsMeta) ? fieldsMeta : fieldsMeta ? [fieldsMeta] : [];

    // linhas -> podem vir como objeto único
    const raw = entities?.entity;
    const rows: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const resultado: EstoqueLinha[] = rows.map((row: any) => {
      const obj: Record<string, any> = {};

      fieldsArr.forEach((f: any, i: number) => {
        const nome = f.name as string;   // ex.: 'CODLOCAL', 'ESTOQUE', 'RESERVADO', ...
        obj[nome] = row?.[`f${i}`]?.$ ?? null;
      });

      // normalizações numéricas
      const CODLOCAL = obj.CODLOCAL != null ? Number(obj.CODLOCAL) : null;
      const ESTOQUE = obj.ESTOQUE != null ? Number(obj.ESTOQUE) : 0;
      const RESERVADO = obj.RESERVADO != null ? Number(obj.RESERVADO) : 0;

      return {
        ...obj, // mantém eventuais campos de apresentação
        CODLOCAL,
        ESTOQUE,
        RESERVADO,
        DISPONIVEL: ESTOQUE - RESERVADO,
      } as EstoqueLinha;
    });

    return resultado;
  }

  async getNotasCanceladasPorData(date: string, token: string) {
    // espera "30/10/2025" (dd/MM/yyyy)
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'NotaCancelada',
          includePresentationFields: 'N',
          metadata: 'S',
          offsetPage: '0',
          pageSize: '50', // pode aumentar se quiser mais notas
          criteria: {
            // no Sankhya precisa formatar como TO_DATE
            expression: {
              $: "this.DTNEG = TO_DATE(?, 'DD/MM/YYYY')",
            },
            parameter: [{ $: date, type: 'S' }],
          },
          entity: {
            fieldset: {
              list: 'NUNOTA,DTNEG,VLRNOTA,AD_INFIDELIMAX,DTCANC',
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(
      this.http.post(url, body, { headers }),
    );

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.statusMessage ||
        resp?.data?.responseBody?.errorMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha ao buscar notas canceladas: ${msg}`);
    }

    const entities = resp.data?.responseBody?.entities;
    if (!entities) return [];

    // mapeia metadata -> f0, f1, ...
    const fields = entities?.metadata?.fields?.field;
    const arrFields = Array.isArray(fields) ? fields : fields ? [fields] : [];
    const idxByName: Record<string, string> = Object.fromEntries(
      arrFields.map((f: any, i: number) => [f.name, `f${i}`]),
    );

    const raw = entities?.entity;
    const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return rows.map((row: any) => {
      const get = (name: string) => {
        const key = idxByName[name];
        return key ? row?.[key]?.$ ?? null : null;
      };

      return {
        nunota: Number(get('NUNOTA')),
        dtneg: get('DTNEG'),
        vlrnota: Number(get('VLRNOTA')),
        ad_infidelimax: get('AD_INFIDELIMAX'),
        dtcanc: get('DTCANC'),
      };
    });
  }

  //inclui um item em uma nota de venda | metodo desatualizado, usar incluirAjustesPositivo ou incluirAjustesNegativo
  async incluirAjusteNegativo(diference: number, codProd: number, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    // Mesmos headers do cURL (sem "Bearer")
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // Corpo igual ao cURL, alterando apenas CODPROD e QTDNEG
    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '317' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
            OBSERVACAO: { $: 'Ajuste realizado por API p/ Ajuste de inventário' },
            CODUSUINC: { $: '81' }
          },
          itens: {
            INFORMARPRECO: 'False',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: `${codProd}` },
                QTDNEG: { $: `${diference}` }
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data; // traz status, statusMessage, transactionId
  }

  //inclui um item em uma nota de compra | metodo desatualizado, usar incluirAjustesPositivo ou incluirAjustesNegativo
  async incluirAjustePositivo(diference: number, codProd: number, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    // Mesmos headers do cURL (sem "Bearer")
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // Corpo igual ao cURL, alterando apenas CODPROD e QTDNEG
    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '270' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'O' },
            OBSERVACAO: { $: 'Ajuste realizado por API p/ Ajuste de inventário' },
            CODUSUINC: { $: '81' }
          },
          itens: {
            INFORMARPRECO: 'False',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: `${codProd}` },
                QTDNEG: { $: `${diference}` }
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data; // traz status, statusMessage, transactionId
  }


  async incluirAjustesPositivo(itens: AjusteItem[], observacao: string, authToken: string): Promise<IncluirAjustesResult> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const { validos, falhas } = await this.preValidarItensAjustePositivo(itens, authToken);

    if (validos.length === 0) {
      throw new HttpException(
        `Nenhum item passou na pré-validação. Falhas: ${falhas.slice(0, 5).map((f) => f.codProd).join(', ')}...`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // ✅ precisa ter NUNOTA no item (PK)
    const buildItemsXml = (subset: { codProd: number; diference: number }[]) =>
      subset.map((i) => ({
        NUNOTA: {},
        CODPROD: { $: String(i.codProd) },
        QTDNEG: { $: String(i.diference) },
      }));

    const isHtmlResponse = (x: any) => typeof x === 'string' && /<html[\s>]/i.test(x);

    const extractMsg = (dataOrErr: any): string => {
      const d = dataOrErr?.response?.data ?? dataOrErr;
      if (isHtmlResponse(d)) return d;
      return (
        d?.statusMessage ||
        d?.message ||
        d?.tsError?.message ||
        d?.tsError?.tsErrorMessage ||
        dataOrErr?.message ||
        'Erro desconhecido.'
      );
    };

    const isTransient = (msg: string, status?: number) => {
      const m = (msg || '').toLowerCase();
      return (
        m.includes('socket hang up') ||
        m.includes('timeout') ||
        m.includes('econnreset') ||
        [502, 503, 504].includes(status ?? 0) ||
        (m.includes('<html') && m.includes('internal server error')) ||
        m.includes('internal server error')
      );
    };

    const extractBlockedCodProds = (msg: string): number[] => {
      if (!msg) return [];
      const cods: number[] = [];
      for (const m of msg.matchAll(/Produto:\s*(\d+)/gi)) cods.push(Number(m[1]));
      for (const m of msg.matchAll(/CODPROD\D{0,40}(\d{1,10})/gi)) cods.push(Number(m[1]));
      return [...new Set(cods.filter((n) => Number.isFinite(n)))];
    };

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const maxRetries = 3;

    let remaining = [...validos];

    const maxRemocoes = Math.min(500, validos.length);
    let remocoes = 0;

    const MAX_PAYLOAD_BYTES = 9_500_000;

    // ====== helpers: probes + bissecção segura ======

    const buildBodyFor = (subset: { codProd: number; diference: number }[]) => ({
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '270' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'O' },
            OBSERVACAO: { $: observacao },
            CODUSUINC: { $: '81' },
          },
          itens: {
            INFORMARPRECO: 'False',
            item: buildItemsXml(subset),
          },
        },
      },
    });

    type TryKind = 'ok' | 'status0' | 'html500' | 'other';
    const trySubset = async (subset: { codProd: number; diference: number }[]): Promise<TryKind> => {
      const body = buildBodyFor(subset);

      try {
        const resp = await firstValueFrom(
          this.http.post(url, body, {
            headers,
            timeout: 360_000,
            maxBodyLength: Infinity as any,
            maxContentLength: Infinity as any,
          } as any),
        );

        const data = resp?.data;
        if (isHtmlResponse(data)) return 'html500';
        if (data?.status === '0') return 'status0';
        return 'ok';
      } catch (err: any) {
        const status = err?.response?.status;
        const data = err?.response?.data;
        const msg = extractMsg(err);

        if (status === 500 && (isHtmlResponse(data) || isHtmlResponse(msg))) return 'html500';
        return 'other';
      }
    };

    // Checagem para evitar remover tudo:
    // só tenta bissecção se um subset pequeno NÃO retorna html500 (gateway “saudável”)
    const gatewaySeemsHealthyForSmallSubset = async (base: { codProd: number; diference: number }[]) => {
      const sampleSize = Math.min(30, base.length);
      const sample = base.slice(0, sampleSize);
      const kind = await trySubset(sample);
      console.log(`[Sankhya probe] sampleSize=${sampleSize} kind=${kind}`);
      return kind !== 'html500'; // se sample também dá html500, não é item-específico
    };

    const findCrasherItem = async (subset: { codProd: number; diference: number }[]) => {
      let current = subset;

      while (current.length > 1) {
        const mid = Math.ceil(current.length / 2);
        const a = current.slice(0, mid);
        const b = current.slice(mid);

        const ra = await trySubset(a);
        const rb = await trySubset(b);

        // só reduz se EXATAMENTE um lado der html500
        if (ra === 'html500' && rb !== 'html500') {
          current = a;
          continue;
        }
        if (rb === 'html500' && ra !== 'html500') {
          current = b;
          continue;
        }

        // se ambos dão html500 -> instabilidade/serviço quebrado (não dá pra isolar item único com segurança)
        // se nenhum dá html500 -> então o 500 depende de combinação/volume
        return null;
      }

      return current[0];
    };

    // ============== loop principal ==============

    while (remaining.length > 0) {
      const body = buildBodyFor(remaining);

      const payloadStr = JSON.stringify(body);
      const payloadBytes = Buffer.byteLength(payloadStr, 'utf8');

      console.log(
        `[Sankhya incluirNota] itens=${remaining.length} payloadBytes=${payloadBytes} (~KB=${Math.round(
          payloadBytes / 1024,
        )}) falhasAcumuladas=${falhas.length} remocoes=${remocoes}`,
      );

      if (payloadBytes > MAX_PAYLOAD_BYTES) {
        throw new HttpException(
          `Payload muito grande para incluirNota: ${(payloadBytes / 1024 / 1024).toFixed(2)} MB ` +
          `com ${remaining.length} itens. Limite configurado: ${(MAX_PAYLOAD_BYTES / 1024 / 1024).toFixed(2)} MB.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      let removedSomething = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[Sankhya incluirNota] attempt=${attempt}/${maxRetries} itens=${remaining.length}`);

          const resp = await firstValueFrom(
            this.http.post(url, body, {
              headers,
              timeout: 360_000,
              maxBodyLength: Infinity as any,
              maxContentLength: Infinity as any,
            } as any),
          );

          const data = resp?.data;
          console.log(`[Sankhya incluirNota] respType=${typeof data}`);

          if (isHtmlResponse(data)) {
            console.log('[Sankhya incluirNota] resposta HTML recebida, tratando como erro 500 (gateway)');
            throw { response: { status: 500, data }, code: 'HTML_500' };
          }

          if (data?.status === '0') {
            const msg = extractMsg(data);
            console.log(`[Sankhya incluirNota] status=0 msg=${String(msg).slice(0, 500)}`);

            // não permitido para compra -> remover e tentar de novo
            if ((msg || '').toLowerCase().includes('não está permitido para compra')) {
              const blocked = extractBlockedCodProds(msg);
              console.log(`[Sankhya incluirNota] bloqueados=${JSON.stringify(blocked)}`);

              if (blocked.length === 0) {
                return { ok: false, nota: null, falhas, lancados: [] as AjusteLancado[], erro: msg };
              }

              for (const cod of blocked) {
                let idx = remaining.findIndex((x) => x.codProd === cod);
                while (idx >= 0) {
                  const [bad] = remaining.splice(idx, 1);
                  falhas.push({ ...bad, motivo: msg });
                  remocoes++;
                  removedSomething = true;

                  if (remocoes > maxRemocoes) {
                    return {
                      ok: false,
                      nota: null,
                      falhas,
                      lancados: [] as AjusteLancado[],
                      erro: `Muitas remoções automáticas (${maxRemocoes}). Último erro: ${msg}`,
                    };
                  }
                  idx = remaining.findIndex((x) => x.codProd === cod);
                }
              }

              break; // volta pro while com lote menor
            }

            return { ok: false, nota: null, falhas, lancados: [] as AjusteLancado[], erro: msg };
          }

          console.log(`[Sankhya incluirNota] sucesso! itensLancados=${remaining.length}`);
          return { ok: true, nota: data, falhas, lancados: remaining };
        } catch (err: any) {
          const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
          const msg = extractMsg(err);

          console.log(
            `[Sankhya incluirNota] erro attempt=${attempt}/${maxRetries} status=${status} code=${err?.code ?? 'N/A'} msg=${String(
              msg,
            ).slice(0, 500)}`,
          );

          if (isTransient(msg, status) && attempt < maxRetries) {
            await sleep(500 * attempt);
            continue;
          }

          // ===== HTML_500 persistente: só isola se gateway responder para subset pequeno =====
          if (isHtmlResponse(msg) || err?.code === 'HTML_500' || status === 500) {
            const okSmall = await gatewaySeemsHealthyForSmallSubset(remaining);

            if (!okSmall) {
              // 🚫 NÃO remove nada — isso evita "remover todos os itens"
              return {
                ok: false,
                nota: null,
                falhas,
                lancados: [],
                erro:
                  'Gateway Sankhya está retornando 500 (HTML) inclusive para subsets pequenos. ' +
                  'Parece instabilidade/erro do serviço, não item específico. Nenhum item foi removido automaticamente.',
              };
            }

            console.log('[Sankhya incluirNota] HTML_500 persistente com gateway OK em subset pequeno. Tentando isolar item causador...');
            const crasher = await findCrasherItem(remaining);

            if (!crasher) {
              return {
                ok: false,
                nota: null,
                falhas,
                lancados: [],
                erro:
                  'Erro 500 (HTML) persistente e não foi possível isolar um item único (pode ser combinação/volume). ' +
                  'Nenhum item foi removido automaticamente.',
              };
            }

            const idx = remaining.findIndex((x) => x.codProd === crasher.codProd);
            if (idx >= 0) {
              const [bad] = remaining.splice(idx, 1);
              falhas.push({ ...bad, motivo: 'Gateway 500 (HTML) — item isolado automaticamente (remoção segura)' });
              remocoes++;
              removedSomething = true;

              console.log(`[Sankhya incluirNota] removido crasher CODPROD=${bad.codProd}. Restante=${remaining.length}`);

              if (remocoes > maxRemocoes) {
                return {
                  ok: false,
                  nota: null,
                  falhas,
                  lancados: [],
                  erro: `Muitas remoções automáticas (${maxRemocoes}). Interrompido para segurança.`,
                };
              }

              break; // volta pro while com lote menor
            }
          }

          // erro não transitório e não HTML_500 isolável
          throw new HttpException(
            `Erro ao incluir nota (1 nota apenas). Itens no lote: ${remaining.length}. ` +
            `Falhas acumuladas: ${falhas.length}. Detalhe: ${typeof msg === 'string' ? msg : String(msg)}`,
            status,
          );
        }
      }

      if (!removedSomething) break;
    }

    return {
      ok: false,
      nota: null,
      falhas,
      lancados: [],
      erro: 'Não foi possível gerar a nota: erro persistente ou nenhum item removível identificado com segurança.',
    };
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  private async executeQuery(authToken: string, sql: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: {
        sql,
      },
    };

    const resp = await firstValueFrom(
      this.http.post(url, body, {
        headers,
        timeout: 60_000,
        maxBodyLength: Infinity as any,
        maxContentLength: Infinity as any,
      } as any),
    );

    return resp?.data;
  }

  private normalizeRows(data: any): any[] {
    const rb = data?.responseBody ?? data;

    // 1. Verifica se é o formato padrão do Sankhya (DbExplorerSP.executeQuery)
    if (rb?.fieldsMetadata && Array.isArray(rb?.rows)) {
      // Pega os nomes das colunas e garante que fiquem em maiúsculo
      const cols = rb.fieldsMetadata.map((f: any) => String(f.name).toUpperCase());

      // Mapeia os valores para as colunas correspondentes
      return rb.rows.map((rowArr: any[]) => {
        const obj: any = {};
        cols.forEach((colName, index) => {
          obj[colName] = rowArr[index] ?? null;
        });
        return obj;
      });
    }

    // 2. Fallback antigo (caso use algum outro endpoint que traga um formato diferente)
    const rows = rb?.rows ?? rb?.result ?? rb?.data ?? rb?.dados ?? rb?.registros ?? [];
    const arr = Array.isArray(rows) ? rows : rows ? [rows] : [];

    if (arr.length === 1 && arr[0] && Array.isArray(arr[0].columns) && Array.isArray(arr[0].rows)) {
      const cols = arr[0].columns.map((c: any) => String(c?.name ?? c ?? '').toUpperCase());
      return arr[0].rows.map((line: any[]) => {
        const obj: any = {};
        cols.forEach((col: string, i: number) => (obj[col] = line?.[i] ?? null));
        return obj;
      });
    }

    return arr.map((r: any) => {
      if (!r || typeof r !== 'object') return {};
      const out: any = {};
      for (const [k, v] of Object.entries(r)) {
        if (v && typeof v === 'object' && '$' in (v as any)) out[k.toUpperCase()] = (v as any).$;
        else out[k.toUpperCase()] = v;
      }
      return out;
    });
  }

  /**
   * Pré-valida itens sem criar nota (1 nota final apenas).
   * - remove produtos inexistentes/inativos
   * - remove produtos "não permitidos para compra" (regra ajustável)
   */
  async preValidarItensAjustePositivo(itens: AjusteItem[], authToken: string): Promise<PreValidacaoResult> {
    const itensValidos = (itens ?? [])
      .filter((i) => i?.codProd && i?.diference != null)
      .map((i) => ({ codProd: Number(i.codProd), diference: Number(i.diference) }))
      .filter((i) => Number.isFinite(i.codProd) && Number.isFinite(i.diference) && i.diference > 0);

    if (itensValidos.length === 0) {
      return { validos: [], falhas: [{ codProd: 0, diference: 0, motivo: 'Nenhum item válido recebido.' }] };
    }

    const falhas: PreValidacaoFalha[] = [];
    const mapaQtd = new Map<number, number>();
    for (const it of itensValidos) mapaQtd.set(it.codProd, it.diference);

    const cods = [...new Set(itensValidos.map((x) => x.codProd))];
    const blocks = this.chunkArray(cods, 400);

    const aprovados = new Set<number>();

    for (const block of blocks) {
      const inList = block.join(',');

      // ✅ agora só importa ATIVO
      const sql = `
      SELECT
        PRO.CODPROD,
        PRO.DESCRPROD,
        PRO.ATIVO
      FROM TGFPRO PRO
      WHERE PRO.CODPROD IN (${inList})
    `;

      const data = await this.executeQuery(authToken, sql);

      const rows: any[] =
        data?.responseBody?.rows ??
        data?.responseBody?.result ??
        data?.responseBody?.data ??
        data?.responseBody ??
        [];

      const returned = new Set<number>();

      for (const r of rows) {
        const codProd = Number(r.CODPROD ?? r.codprod ?? r[0]);
        const descr = String(r.DESCRPROD ?? r.descrprod ?? r[1] ?? '');
        const ativo = String(r.ATIVO ?? r.ativo ?? r[2] ?? '').toUpperCase();

        if (!Number.isFinite(codProd)) continue;
        returned.add(codProd);

        // ✅ regra pedida: só aceita ATIVO='S'
        if (ativo !== 'S') {
          falhas.push({
            codProd,
            diference: mapaQtd.get(codProd) ?? 0,
            motivo: `Produto inativo (ATIVO=${ativo || 'N/A'}): ${codProd} - ${descr}`,
          });
          continue;
        }

        aprovados.add(codProd);
      }

      // produtos que não voltaram na query => inexistentes
      for (const cod of block) {
        if (!returned.has(cod)) {
          falhas.push({
            codProd: cod,
            diference: mapaQtd.get(cod) ?? 0,
            motivo: `Produto inexistente no Sankhya: ${cod}`,
          });
        }
      }
    }

    const validos = itensValidos.filter((x) => aprovados.has(x.codProd));

    return { validos, falhas };
  }


  //inclui varios itens em uma nota de compra
  async incluirAjustesPositivoN(itens: AjusteItem[], authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const itensValidos = (itens ?? [])
      .filter((i) => i?.codProd && i?.diference != null)
      .map((i) => ({ codProd: Number(i.codProd), diference: Number(i.diference) }))
      .filter((i) => Number.isFinite(i.codProd) && Number.isFinite(i.diference) && i.diference > 0);

    if (itensValidos.length === 0) {
      throw new HttpException('Nenhum item válido para incluir na nota.', HttpStatus.BAD_REQUEST);
    }

    const buildItemsXml = (subset: { codProd: number; diference: number }[]) =>
      subset.map((i) => ({
        NUNOTA: {},
        SEQUENCIA: {},
        CODPROD: { $: String(i.codProd) },
        QTDNEG: { $: String(i.diference) },
      }));

    const buildBody = (subset: { codProd: number; diference: number }[]) => ({
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '270' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'O' },
            OBSERVACAO: { $: 'Ajuste realizado por API' },
            CODUSUINC: { $: '81' },
          },
          itens: { INFORMARPRECO: 'False', item: buildItemsXml(subset) },
        },
      },
    });

    const isHtml = (x: any) => typeof x === 'string' && /<html[\s>]/i.test(x);

    const extractMsg = (dataOrErr: any): string => {
      const d = dataOrErr?.response?.data ?? dataOrErr;
      if (isHtml(d)) return d;
      return (
        d?.statusMessage ||
        d?.message ||
        d?.tsError?.message ||
        d?.tsError?.tsErrorMessage ||
        dataOrErr?.message ||
        'Erro desconhecido retornado pelo Sankhya.'
      );
    };

    const findCodProdInMessage = (msg: string): number | null => {
      const m =
        msg.match(/CODPROD\D+(\d+)/i) ||
        msg.match(/PRODUTO\D+(\d+)/i) ||
        msg.match(/\b(\d{3,})\b/);
      if (!m) return null;
      const n = Number(m[1]);
      return Number.isFinite(n) ? n : null;
    };

    const isTransient = (err: any, msg: string, status?: number) => {
      const m = (msg || '').toLowerCase();
      const code = String(err?.code || '').toLowerCase();
      return (
        m.includes('socket hang up') ||
        m.includes('econnreset') ||
        m.includes('timeout') ||
        code.includes('econnreset') ||
        code.includes('socket') ||
        [502, 503, 504].includes(status ?? 0) ||
        (m.includes('<html') && m.includes('internal server error')) ||
        m.includes('internal server error')
      );
    };

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const falhas: Array<{ codProd: number; diference: number; motivo: string }> = [];
    let remaining = [...itensValidos];

    // janela inicial (pode começar grande, mas você pode setar 300/500 se quiser)
    let windowSize = remaining.length;

    const MAX_HTTP_RETRIES = 3;

    // ✅ anti-loop: se o mesmo estado repetir, forçamos progresso removendo 1 item
    const stateRepeats = new Map<string, number>();
    const MAX_REPEAT_SAME_STATE = 5;

    // ✅ hard cap: nunca passa disso
    const HARD_MAX_STEPS = Math.max(5000, itensValidos.length * 20);
    let steps = 0;

    while (remaining.length > 0) {
      if (++steps > HARD_MAX_STEPS) {
        // corta de forma segura
        falhas.push({
          ...remaining[0],
          motivo: 'Abortado por segurança (HARD_MAX_STEPS) para evitar loop.',
        });
        remaining.shift();
        windowSize = Math.min(windowSize, remaining.length);
        continue;
      }

      windowSize = Math.max(1, Math.min(windowSize, remaining.length));
      const firstCod = remaining[0]?.codProd ?? 0;

      // assinatura de estado (se repetir, estamos em ciclo)
      const stateKey = `${remaining.length}|${windowSize}|${firstCod}`;
      const rep = (stateRepeats.get(stateKey) ?? 0) + 1;
      stateRepeats.set(stateKey, rep);

      if (rep >= MAX_REPEAT_SAME_STATE) {
        // ✅ progresso forçado
        const forced = remaining.shift()!;
        falhas.push({
          ...forced,
          motivo: `Removido por segurança: repetição do mesmo estado (${stateKey}) indicando loop.`,
        });
        windowSize = Math.min(windowSize, remaining.length);
        continue;
      }

      const subset = remaining.slice(0, windowSize);
      const body = buildBody(subset);

      let progressedThisRound = false;

      for (let attempt = 1; attempt <= MAX_HTTP_RETRIES; attempt++) {
        try {
          const resp = await firstValueFrom(
            this.http.post(url, body, {
              headers,
              timeout: 360_000,
              maxBodyLength: Infinity as any,
              maxContentLength: Infinity as any,
            } as any),
          );

          const data = resp?.data;

          // HTML 500 vindo no body
          if (isHtml(data)) {
            throw { response: { status: 500, data }, code: 'HTML_500' };
          }

          // regra de negócio
          if (data?.status === '0') {
            const msg = extractMsg(data);
            const badCod = findCodProdInMessage(msg);

            if (badCod) {
              const idx = remaining.findIndex((x) => x.codProd === badCod);
              if (idx >= 0) {
                const [badItem] = remaining.splice(idx, 1);
                falhas.push({ ...badItem, motivo: msg });

                // ✅ progresso real
                progressedThisRound = true;

                // tenta novamente com lote grande
                windowSize = remaining.length;
                break;
              }
            }

            // sem CODPROD -> reduz janela (não remove tudo)
            windowSize = Math.max(1, Math.floor(windowSize / 2));
            progressedThisRound = true;
            break;
          }

          // ✅ sucesso: nota criada com subset atual
          return { nota: data, falhas, lancados: subset };
        } catch (err: any) {
          const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
          const msg = extractMsg(err);

          // se trouxe CODPROD, remove item e segue
          const badCod = findCodProdInMessage(msg);
          if (badCod) {
            const idx = remaining.findIndex((x) => x.codProd === badCod);
            if (idx >= 0) {
              const [badItem] = remaining.splice(idx, 1);
              falhas.push({ ...badItem, motivo: msg });
              windowSize = remaining.length;
              progressedThisRound = true;
              break;
            }
          }

          // transitório: retry/backoff
          if (isTransient(err, msg, status) && attempt < MAX_HTTP_RETRIES) {
            await sleep(600 * attempt);
            continue;
          }

          // transitório persistente: reduz janela; se já for 1, remove 1 item (progresso garantido)
          if (isTransient(err, msg, status)) {
            if (windowSize > 1) {
              windowSize = Math.max(1, Math.floor(windowSize / 2));
              progressedThisRound = true;
              break;
            }

            // windowSize==1: remove o primeiro item e segue
            const doomed = remaining.shift()!;
            falhas.push({ ...doomed, motivo: msg });
            windowSize = Math.min(windowSize, remaining.length);
            progressedThisRound = true;
            break;
          }

          // não transitório e sem CODPROD => fatal
          throw new HttpException(`ERRO NA REQUISIÇÃO: ${msg}`, status);
        }
      }

      // ✅ fallback extra: se por algum motivo nada mudou, força progresso removendo 1 item
      if (!progressedThisRound) {
        const forced = remaining.shift()!;
        falhas.push({
          ...forced,
          motivo: 'Removido por fallback (nenhum progresso detectado na rodada).',
        });
        windowSize = Math.min(windowSize, remaining.length);
      }
    }

    return { nota: null, falhas, lancados: [] };
  }




  //inclui varios itens em uma nota de venda
  async incluirAjustesNegativo(itens: AjusteItem[], observacao: string, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const itensValidos = (itens ?? [])
      .filter((i) => i?.codProd && i?.diference != null)
      .map((i) => ({
        codProd: Number(i.codProd),
        diference: Number(i.diference),
      }))
      .filter((i) => Number.isFinite(i.codProd) && Number.isFinite(i.diference) && i.diference < 0);

    if (itensValidos.length === 0) {
      throw new HttpException('Nenhum item válido para incluir na nota.', HttpStatus.BAD_REQUEST);
    }

    const buildItemsXml = (subset: { codProd: number; diference: number }[]) =>
      subset.map((i) => ({
        NUNOTA: {},
        SEQUENCIA: {},
        CODPROD: { $: String(i.codProd) },
        // negativo -> manda valor positivo para QTDNEG
        QTDNEG: { $: String(Math.abs(i.diference)) },
      }));

    const buildBody = (subset: { codProd: number; diference: number }[]) => ({
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '317' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
            OBSERVACAO: { $: observacao },
            CODUSUINC: { $: '81' },
          },
          itens: {
            INFORMARPRECO: 'False',
            item: buildItemsXml(subset),
          },
        },
      },
    });

    const extractSankhyaMessage = (dataOrErr: any): string => {
      const d = dataOrErr?.response?.data ?? dataOrErr;
      return (
        d?.statusMessage ||
        d?.message ||
        d?.tsError?.message ||
        d?.tsError?.tsErrorMessage ||
        dataOrErr?.message ||
        'Erro desconhecido retornado pelo Sankhya.'
      );
    };

    const findCodProdInMessage = (msg: string): number | null => {
      const m =
        msg.match(/CODPROD\D+(\d+)/i) ||
        msg.match(/PRODUTO\D+(\d+)/i) ||
        msg.match(/C[ÓO]D\.?\s*PROD\D+(\d+)/i) ||
        msg.match(/\b(\d{3,})\b/);
      if (!m) return null;
      const n = Number(m[1]);
      return Number.isFinite(n) ? n : null;
    };

    const falhas: Array<{ codProd: number; diference: number; motivo: string }> = [];
    let remaining = [...itensValidos];

    while (remaining.length > 0) {
      const body = buildBody(remaining);

      try {
        const resp = await firstValueFrom(this.http.post(url, body, { headers }));
        const data = resp?.data;

        // Erro “aplicacional” (200, mas status=0)
        if (data?.status === '0') {
          const msg = extractSankhyaMessage(data);
          const badCod = findCodProdInMessage(msg);

          if (!badCod) {
            throw new HttpException(
              `ERRO NO LANÇAMENTO DA NOTA: ${msg}. Não foi possível identificar o CODPROD causador para continuar.`,
              HttpStatus.BAD_REQUEST,
            );
          }

          const idx = remaining.findIndex((x) => x.codProd === badCod);
          if (idx < 0) {
            throw new HttpException(
              `ERRO NO LANÇAMENTO DA NOTA: ${msg}. CODPROD identificado (${badCod}) não está no lote atual.`,
              HttpStatus.BAD_REQUEST,
            );
          }

          const [badItem] = remaining.splice(idx, 1);
          falhas.push({ ...badItem, motivo: msg });
          continue; // tenta novamente sem o item ruim
        }

        // ✅ sucesso: lançou a nota com o restante
        return {
          nota: data,
          falhas,
          lancados: remaining,
        };
      } catch (err: any) {
        const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
        const msg = extractSankhyaMessage(err);

        // tenta remover item problemático e continuar
        const badCod = findCodProdInMessage(msg);
        if (badCod && remaining.length > 1) {
          const idx = remaining.findIndex((x) => x.codProd === badCod);
          if (idx >= 0) {
            const [badItem] = remaining.splice(idx, 1);
            falhas.push({ ...badItem, motivo: msg });
            continue;
          }
        }

        // se só sobrou 1 item e falhou, retorna como falha e não estoura tudo
        if (remaining.length === 1) {
          falhas.push({ ...remaining[0], motivo: msg });
          return { nota: null, falhas, lancados: [] };
        }

        throw new HttpException(`ERRO NA REQUISIÇÃO: ${msg}`, status);
      }
    }

    return { nota: null, falhas, lancados: [] };
  }


  /*

  async incluirAjustesPositivo(itens: AjusteItem[], authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const itensValidos = (itens ?? [])
      .filter(i => i?.codProd && i?.diference != null)
      .map(i => ({
        codProd: i.codProd,
        diference: Number(i.diference),
      }))
      .filter(i => Number.isFinite(i.diference) && i.diference > 0);

    if (itensValidos.length === 0) {
      throw new HttpException('Nenhum item válido para incluir na nota.', HttpStatus.BAD_REQUEST);
    }

    const items = itensValidos.map((i, idx) => ({
      NUNOTA: {},
      SEQUENCIA: {}, // ou { $: String(idx + 1) }
      CODPROD: { $: String(i.codProd) },
      QTDNEG: { $: String(i.diference) },
    }));

    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '270' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'O' },
            OBSERVACAO: { $: 'Ajuste realizado por API p/ Ajuste de inventário' },
            CODUSUINC: { $: '81' },
          },
          itens: {
            INFORMARPRECO: 'False',
            item: items,
          },
        },
      },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      // Erro "aplicacional" do Sankhya (vem 200 mas status=0)
      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
        throw new HttpException(`ERRO NO LANÇAMENTO DA NOTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }
      
  
      return data; // ou return resp; se você realmente precisa do response inteiro
    } catch (err: any) {
      // Erro HTTP/Axios (401, 403, 500, timeout etc)
      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const sankhyaData = err?.response?.data;

      // Se o Sankhya devolveu um body com statusMessage, aproveita
      const msg =
        sankhyaData?.statusMessage ||
        sankhyaData?.message ||
        err?.message ||
        'Falha ao chamar o serviço do Sankhya.';

      const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

      throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
    }
  
    }
    
  */

  /*
  async incluirAjustesNegativo(itens: AjusteItem[], authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const itensValidos = (itens ?? [])
      .filter(i => i?.codProd && i?.diference != null)
      .map(i => ({
        codProd: i.codProd,
        diference: Number(i.diference),
      }))
      .filter(i => Number.isFinite(i.diference) && i.diference < 0);

    if (itensValidos.length === 0) {
      throw new HttpException('Nenhum item válido para incluir na nota.', HttpStatus.BAD_REQUEST);
    }

    const items = itensValidos.map((i, idx) => ({
      NUNOTA: {},
      SEQUENCIA: {}, // ou { $: String(idx + 1) }
      CODPROD: { $: String(i.codProd) },
      QTDNEG: { $: String(i.diference*-1) },
    }));

    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '317' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
            OBSERVACAO: { $: 'Ajuste realizado por API p/ Ajuste de inventário' },
            CODUSUINC: { $: '81' },
          },
          itens: {
            INFORMARPRECO: 'False',
            item: items,
          },
        },
      },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      // Erro "aplicacional" do Sankhya (vem 200 mas status=0)
      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
        throw new HttpException(`ERRO NO LANÇAMENTO DA NOTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }


      return data; // ou return resp; se você realmente precisa do response inteiro
    } catch (err: any) {
      // Erro HTTP/Axios (401, 403, 500, timeout etc)
      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const sankhyaData = err?.response?.data;

      // Se o Sankhya devolveu um body com statusMessage, aproveita
      const msg =
        sankhyaData?.statusMessage ||
        sankhyaData?.message ||
        err?.message ||
        'Falha ao chamar o serviço do Sankhya.';

      const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

      throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
    }
  }
    
  
  */

  //aprova a solicitacao de ajuste de inventario incluindo varios itens em uma nota de venda
  async aprovarSolicitacao(itens: Produtos[], authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const itensValidos = (itens ?? [])
      .filter(i => i?.codProduto && i?.quantidade != null)
      .map(i => ({
        codProd: i.codProduto,
        diference: Number(i.quantidade),
      }))
      .filter(i => Number.isFinite(i.diference) && i.diference > 0);

    if (itensValidos.length === 0) {
      throw new HttpException('Nenhum item válido para incluir na nota.', HttpStatus.BAD_REQUEST);
    }

    const items = itensValidos.map((i, idx) => ({
      NUNOTA: {},
      SEQUENCIA: {}, // ou { $: String(idx + 1) }
      CODPROD: { $: String(i.codProd) },
      QTDNEG: { $: String(i.diference) },
    }));

    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '317' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
            OBSERVACAO: { $: 'Ajuste realizado por API p/ Ajuste de inventário | PRODUTO LIBERADO PARA USO INTERNO' },
            CODUSUINC: { $: '81' },
          },
          itens: {
            INFORMARPRECO: 'False',
            item: items,
          },
        },
      },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      // Erro "aplicacional" do Sankhya (vem 200 mas status=0)
      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
        throw new HttpException(`ERRO NO LANÇAMENTO DA NOTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }


      return data; // ou return resp; se você realmente precisa do response inteiro
    } catch (err: any) {
      // Erro HTTP/Axios (401, 403, 500, timeout etc)
      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const sankhyaData = err?.response?.data;

      // Se o Sankhya devolveu um body com statusMessage, aproveita
      const msg =
        sankhyaData?.statusMessage ||
        sankhyaData?.message ||
        err?.message ||
        'Falha ao chamar o serviço do Sankhya.';

      const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

      throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
    }
  }

  /*async aprovarSolicitacao( codProd: number,  diference: number, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    // Mesmos headers do cURL (sem "Bearer")
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // Corpo igual ao cURL, alterando apenas CODPROD e QTDNEG
    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '317' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
            OBSERVACAO: { $: 'Ajuste realizado por API p/ Ajuste de inventário' },
            CODUSUINC: { $: '81' }
          },
          itens: {
            INFORMARPRECO: 'False',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: `${codProd}` },
                QTDNEG: { $: `${diference}` }
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data; // traz status, statusMessage, transactionId
  }*/


  //incluir um item em uma nota de venda/compra || Meteodo não utilizado, usar incluirAjustesPositivo ou incluirAjustesNegativo
  async incluirItemNaNota(params: {
    nunota: number;
    codProd: number;
    qtdNeg: number;
    authToken: string;

    codVol?: string;
    vlrUnit?: number;
    vlrDesc?: number;
    percDesc?: number;
  }) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirAlterarItemNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.authToken}`,
    };

    // ✅ usa CODVOL informado; se não vier, busca o padrão do produto
    const codVolFinal =
      params.codVol ?? (await this.resolverCodVolPadrao(params.codProd, params.authToken));

    const vlrUnit = params.vlrUnit ?? 0;
    const vlrTot = +(params.qtdNeg * vlrUnit).toFixed(2);

    const body = {
      serviceName: 'CACSP.incluirAlterarItemNota',
      requestBody: {
        nota: {
          NUNOTA: String(params.nunota),
          itens: {
            item: {
              CODPROD: { $: String(params.codProd) },
              NUNOTA: { $: String(params.nunota) },

              SEQUENCIA: { $: '' },
              QTDNEG: { $: String(params.qtdNeg) },

              // ✅ agora sempre vai
              CODVOL: { $: String(codVolFinal) },

              CODLOCALORIG: { $: String(1100) },

              VLRUNIT: { $: String(vlrUnit) },
              VLRTOT: { $: String(vlrTot) },

              VLRDESC: { $: String(params.vlrDesc ?? 0) },
              PERCDESC: { $: String(params.percDesc ?? 0) },
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data;
  }


  //#endregion


  //#endregion

  //#region imagens, para puxar imagem: https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=33.dbimage    OBS: ${CODPROD} = CODIGO DO PRODUTO PRA PUXAR IMAGEM

  async downloadImage(url: string): Promise<Buffer> {
    const response = await firstValueFrom(
      this.http.get(url, { responseType: 'arraybuffer' }),
    );
    return Buffer.from(response.data);
  }

  async uploadToCloudinary(buffer: Buffer, publicId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: 'image', public_id: publicId, overwrite: true },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Upload result is undefined.'));
          }
          resolve(result.secure_url);
        },
      ).end(buffer);
    });
  }

  async processImageFromUrl(url: string, publicId?: string): Promise<string> {
    const imageBuffer = await this.downloadImage(url);
    return this.uploadToCloudinary(imageBuffer, publicId);
  }

  //#endregion

  //#region fidelimax 

  async getNota(token: string) {
    const allRows: any[] = [];
    let offset = 0;
    const fetchSize = 500;

    while (true) {
      const sql = `
      SELECT * FROM (
        SELECT
            CAB.NUNOTA,
            CAB.CODTIPOPER,
            CAB.DTNEG,
            CAB.CODPARC,
            CAB.STATUSNFE,
            CAB.VLRNOTA,
            CAB.CODVEND,
            CAB.CODVENDTEC,
            VEN.AD_TIPOTECNICO AS VENDEDOR_AD_TIPOTECNICO,
            SUM(CASE WHEN PRO.CODGRUPOPROD NOT IN (7101104, 7101115, 7101113, 7101103, 7101102, 7101106, 7101107, 7101112, 7101105, 7101109, 7103605, 7101108, 7105405, 7101101, 7101114) THEN (NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)) ELSE 0 END) AS VLR_G1,
            SUM(CASE WHEN PRO.CODGRUPOPROD IN (7101104, 7101115, 7101113, 7101103, 7101102, 7101106, 7101107, 7101112, 7101105, 7101109, 7103605, 7101108, 7105405, 7101101, 7101114) THEN (NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)) ELSE 0 END) AS VLR_G2
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
        INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
        LEFT JOIN TGFVEN VEN ON VEN.CODVEND = CAB.CODVEND
        WHERE
            CAB.CODTIPOPER IN (700,701,326,420)
            AND CAB.CODPARC <> 111111
            AND (CAB.CODEMP = 1 OR CAB.CODTIPOPER = 420)
            AND (CAB.AD_INFIDELIMAX IS NULL OR CAB.AD_INFIDELIMAX <> 'S')
            AND CAB.STATUSNFE = 'A'
            AND CAB.DTFATUR IS NOT NULL
            AND CAB.DTFATUR >= TO_DATE('01/11/2025','DD/MM/YYYY')
            AND CAB.DTFATUR <= (SYSDATE - 2)
        GROUP BY
            CAB.NUNOTA, CAB.CODTIPOPER, CAB.DTNEG, CAB.CODPARC, CAB.STATUSNFE, CAB.VLRNOTA, CAB.CODVEND, CAB.CODVENDTEC, VEN.AD_TIPOTECNICO
        ORDER BY CAB.NUNOTA DESC
      )
      OFFSET ${offset} ROWS FETCH NEXT ${fetchSize} ROWS ONLY
      `.replace(/\s+/g, ' ').trim();

      const data = await this.executeQuery(token, sql);
      const rows = this.normalizeRows(data);

      if (!rows || rows.length === 0) {
        break;
      }

      allRows.push(...rows);

      if (rows.length < fetchSize) {
        break;
      }

      offset += fetchSize;
    }

    const toNum = (v: any) => (v === null || v === '' ? null : Number(v));

    return allRows.map(r => ({
      NUNOTA: toNum(r.NUNOTA) ?? 0,
      CODTIPOPER: toNum(r.CODTIPOPER) ?? 0,
      DTNEG: r.DTNEG ?? null,
      CODPARC: toNum(r.CODPARC) ?? 0,
      STATUSNFE: r.STATUSNFE ?? null,
      VLRNOTA: toNum(r.VLRNOTA) ?? 0,
      CODVEND: toNum(r.CODVEND),
      CODVENDTEC: toNum(r.CODVENDTEC),
      VENDEDOR_AD_TIPOTECNICO: toNum(r.VENDEDOR_AD_TIPOTECNICO),
      VLR_G1: toNum(r.VLR_G1) ?? 0,
      VLR_G2: toNum(r.VLR_G2) ?? 0,
    }));
  }

  async getNotaDevol(token: string) {
    const allRows: any[] = [];
    let offset = 0;
    const fetchSize = 500;

    while (true) {
      const sql = `
      SELECT * FROM (
        SELECT
            CAB.NUNOTA,
            CAB.CODTIPOPER,
            CAB.DTNEG,
            CAB.CODPARC,
            CAB.STATUSNFE,
            CAB.VLRNOTA,
            CAB.CODVEND,
            CAB.CODVENDTEC,
            VEN.AD_TIPOTECNICO AS VENDEDOR_AD_TIPOTECNICO,
            SUM(CASE WHEN PRO.CODGRUPOPROD NOT IN (7101104, 7101115, 7101113, 7101103, 7101102, 7101106, 7101107, 7101112, 7101105, 7101109, 7103605, 7101108, 7105405, 7101101, 7101114) THEN (NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)) ELSE 0 END) AS VLR_G1,
            SUM(CASE WHEN PRO.CODGRUPOPROD IN (7101104, 7101115, 7101113, 7101103, 7101102, 7101106, 7101107, 7101112, 7101105, 7101109, 7103605, 7101108, 7105405, 7101101, 7101114) THEN (NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)) ELSE 0 END) AS VLR_G2
        FROM TGFCAB CAB
        INNER JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
        INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
        LEFT JOIN TGFVEN VEN ON VEN.CODVEND = CAB.CODVEND
        WHERE
            CAB.CODTIPOPER IN (800,801,421)
            AND CAB.CODPARC <> 111111
            AND (CAB.CODEMP = 1 OR CAB.CODTIPOPER = 421)
            AND (CAB.AD_INFIDELIMAX IS NULL OR CAB.AD_INFIDELIMAX <> 'S')
            AND CAB.STATUSNFE = 'A'
            AND CAB.DTFATUR IS NOT NULL
            AND CAB.DTFATUR >= TO_DATE('01/11/2025','DD/MM/YYYY')
            AND CAB.DTFATUR <= (SYSDATE - 2)
        GROUP BY
            CAB.NUNOTA, CAB.CODTIPOPER, CAB.DTNEG, CAB.CODPARC, CAB.STATUSNFE, CAB.VLRNOTA, CAB.CODVEND, CAB.CODVENDTEC, VEN.AD_TIPOTECNICO
        ORDER BY CAB.NUNOTA DESC
      )
      OFFSET ${offset} ROWS FETCH NEXT ${fetchSize} ROWS ONLY
      `.replace(/\s+/g, ' ').trim();

      const data = await this.executeQuery(token, sql);
      const rows = this.normalizeRows(data);

      if (!rows || rows.length === 0) {
        break;
      }

      allRows.push(...rows);

      if (rows.length < fetchSize) {
        break;
      }

      offset += fetchSize;
    }

    const toNum = (v: any) => (v === null || v === '' ? null : Number(v));

    return allRows.map(r => ({
      NUNOTA: toNum(r.NUNOTA) ?? 0,
      CODTIPOPER: toNum(r.CODTIPOPER) ?? 0,
      DTNEG: r.DTNEG ?? null,
      CODPARC: toNum(r.CODPARC) ?? 0,
      STATUSNFE: r.STATUSNFE ?? null,
      VLRNOTA: toNum(r.VLRNOTA) ?? 0,
      CODVEND: toNum(r.CODVEND),
      CODVENDTEC: toNum(r.CODVENDTEC),
      VENDEDOR_AD_TIPOTECNICO: toNum(r.VENDEDOR_AD_TIPOTECNICO),
      VLR_G1: toNum(r.VLR_G1) ?? 0,
      VLR_G2: toNum(r.VLR_G2) ?? 0,
    }));
  }
  async getNotaPorNunota(nunota: string, token: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const nunotaClean = String(nunota ?? '').trim();
    if (!nunotaClean) throw new Error('nunota inválida');

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'N',
          metadata: 'S',
          tryJoinedFields: 'false',
          offsetPage: '0',
          criteria: {
            expression: {
              $: `
              this.NUNOTA = ?
            `.replace(/\s+/g, ' ').trim(),
            },
            parameter: [
              { $: nunotaClean, type: 'S' }, // ✅ use S (mais tolerante)
            ],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'NUNOTA,CODTIPOPER,DTNEG,CODPARC,STATUSNFE,VLRNOTA,CODVEND,CODVENDTEC,AD_INFIDELIMAX,DTFATUR,CODEMP,DTNEG,PENDENTE',
              },
            },
            {
              path: 'CabecalhoConferencia',
              fieldset: { list: 'STATUSCONFERENCIA' },
            },
            {
              path: 'Vendedor',
              fieldset: { list: 'AD_TIPOTECNICO' },
            },
            {
              path: 'Parceiro',
              fieldset: { list: 'TIPPESSOA' },
            },
          ],
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.responseBody?.errorMessage ||
        resp?.data?.serviceMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords: ${msg}`);
    }

    const entities = resp.data.responseBody?.entities;

    // --- helpers ---
    const asArray = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);
    const rawFields = asArray(entities?.metadata?.fields?.field);
    const rawRows = asArray(entities?.entity);

    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };

    const toNumOrNull = (v: any) => (v === null || v === '' ? null : Number(v));
    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };

    const rowsNamed = rawRows.map(rowToNamed);

    const parsed = rowsNamed.map((r) => ({
      NUNOTA: toNumOrNull(r.NUNOTA) ?? 0,
      CODTIPOPER: toNumOrNull(r.CODTIPOPER) ?? 0,
      DTNEG: r.DTNEG ?? null,
      CODPARC: toNumOrNull(r.CODPARC) ?? 0,
      STATUSNFE: r.STATUSNFE ?? null,
      VLRNOTA: toNumOrNull(r.VLRNOTA) ?? 0,
      CODVEND: toNumOrNull(r.CODVEND),
      CODVENDTEC: toNumOrNull(r.CODVENDTEC),
      AD_INFIDELIMAX: r.AD_INFIDELIMAX ?? null,
      DTFATUR: r.DTFATUR ?? null,
      CODEMP: toNumOrNull(r.CODEMP),
      VENDEDOR_AD_TIPOTECNICO: toNumOrNull(r['Vendedor_AD_TIPOTECNICO']),
      TIPPESSOA: r['Parceiro_TIPPESSOA'],
    }));

    // se não achou, retorna null (ou lance erro se preferir)
    return parsed[0] ?? null;
  }

  async getNotasComprasDiaAnterior(token: string): Promise<any[]> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 1. Calcular a data de ontem (DD/MM/YYYY)
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    const dia = ontem.getDate().toString().padStart(2, '0');
    const mes = (ontem.getMonth() + 1).toString().padStart(2, '0');
    const ano = ontem.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;



    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          offsetPage: 0,
          criteria: {
            expression: {
              $: `
              this.CODTIPOPER IN (344, 300) 
              AND (this.CODEMP = 1 OR this.CODEMP = '1')
              AND TRUNC(this.DTNEG) = TO_DATE('${dataFormatada}', 'DD/MM/YYYY')
            `.replace(/\s+/g, ' ').trim(),
            },
          },
          entity: {
            fieldset: {
              // Liste aqui os campos que você precisa retornar
              list: 'NUNOTA,NUMNOTA,DTNEG,VLRNOTA,CODPARC,CODTIPOPER',
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.responseBody?.errorMessage ||
        resp?.data?.serviceMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords (getNotasDiaAnteriorPorTop): ${msg}`);
    }

    const entities = resp.data.responseBody?.entities;

    // --- Helpers de Parsing (Mantidos do seu exemplo) ---
    const asArray = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);
    const rawFields = asArray(entities?.metadata?.fields?.field);
    const rawRows = asArray(entities?.entity);

    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };

    const toNum = (v: any) => Number(val(v));
    // Helper para data se precisar converter string para objeto Date JS
    // const toDate = (v: any) => v ? new Date(val(v)) : null;

    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        // Mapeia f0, f1... para o nome do campo (NUNOTA, DTNEG...)
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };

    const rowsNamed = rawRows.map(rowToNamed);

    // Mapeamento final para tipagem mais limpa
    return rowsNamed.map((r: any) => ({
      NUNOTA: toNum(r.NUNOTA),
      NUMNOTA: toNum(r.NUMNOTA),
      DTNEG: r.DTNEG, // Vem como string DD/MM/YYYY HH:mm:ss geralmente
      VLRNOTA: toNum(r.VLRNOTA),
      CODPARC: toNum(r.CODPARC),
      CODTIPOPER: toNum(r.CODTIPOPER)
    }));
  }

  async getNotasVendasDiaAnterior(token: string): Promise<any[]> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 1. Calcular a data de ontem (DD/MM/YYYY)
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    const dia = ontem.getDate().toString().padStart(2, '0');
    const mes = (ontem.getMonth() + 1).toString().padStart(2, '0');
    const ano = ontem.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;



    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          offsetPage: 0,
          criteria: {
            expression: {
              $: `
              this.CODTIPOPER IN (700) 
              AND (this.CODEMP = 1 OR this.CODEMP = '1')
              AND TRUNC(this.DTNEG) = TO_DATE('${dataFormatada}', 'DD/MM/YYYY')
            `.replace(/\s+/g, ' ').trim(),
            },
          },
          entity: {
            fieldset: {
              // Liste aqui os campos que você precisa retornar
              list: 'NUNOTA,NUMNOTA,DTNEG,VLRNOTA,CODPARC,CODTIPOPER',
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.responseBody?.errorMessage ||
        resp?.data?.serviceMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords (getNotasDiaAnteriorPorTop): ${msg}`);
    }

    const entities = resp.data.responseBody?.entities;

    // --- Helpers de Parsing (Mantidos do seu exemplo) ---
    const asArray = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);
    const rawFields = asArray(entities?.metadata?.fields?.field);
    const rawRows = asArray(entities?.entity);

    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };

    const toNum = (v: any) => Number(val(v));
    // Helper para data se precisar converter string para objeto Date JS
    // const toDate = (v: any) => v ? new Date(val(v)) : null;

    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };

    const rowsNamed = rawRows.map(rowToNamed);

    // Mapeamento final para tipagem mais limpa
    return rowsNamed.map((r: any) => ({
      NUNOTA: toNum(r.NUNOTA),
      NUMNOTA: toNum(r.NUMNOTA),
      DTNEG: r.DTNEG, // Vem como string DD/MM/YYYY HH:mm:ss geralmente
      VLRNOTA: toNum(r.VLRNOTA),
      CODPARC: toNum(r.CODPARC),
      CODTIPOPER: toNum(r.CODTIPOPER)
    }));
  }

  async getNotasVendasMes(token: string): Promise<any[]> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 1. Calcular a data de ontem (DD/MM/YYYY)
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    const dia = ontem.getDate().toString().padStart(2, '0');
    const mes = (ontem.getMonth() + 1).toString().padStart(2, '0');
    const ano = ontem.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;



    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          offsetPage: 0,
          criteria: {
            expression: {
              $: `
              this.CODTIPOPER IN (344, 300) 
              AND (this.CODEMP = 1 OR this.CODEMP = '1')
              AND TRUNC(this.DTNEG) = TO_DATE('${dataFormatada}', 'DD/MM/YYYY')
            `.replace(/\s+/g, ' ').trim(),
            },
          },
          entity: {
            fieldset: {
              // Liste aqui os campos que você precisa retornar
              list: 'NUNOTA,NUMNOTA,DTNEG,VLRNOTA,CODPARC,CODTIPOPER',
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.responseBody?.errorMessage ||
        resp?.data?.serviceMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords (getNotasDiaAnteriorPorTop): ${msg}`);
    }

    const entities = resp.data.responseBody?.entities;

    // --- Helpers de Parsing (Mantidos do seu exemplo) ---
    const asArray = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);
    const rawFields = asArray(entities?.metadata?.fields?.field);
    const rawRows = asArray(entities?.entity);

    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };

    const toNum = (v: any) => Number(val(v));
    // Helper para data se precisar converter string para objeto Date JS
    // const toDate = (v: any) => v ? new Date(val(v)) : null;

    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        // Mapeia f0, f1... para o nome do campo (NUNOTA, DTNEG...)
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };

    const rowsNamed = rawRows.map(rowToNamed);

    // Mapeamento final para tipagem mais limpa
    return rowsNamed.map((r: any) => ({
      NUNOTA: toNum(r.NUNOTA),
      NUMNOTA: toNum(r.NUMNOTA),
      DTNEG: r.DTNEG, // Vem como string DD/MM/YYYY HH:mm:ss geralmente
      VLRNOTA: toNum(r.VLRNOTA),
      CODPARC: toNum(r.CODPARC),
      CODTIPOPER: toNum(r.CODTIPOPER)
    }));
  }

  async getItensNota(token: string, nunota: number): Promise<any[]> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'ItemNota', // Entidade que representa a TGFITE
          includePresentationFields: 'S',
          offsetPage: 0,
          criteria: {
            expression: {
              $: `this.NUNOTA = ${nunota}`
            },
          },
          entity: {
            fieldset: {
              // Adicione ou remova campos conforme sua necessidade
              list: 'NUNOTA,SEQUENCIA,CODPROD,QTDNEG,VLRUNIT,VLRTOT,CODVOL,CODTRIB',
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.responseBody?.errorMessage ||
        resp?.data?.serviceMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords (getItensPorNota): ${msg}`);
    }

    const entities = resp.data.responseBody?.entities;

    // --- Helpers de Parsing (Reutilizados) ---
    const asArray = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);
    const rawFields = asArray(entities?.metadata?.fields?.field);
    const rawRows = asArray(entities?.entity);

    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };

    const toNum = (v: any) => Number(val(v));

    // Mapeia os nomes dos campos retornados (f0 -> NUNOTA, f1 -> SEQUENCIA, etc.)
    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };

    const rowsNamed = rawRows.map(rowToNamed);

    // Retorna o objeto formatado com os tipos corretos
    return rowsNamed.map((r: any) => ({
      NUNOTA: toNum(r.NUNOTA),
      SEQUENCIA: toNum(r.SEQUENCIA),
      CODPROD: toNum(r.CODPROD),
      QTDNEG: toNum(r.QTDNEG),
      VLRUNIT: toNum(r.VLRUNIT),
      VLRTOT: toNum(r.VLRTOT),
      CODVOL: String(r.CODVOL ?? '')
    }));
  }


  async getNotasStatusConferenciaA(token: string): Promise<{ NUNOTA: number; STATUSCONFERENCIA: string }[]> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota', // TGFCAB
          includePresentationFields: 'S', // ✅ importante para trazer STATUSCONFERENCIA
          metadata: 'S',
          tryJoinedFields: 'false',
          offsetPage: 0,
          recordCount: -1,
          criteria: {
            expression: {
              $: `
                this.STATUSCONFERENCIA LIKE 'A%'
              `.replace(/\s+/g, ' ').trim(),
            },
          },
          entity: {
            fieldset: {
              list: 'NUNOTA,STATUSCONFERENCIA',
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.responseBody?.errorMessage ||
        resp?.data?.serviceMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords: ${msg}`);
    }

    const entities = resp.data.responseBody?.entities;

    // --- helpers (mesma ideia do teu getNota) ---
    const asArray = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);
    const rawFields = asArray(entities?.metadata?.fields?.field);
    const rawRows = asArray(entities?.entity);

    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };

    const toNum = (v: any) => Number(val(v));

    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };

    const rowsNamed = rawRows.map(rowToNamed);

    return rowsNamed.map((r: any) => ({
      NUNOTA: toNum(r.NUNOTA),
      STATUSCONFERENCIA: String(r.STATUSCONFERENCIA ?? ''),
    }));
  }




  async inFidelimaxNoteCheck(nunota, token) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        entityName: 'CabecalhoNota',
        standAlone: false,
        fields: ['NUNOTA', 'AD_INFIDELIMAX'],
        records: [
          {
            pk: { NUNOTA: nunota },
            values: {
              1: 'S'
            },
          },
        ],
      },
    };
    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data
  }

  async getCPFwithCodParc(codParc: number, token: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          includePresentationFields: 'N',
          offsetPage: '0',
          criteria: {
            expression: { $: `this.CODPARC = ${codParc}` },
          },
          entity: { fieldset: { list: 'CGC_CPF,NOMEPARC' } }
        }
      }
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    const ent = data?.responseBody?.entities?.entity;
    const row = Array.isArray(ent) ? ent[0] : ent;


    const cpf = data.responseBody.entities.entity.f0?.$;
    const nome = data.responseBody.entities.entity.f1?.$;
    return { cpf: cpf, nome: nome };
  }

  async enderecoPorCEP(cep: string) {
    const digits = cep.replace(/\D/g, "");
    const fontes = [
      (c: string) => fetch(`https://viacep.com.br/ws/${c}/json/`),
    ];
    let data: any;
    for (const fonte of fontes) {
      const r = await fonte(digits);
      if (r.ok) { data = await r.json(); if (!data.erro) break; }
    }
    if (!data) throw new Error("CEP não encontrado");

    // Normalizações úteis para evitar falhas no Sankhya
    const logradouro = (data.street || data.logradouro || "").trim();
    const bairroRaw = (data.neighborhood || data.bairro || "").trim();

    // Alguns CEPs não têm bairro — trate conforme sua regra de negócio
    const bairro = bairroRaw || "Centro"; // ou deixe vazio se o seu layout permitir

    const cidade = (data.city || data.localidade || "").trim();
    const uf = (data.state || data.uf || "").trim();

    return { logradouro, bairro, cidade, uf, cep: digits };
  }

  async getCodParcWithCPF(cpf: string, token: string): Promise<any> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Escapa aspas simples só por precaução
    const cpfSafe = cpf.replace(/'/g, "''");

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          includePresentationFields: 'N',
          offsetPage: '0',
          criteria: {
            expression: { $: `this.CGC_CPF = '${cpfSafe}'` },
          },
          entity: { fieldset: { list: 'CODPARC' } },
        },
      },
    };

    try {
      const { data } = await firstValueFrom(this.http.post(url, body, { headers }));

      // Caminho defensivo: a API às vezes retorna objeto; às vezes, array.
      const entities = data?.responseBody?.entities?.entity;
      if (!entities) return null;

      const firstEntity = Array.isArray(entities) ? entities[0] : entities;

      // f0.$ é o padrão quando se pede 1 campo no fieldset
      const codparc = firstEntity?.f0?.$ ?? firstEntity?.CODPARC?.$ ?? firstEntity?.CODPARC;

      return codparc != null ? String(codparc) : null;
    } catch (err) {
      // Em erros de rede/401/etc., você pode escolher relançar ou padronizar como null
      // Aqui vamos padronizar como null para atender ao requisito.
      return null;
    }
  }

  async getVendedor(codVendTec: number | null, token: string): Promise<VendedorDTO | null> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Vendedor',
          includePresentationFields: 'N',
          metadata: 'S',
          offsetPage: '0',
          criteria: {
            expression: { $: 'this.CODVEND = ?' },
            parameter: [{ $: String(codVendTec), type: 'I' }],
          },
          entity: {
            // ajuste a lista abaixo conforme os campos que você precisa
            fieldset: { list: 'CODVEND,CODPARC,APELIDO,AD_TIPOTECNICO' },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    // valida status do serviço
    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.statusMessage ||
        resp?.data?.responseBody?.errorMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords: ${msg}`);
    }

    // normaliza metadata e rows
    const entities = resp.data?.responseBody?.entities;
    const fields = entities?.metadata?.fields?.field;
    const arrFields = Array.isArray(fields) ? fields : fields ? [fields] : [];
    const idxByName: Record<string, string> =
      Object.fromEntries(arrFields.map((f: any, i: number) => [f.name, `f${i}`]));

    const raw = entities?.entity;
    const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
    if (!rows.length) return null;

    const row = rows[0];
    const get = (name: string) => row?.[idxByName[name]]?.$ ?? null;

    return {
      CODVEND: get('CODVEND'),
      CODPARC: get('CODPARC'),
      APELIDO: get('APELIDO'),
      AD_TIPOTECNICO: get('AD_TIPOTECNICO'),
    };
  }

  async atualizarStatusFidelimax(nunota, status, token: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        entityName: 'CabecalhoNota',
        standAlone: false,
        fields: ['NUNOTA', 'AD_INFIDELIMAX'],
        records: [
          {
            pk: { NUNOTA: nunota },
            values: { 1: status }, // equivalente ao { 1: "S" }
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }

  async NotaCanceladaByNunota(nunota: number, token: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 1) Consulta com filtro por NUNOTA
    const bodyByNunota = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'NotaCancelada',
          includePresentationFields: 'S',
          metadata: 'S',
          offsetPage: '0',
          // recordCount opcional; pode omitir
          criteria: {
            expression: { $: 'this.NUNOTA = ?' },
            parameter: [{ $: String(nunota), type: 'I' }], // inteiro
          },
          entity: { fieldset: { list: '*' } },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, bodyByNunota, { headers }));

    if (resp?.data?.status !== '1') {
      console.error('loadRecords error:', JSON.stringify(resp?.data, null, 2));
      throw new Error(resp?.data?.statusMessage || 'Falha no loadRecords');
    }

    // Normaliza metadata (objeto/array)
    const entities = resp?.data?.responseBody?.entities;
    let fields = entities?.metadata?.fields?.field;
    const rawRows = entities?.entity;
    const rows = Array.isArray(rawRows) ? rawRows : rawRows ? [rawRows] : [];

    if (!fields) {
      // 2) Fallback: sem critério, só para “forçar” o metadata
      const bodyNoCriteria = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'NotaCancelada',
            includePresentationFields: 'S',
            metadata: 'S',
            offsetPage: '0',
            // sem criteria
            entity: { fieldset: { list: '*' } },
          },
        },
      };
      const respMeta = await firstValueFrom(this.http.post(url, bodyNoCriteria, { headers }));
      if (respMeta?.data?.status !== '1') {
        console.error('loadRecords (fallback) error:', JSON.stringify(respMeta?.data, null, 2));
        throw new Error(respMeta?.data?.statusMessage || 'Falha no loadRecords (fallback)');
      }
      fields = respMeta?.data?.responseBody?.entities?.metadata?.fields?.field;
    }

    // Agora “fields” pode ser objeto ou array
    const arrFields = Array.isArray(fields) ? fields : fields ? [fields] : [];

    // Loga os descritores de campo (nome, tipo, etc.)
    console.log(JSON.stringify(arrFields, null, 2));

    // Retorna algo útil para o chamador (opcional)
    return {
      fields: arrFields,
      rows,
    };
  }

  async IncluirClienteSankhya(
    nome: string,
    mail: string,
    cpf: string,
    ddd: string | number,
    tel: string | number,
    cep: string | number,
    estado: string,
    cidade: string,
    rua: string,
    numero: string | number,
    bairro: string,
    nascimento: string,
    token: string,
  ) {
    const url = 'https://api.sankhya.com.br/v1/parceiros/clientes';

    const telefoneDdd = onlyDigits(ddd);
    const telefoneNumero = onlyDigits(tel);
    const uf = await this.convertEstadoToUF(estado);

    const headers = {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      tipo: 'PF',
      telefoneNumero,
      telefoneDdd,
      emailNfe: String(mail).trim(),
      razao: String(nome).trim(),
      nome: String(nome).trim(),
      dtnasc: String(nascimento).trim(),
      cnpjCpf: cpf,
      endereco: {
        logradouro: String(rua).trim(),
        numero: String(numero || 'S/N'),
        bairro: toAscii(bairro),   // <<< aqui
        cidade: toAscii(cidade),   // <<< e aqui
        cep: String(cep).trim(),
        uf,
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    if (resp?.status < 200 || resp?.status >= 300) {
      throw new Error(`Falha ao criar cliente (HTTP ${resp?.status})`);
    }
    return resp.data;
  }

  //async getCodBairroWithBairro(bairroNome) {}

  async listarCidadesPorUfCodigo(
    ufNomeCid: string, // ex.: "CAMALAU - PB"
    token: string
  ): Promise<Array<{
    CODCID: number | string;
    NOMECID: string;
    UF: string | number;
    UFNOMECID: string;
    ufSigla: string;
  }>> {
    type SankhyaFieldValue = { field: string; value: any };
    type SankhyaRecord = { fieldValues: SankhyaFieldValue[] };
    type SankhyaDataSet = { records: SankhyaRecord[] };
    type SankhyaLoadResp = { responseBody?: { dataSet?: SankhyaDataSet } };

    const toObj = (rec: SankhyaRecord): Record<string, any> =>
      rec.fieldValues?.reduce((acc, fv) => ((acc[fv.field] = fv.value), acc), {}) ?? {};

    const extrairUfSigla = (s: string): string =>
      (/-\s*([A-Z]{2})\s*$/i.exec(String(s).trim())?.[1] ?? String(s).slice(-2)).toUpperCase();

    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    } as const;

    // escape de aspas simples para o expression
    const literal = String(ufNomeCid).replace(/'/g, "''");

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Cidade',
          includePresentationFields: 'S',
          metadata: 'N',
          offsetPage: '1',
          tryJoinedFields: 'true',
          // compare como STRING, com aspas
          criteria: { expression: `UPPER(this.UFNOMECID) = UPPER('${literal}')` },
          entity: { fieldset: { list: 'CODCID, NOMECID, UF, UFNOMECID' } },
        },
      },
    } as const;

    const resp = await firstValueFrom(
      this.http.post<SankhyaLoadResp>(url, body, { headers })
    );

    const records = resp.data.responseBody?.dataSet?.records ?? [];

    return records.map((r) => {
      const o = toObj(r);
      const UFNOMECID = String(o.UFNOMECID ?? '');
      return {
        CODCID: o.CODCID,
        NOMECID: o.NOMECID,
        UF: o.UF,
        UFNOMECID,
        ufSigla: extrairUfSigla(UFNOMECID),
      };
    });
  }

  async atualizarCampoParceiroCampo(
    token: string,
    codParc: string | number,
    campo: string,
    valor: any,
  ) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'Parceiro',
        standAlone: false,
        fields: ['CODPARC', campo],
        records: [
          {
            pk: { CODPARC: String(codParc) },
            values: {
              '1': valor,
            },
          },
        ],
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data;
  }

  async convertEstadoToUF(estado: string) {
    const { data } = await firstValueFrom(
      this.http.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados'),
    );

    if (!Array.isArray(data)) return ' ';
    return (data.find((e: any) => e.nome === estado)?.sigla) ?? ' ';
  }

  async incluirNotaEmLote(
    codParc: number,
    codTipOper: number,
    codTipVenda: number,
    produtos: any[], // Suporta number[] para scripts antigos, ou array de obj com vlrUnit do tsx novo
    authToken: string,
    tipMov: string = 'V'
  ): Promise<any> {
    // 1. Agrupa itens repetidos e converte a contagem em QTDNEG, além de somar impostos
    const grouped = new Map<number, {
      qtd: number, vlrUnit: number,
      vlrIcms: number, baseIcms: number,
      baseIpi: number, aliIpi: number, vlrIpi: number
    }>();

    for (const p of produtos) {
      // Normaliza entre formato antigo (script puro numérico) e o novo (frontend object)
      const cod = typeof p === 'object' && p !== null ? p.codProd : Number(p);
      const vlr = typeof p === 'object' && p !== null ? Number(p.vlrUnit) || 0 : 0;
      const vlrIcms = typeof p === 'object' && p !== null ? Number(p.vlrIcms) || 0 : 0;
      const baseIcms = typeof p === 'object' && p !== null ? Number(p.baseIcms) || 0 : 0;
      const baseIpi = typeof p === 'object' && p !== null ? Number(p.baseIpi) || 0 : 0;
      const aliIpi = typeof p === 'object' && p !== null ? Number(p.aliIpi) || 0 : 0;
      const vlrIpi = typeof p === 'object' && p !== null ? Number(p.vlrIpi) || 0 : 0;

      if (!Number.isFinite(cod) || !cod) continue;

      const existing = grouped.get(cod);
      if (existing) {
        existing.qtd += 1;
        existing.vlrIcms += vlrIcms;
        existing.baseIcms += baseIcms;
        existing.baseIpi += baseIpi;
        existing.vlrIpi += vlrIpi;
        // Alíquota de IPI não soma, é taxa fixa!
      } else {
        grouped.set(cod, {
          qtd: 1, vlrUnit: vlr,
          vlrIcms, baseIcms, baseIpi, aliIpi, vlrIpi
        });
      }
    }
    const uniqueCodProds = Array.from(grouped.keys());

    // 2. Busca CODVOL via consulta no banco, em blocos de 400
    const codVolMap = new Map<number, string>();
    const blocks = chunk(uniqueCodProds, 400);

    for (const block of blocks) {
      if (block.length === 0) continue;
      const sql = `SELECT CODPROD, CODVOL FROM TGFPRO WHERE CODPROD IN (${block.join(',')})`;
      try {
        const data = await this.executeQuery(authToken, sql);
        const rows: any[] = data?.responseBody?.rows ?? data?.responseBody?.result ?? data?.responseBody?.data ?? data?.responseBody ?? [];
        for (const r of rows) {
          const cProd = Number(r.CODPROD ?? r.codprod ?? r[0]);
          const cVol = String(r.CODVOL ?? r.codvol ?? r[1] ?? 'UN');
          if (Number.isFinite(cProd)) {
            codVolMap.set(cProd, cVol);
          }
        }
      } catch (err: any) {
        console.error('Erro ao buscar CODVOL padrao no lote:', err?.message || err);
      }
    }

    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      Connection: 'keep-alive',
    };

    const itensSankhya = uniqueCodProds.map((codProd, index) => {
      const dataInfo = grouped.get(codProd)!;
      const vlrUnitStr = dataInfo.vlrUnit.toString();
      const vlrTotStr = (dataInfo.vlrUnit * dataInfo.qtd).toFixed(2);

      return {
        NUNOTA: { $: '' },
        SEQUENCIA: { $: '' }, // Deve ser vazia pro Sankhya gerar a PK como INSERT
        CODPROD: { $: String(codProd) },
        CODVOL: { $: codVolMap.get(codProd) || 'UN' },
        QTDNEG: { $: String(dataInfo.qtd) },
        VLRUNIT: { $: vlrUnitStr },
        VLRTOT: { $: vlrTotStr },
        VLRICMS: { $: String(dataInfo.vlrIcms) },
        BASEICMS: { $: String(dataInfo.baseIcms) },
        BASEIPI: { $: String(dataInfo.baseIpi) },
        ALIPI: { $: String(dataInfo.aliIpi) },
        VLRIPI: { $: String(dataInfo.vlrIpi) },
        PERCDESC: { $: '0' },
        VLRDESC: { $: '0' },
        CODLOCALORIG: { $: '1100' },
      };
    });

    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: String(codParc) },
            DTNEG: { $: format(new Date(), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: String(codTipOper) },
            CODTIPVENDA: { $: String(codTipVenda) },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: tipMov },
          },
          itens: {
            INFORMARPRECO: 'True',
            PRECDESCONTO: '0',
            item: itensSankhya, // Lança TODOS os ~1100 itens agrupados de uma vez no root
          },
        },
      },
    };

    let createData;

    try {
      console.log(`Lançando a nota com ${itensSankhya.length} itens unificados em bulk...`);
      const resp = await firstValueFrom(
        // O timeout de 5 minutos previne ECONNRESET p/ 1000+ items enquanto o DB avalia
        this.http.post(url, body, { headers, timeout: 300000, maxBodyLength: Infinity })
      );
      createData = resp.data;
    } catch (err: any) {
      console.error('Falha de timeout/conexão ao tentar criar nota pesada:', err?.message);
      return err?.response?.data || { status: '0', erro: err?.message };
    }

    if (createData?.status === '0' || !createData?.responseBody?.pk?.NUNOTA) {
      console.log('Falha na criação da nota:', JSON.stringify(createData).substring(0, 300));
      return createData;
    }


    return createData;
  }

  async limparItensNota(nuNota: number, authToken: string) {
    // 1. Busca todas as sequências de itens da nota
    const query = `SELECT SEQUENCIA FROM TGFITE WHERE NUNOTA = ${nuNota}`;
    const urlSearch = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';
    
    const resSearch = await fetch(urlSearch, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { query }
      })
    });

    const dataSearch: any = await resSearch.json();
    const rows = dataSearch?.responseBody?.rows || [];

    if (rows.length === 0) return;

    // 2. Exclui cada item
    const urlDel = 'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.excluirItemNota&outputType=json';
    
    for (const row of rows) {
      const sequencia = row[0];
      await fetch(urlDel, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          serviceName: 'CACSP.excluirItemNota',
          requestBody: {
            nota: {
              cabecalho: { NUNOTA: { $: String(nuNota) } },
              itens: { item: { SEQUENCIA: { $: String(sequencia) } } }
            }
          }
        })
      });
    }
  }

  async incluirNotaCrm(data: {
    cabecalho: {
      CODPARC: string | number;
      CODTIPOPER: string | number;
      CODTIPVENDA: string | number;
      CODEMP: string | number;
      TIPMOV: string;
      OBSERVACOES?: string;
      NUNOTA?: number;
    },
    itens: {
      CODPROD: string | number;
      QTDNEG: number;
      VLRUNIT: number;
      CODLOCAL: string | number;
    }[]
  }, authToken: string) {
    const url = 'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: data.cabecalho.NUNOTA ? { $: String(data.cabecalho.NUNOTA) } : {},
            CODPARC: { $: String(data.cabecalho.CODPARC) },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: String(data.cabecalho.CODTIPOPER) },
            CODTIPVENDA: { $: String(data.cabecalho.CODTIPVENDA) },
            CODVEND: { $: '0' },
            CODEMP: { $: String(data.cabecalho.CODEMP) },
            TIPMOV: { $: data.cabecalho.TIPMOV },
            OBSERVACOES: data.cabecalho.OBSERVACOES ? { $: data.cabecalho.OBSERVACOES } : undefined
          },
          itens: {
            INFORMARPRECO: 'True',
            item: data.itens.map(item => ({
              NUNOTA: {},
              SEQUENCIA: {},
              CODPROD: { $: String(item.CODPROD) },
              QTDNEG: { $: String(item.QTDNEG) },
              VLRUNIT: { $: String(item.VLRUNIT) },
              CODLOCAL: { $: String(item.CODLOCAL) },
            })),
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data;
  }

  async incluirNotaPremio(produto: string, qtdNeg: string, codParc: string, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    // Mesmos headers do cURL (sem "Bearer")
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // Corpo igual ao cURL, alterando apenas CODPROD e QTDNEG
    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: `${codParc}` },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '379' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
          },
          itens: {
            INFORMARPRECO: 'False',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: String(produto) },
                QTDNEG: { $: String(qtdNeg) },
                CODLOCAL: { $: '1600' },
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data; // traz status, statusMessage, transactionId
  }


  async incluirCashback(qtdNeg: string, codParc: string, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    // Mesmos headers do cURL (sem "Bearer")
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // Corpo igual ao cURL, alterando apenas CODPROD e QTDNEG
    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: `${codParc}` },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '387' },
            CODTIPVENDA: { $: '24' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
          },
          itens: {
            INFORMARPRECO: 'True',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: '20486' },
                QTDNEG: { $: '1' },
                VLRUNIT: { $: String(qtdNeg) },
                PERCDESC: { $: '0' },
                CODLOCAL: { $: '1600' },
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data; // traz status, statusMessage, transactionId
  }

  async incluirNotaInfiniti(
    produto: string,
    qtdNeg: string,
    codParc: string,
    authToken: string
  ) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: String(codParc) },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '388' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
          },
          itens: {
            INFORMARPRECO: 'False',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: String(produto) },
                QTDNEG: { $: String(qtdNeg) },
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    console.log(resp)

    return resp.data;
  }

  async incluirNotaDinheiro(
    produto: string,
    valorReais: number,
    codParc: string,
    authToken: string
  ) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: String(codParc) },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '388' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
          },
          itens: {
            INFORMARPRECO: 'True',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: String(produto) },
                QTDNEG: { $: '1' },
                VLRUNIT: { $: valorReais.toFixed(2) },
                PERCDESC: { $: '0' },
                CODVOL: { $: 'UN' },
                CODLOCAL: { $: '0' },
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data;
  }


  async confirmarNota(nunota: number, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CACSP.confirmarNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      // ⚠️ sem Bearer (padrão comum no gateway da Sankhya em vários serviços)
      Authorization: `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'CACSP.confirmarNota',
      requestBody: {
        nota: {
          NUNOTA: { $: Number(nunota) },
          confirmacaoCentralNota: { $: true },
          ehPedidoWeb: { $: false },
          atualizaPrecoItemPedCompra: { $: false },
        },
      },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));

      const data = resp?.data;
      const status = data?.status;
      const statusMessage = data?.statusMessage;

      // ✅ log útil pra saber se a Sankhya realmente confirmou
      console.log('CONFIRMAR NOTA ->', {
        nunota,
        status,
        statusMessage,
        transactionId: data?.transactionId,
        serviceName: data?.serviceName,
      });

      if (status && String(status) !== '1') {
        throw new Error(`Sankhya não confirmou. status=${status} message=${statusMessage ?? '-'}`);
      }

      return data;
    } catch (err: any) {
      const d = err?.response?.data ?? err?.response ?? null;
      const msg =
        d?.statusMessage ||
        d?.message ||
        err?.message ||
        'Erro ao confirmar nota (sem detalhes)';

      console.error('ERRO CONFIRMAR NOTA ->', { nunota, msg, data: d });
      throw err;
    }
  }


  //#endregion

  //#region Transporte+

  async getNumUnicoByNotaWithout701(numNota: number | string, token: string): Promise<string | null> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const data = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: {
              $:
                `(this.NUMNOTA = ${numNota} AND (this.CODTIPOPER = 700 OR this.CODTIPOPER = 714 OR this.CODTIPOPER = 326 OR this.CODTIPOPER = 322 OR this.CODTIPOPER = 335 OR this.CODTIPOPER = 383))`,
            },
          },
          entity: {
            fieldset: {
              list: 'CODPARC,NUNOTA,CODEMP,DTNEG',
            },
          },
        },
      },
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      // appkey: 'SEU_APPKEY' // se precisar no seu ambiente
    };

    const resp = await firstValueFrom(
      this.http.request({
        method: 'GET', // pode trocar para POST se preferir
        url,
        headers,
        data,
      }),
    );

    const entities = resp.data?.responseBody?.entities;
    if (!entities) return null;

    // mapeia metadados para identificar índice do NUNOTA
    const fields = entities?.metadata?.fields?.field || [];
    const fmap: Record<string, string> = Object.fromEntries(
      fields.map((f: any, i: number) => [f.name, `f${i}`]),
    );
    const nunotaKey = fmap['NUNOTA'] || 'f0';

    // normaliza para array
    const raw = entities?.entity;
    const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    if (!list.length) return null;

    return list[0]?.[nunotaKey]?.$ ?? list[0]?.[nunotaKey] ?? null;
  }

  async getNumUnicoByNotaWith701(numNota: number | string, token: string): Promise<string | null> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const data = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: {
              $:
                `(this.NUMNOTA = ${numNota} AND (this.CODTIPOPER = 701))`,
            },
          },
          entity: {
            fieldset: {
              list: 'CODPARC,NUNOTA,CODEMP,DTNEG',
            },
          },
        },
      },
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      // appkey: 'SEU_APPKEY' // se precisar no seu ambiente
    };

    const resp = await firstValueFrom(
      this.http.request({
        method: 'GET', // pode trocar para POST se preferir
        url,
        headers,
        data,
      }),
    );

    const entities = resp.data?.responseBody?.entities;
    if (!entities) return null;

    // mapeia metadados para identificar índice do NUNOTA
    const fields = entities?.metadata?.fields?.field || [];
    const fmap: Record<string, string> = Object.fromEntries(
      fields.map((f: any, i: number) => [f.name, `f${i}`]),
    );
    const nunotaKey = fmap['NUNOTA'] || 'f0';

    // normaliza para array
    const raw = entities?.entity;
    const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    if (!list.length) return null;

    return list[0]?.[nunotaKey]?.$ ?? list[0]?.[nunotaKey] ?? null;
  }

  async atualizarStatus(nunota, ocorrencia, status, entregador, tipoEnvio, token) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        entityName: 'CabecalhoNota',
        standAlone: false,
        fields: ['NUNOTA', 'AD_OCORRENCIA_DE_ENTREGA', 'AD_STATUSENTREGA', 'AD_ENTREGADOR', 'AD_TIPOENVIO'],
        records: [
          {
            pk: { NUNOTA: nunota },
            values: {
              1: ocorrencia,
              2: status,
              3: entregador,
              4: tipoEnvio,
            },
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }

  async getNote(NUNOTE: string, AuthToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AuthToken}`,
    };

    const data = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          metadata: 'S',
          offsetPage: '0',
          criteria: {
            expression: {
              $: `(this.NUNOTA = '${NUNOTE}')`,
            },
          },
          entity: {
            fieldset: {
              list: 'NUNOTA,CODVENDTEC,DTNEG,VLRNOTA,CODPARC,AD_STATUSENTREGA',
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, data, { headers }));

    const entities = resp.data?.responseBody?.entities?.entity;
    if (!entities) return null;

    // normaliza: pode vir objeto único ou array
    const list: any[] = Array.isArray(entities) ? entities : [entities];

    if (list.length === 0) return null;
    if (list.length === 1) return list[0];

    // pega o campo DTNEG dos metadados
    // entities.metadata.fields.field => mapeia nomes
    const fields = resp.data?.responseBody?.entities?.metadata?.fields?.field;
    const arrFields = Array.isArray(fields) ? fields : [fields];
    const idxByName: Record<string, string> = Object.fromEntries(
      arrFields.map((f: any, i: number) => [f.name, `f${i}`]),
    );

    // converte DTNEG em Date e escolhe a mais recente
    const sorted = [...list].sort((a, b) => {
      const aDate = new Date(a?.[idxByName['DTNEG']]?.$ ?? 0).getTime();
      const bDate = new Date(b?.[idxByName['DTNEG']]?.$ ?? 0).getTime();
      return bDate - aDate;
    });

    return sorted[0];
  }

  async getNotes(AuthToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AuthToken}`,
    };

    // expressão do filtro (a mesma que você especificou)
    const whereExpr = `
(
  this.VLRNOTA > 0
  AND this.PENDENTE = 'S'
  AND this.CODTIPOPER IN (326, 700, 701)
  AND this.DTNEG > TO_DATE('21/03/2025','DD/MM/YYYY')
  AND NVL(TRIM(UPPER(this.AD_OCORRENCIA_DE_ENTREGA)),'SEM_VALOR') <> 'FINALIZADO'
  AND NOT (
    (
      TRIM(UPPER(this.AD_OCORRENCIA_DE_ENTREGA)) IN (
        'ENVIADO PARA SALA DE ESPERA',
        'ENVIAR PARA SALA DE ESPERA',
        'REALIZAR A ENTREGA PARCIAL'
      )
      AND TRIM(UPPER(this.AD_STATUSENTREGA)) = 'EM ANDAMENTO'
      AND this.AD_ENTREGADOR IS NOT NULL
      AND TRIM(UPPER(this.AD_TIPOENVIO)) = 'EM ANDAMENTO'
    )
    OR
    (
      TRIM(UPPER(this.AD_OCORRENCIA_DE_ENTREGA)) IN (
        'REALIZADO ENTREGA COMPLETA',
        'REALIZAR A ENTREGA COMPLETA',
        'REALIZAR A ENTREGA',
        'EXCLUIR ENTREGA',
        'MERCADORIA ENTREGUE COM SUCESSO',
        'REALIZADO ENTREGA PARCIAL'
      )
      AND TRIM(UPPER(this.AD_STATUSENTREGA)) = 'FINALIZADO'
      AND this.AD_ENTREGADOR IS NOT NULL
      AND TRIM(UPPER(this.AD_TIPOENVIO)) = 'ENTREGUE'
    )
  )
  AND this.AD_OCORRENCIA_DE_ENTREGA IS NULL
)
`.trim();

    // Campos que precisamos (pode ajustar aqui depois)
    const fieldList = [
      'NUNOTA',
      'NUMNOTA',
      'DTNEG',
      'VLRNOTA'
    ].join(',');

    // helper p/ mapear entity => objeto com chaves de metadados
    const mapEntities = (entitiesRoot: any) => {
      const fieldsMeta = entitiesRoot?.metadata?.fields?.field;
      const fieldsArr = Array.isArray(fieldsMeta) ? fieldsMeta : fieldsMeta ? [fieldsMeta] : [];
      const idxByName: Record<string, string> = Object.fromEntries(
        fieldsArr.map((f: any, i: number) => [f.name, `f${i}`])
      );

      const raw = entitiesRoot?.entity;
      const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

      // converte cada linha: { f0: { $: valor }, f1: {...} } => { NUNOTA: valor, NUMNOTA: valor, ... }
      const rows = list.map((row: any) => {
        const out: Record<string, any> = {};
        for (const [name, fkey] of Object.entries(idxByName)) {
          const v = row?.[fkey];
          out[name] = v?.$ ?? v ?? null; // resolve {$: ...} ou valor direto
        }
        return out;
      });

      return rows;
    };

    const allRows: any[] = [];
    let page = 0;

    while (true) {
      const data = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'CabecalhoNota',
            includePresentationFields: 'S',
            metadata: 'S',
            offsetPage: String(page),   // paginação
            // se quiser forçar 50 por página explicitamente (opcional):
            // rows: '50',
            criteria: {
              expression: { $: whereExpr },
            },
            entity: {
              fieldset: { list: fieldList },
            },
          },
        },
      };

      const resp = await firstValueFrom(this.http.post(url, data, { headers }));
      const entitiesRoot = resp.data?.responseBody?.entities;

      // quando não vier nada, encerramos
      if (!entitiesRoot?.entity) break;

      const rows = mapEntities(entitiesRoot);
      if (!rows.length) break;

      allRows.push(...rows);

      // Se retornou menos de 50, provavelmente acabou
      if (rows.length < 50) break;

      page += 1;
    }

    // Retorna tudo ordenado pela DTNEG (mais recente primeiro)
    // DTNEG vem como string ISO ou data formatada pelo Sankhya (depende do ambiente),
    // então usamos Date.parse com fallback.
    const sorted = [...allRows].sort((a, b) => {
      const aTs = Date.parse(a.DTNEG || '') || 0;
      const bTs = Date.parse(b.DTNEG || '') || 0;
      return bTs - aTs;
    });

    return sorted;
  }

  //#endregion

  //#region [CODIGOS DE USO UNICO] 

  async atualizarCorProduto(cod, corFundo, corFonte, token) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        entityName: 'Produto',
        standAlone: false,
        fields: ['CODPROD', 'CORFUNDOCONSPRECO', 'CORFONTCONSPRECO'],
        records: [
          {
            pk: { CODPROD: cod },
            values: {
              1: corFundo,
              2: corFonte,
            },
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }

  // Dentro do seu SankhyaService
  async logEstoque1400_fromCurl(authToken: string): Promise<string> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      appkey: this.appKey, // se seu ambiente exigir
    };

    let page = 0;
    const recordCount = 100;
    let hasMore = true;

    // acumula todos os itens mapeados
    const acumulado: Array<{
      COD: string | null;
      Descrição: string | null;
      Estoque: number;
      CODLOCAL?: string | null;
    }> = [];

    while (hasMore) {
      const data = {
        requestBody: {
          dataSet: {
            rootEntity: 'Estoque',
            includePresentationFields: 'S',
            offsetPage: String(page),
            recordCount: String(recordCount),
            criteria: {
              expression: {
                $: 'this.ESTOQUE > ? AND this.CODLOCAL = ?',
              },
              parameter: [
                { $: '0', type: 'I' },
                { $: '1400', type: 'I' },
              ],
            },
            entity: {
              fieldset: {
                // Apenas campos da entidade raiz; os de apresentação virão via includePresentationFields = 'S'
                list: 'CODPROD,CODLOCAL,ESTOQUE',
              },
            },
          },
        },
      };

      // Mantive GET para espelhar seu cURL (funciona); se preferir, pode usar POST
      const resp = await firstValueFrom(
        this.http.request({ method: 'GET', url, headers, data })
      );

      const entities = resp.data?.responseBody?.entities;
      const raw = entities?.entity;
      const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

      // Mapeia índices f0,f1.. para nomes reais via metadata
      const fields = entities?.metadata?.fields?.field ?? [];
      const map: Record<string, string> = Object.fromEntries(
        fields.map((f: any, i: number) => [f.name, `f${i}`])
      );

      // Constrói linhas já com os nomes desejados na planilha
      const linhas = list.map((e) => ({
        COD: e?.[map['CODPROD']]?.$ ?? null,
        Descrição: e?.[map['Produto_DESCRPROD']]?.$ ?? null, // presentation field
        Estoque: Number(e?.[map['ESTOQUE']]?.$ ?? 0),
        CODLOCAL: e?.[map['CODLOCAL']]?.$ ?? null, // opcional (pode remover da planilha se não quiser)
      }));

      acumulado.push(...linhas);

      hasMore = String(entities?.hasMoreResult).toLowerCase() === 'true';
      page++;
    }

    // === GERAR PLANILHA ===
    // Se não quiser a coluna CODLOCAL, remova aqui:
    const rowsForSheet = acumulado.map(({ COD, Descrição, Estoque /*, CODLOCAL*/ }) => ({
      COD,
      Descrição,
      Estoque,
      // CODLOCAL, // descomente se quiser incluir
    }));

    const ws = XLSX.utils.json_to_sheet(rowsForSheet, { header: ['COD', 'Descrição', 'Estoque'] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque 1400');

    // cria pasta ./exports se não existir
    const dir = path.resolve(process.cwd(), 'exports');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fileName = `estoque_1400_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.xlsx`;
    const filePath = path.join(dir, fileName);

    XLSX.writeFile(wb, filePath);

    // Retorna o caminho do arquivo gerado (útil para log/download)
    return filePath;
  }

  async exportProdutosPrecoZeroOuNullPorTabelaExcel_Contextualizado(
    authToken: string,
    codigoTabela: number,
  ): Promise<string> {
    const pageSize = 50;
    let page = 0;

    // 1) Buscar TODOS os produtos (apenas o necessário)
    const produtos: Array<{ CODPROD: string; DESCRPROD: string | null }> = [];

    for (; ;) {
      const payload = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Produto',
            includePresentationFields: 'N',
            offsetPage: String(page),
            pageSize: String(pageSize),
            entity: { fieldset: { list: 'CODPROD,DESCRPROD,USOPROD,ATIVO' } },
          },
        },
      };

      const data = await this.callSankhya(payload, authToken);
      const entities = data?.responseBody?.entities;
      const raw = entities?.entity;
      const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
      if (list.length === 0) break;

      for (const e of list) {
        const cod = e.f0?.['$'] ?? null;
        const descr = e.f1?.['$'] ?? null;
        if (cod) produtos.push({ CODPROD: String(cod), DESCRPROD: descr });
      }

      // continua até acabar (só aqui usamos paginação — na parte de preços não)
      if (String(entities?.hasMoreResult).toLowerCase() !== 'true' || list.length < pageSize) break;
      page++;
    }

    // 2) Preços contextualizados em LOTES de 50 e empilhando com push (sem paginação de preço)
    const rows: Array<{ CODPROD: string; DESCRPROD: string | null; PRECO: string | null }> = [];

    // helper para fatiar em lotes de 50
    const chunk = <T,>(arr: T[], size: number) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size),
      );

    const lotes = chunk(produtos, 50);

    for (const lote of lotes) {
      try {
        // *** Ajuste o BODY conforme seu ambiente ***
        const body = {
          // alguns ambientes aceitam só "tabela": codigoTabela
          tabela: codigoTabela,
          // outros pedem objeto: { codigo: codigoTabela }
          // tabela: { codigo: codigoTabela },

          // lista de produtos: { codigo } ou { codProd }
          produtos: lote.map(p => ({ codigo: Number(p.CODPROD) })),
          // se seu ambiente exigir mais contexto (empresa, canal, parceiro), inclua aqui:
          // empresa: 1,
          // canalVenda: '1',
          // parceiro: 123,
        };

        const resp: any = await firstValueFrom(
          this.http.post('https://api.sankhya.com.br/v1/precos/contextualizado', body, {
            headers: { Authorization: `Bearer ${authToken}`, appkey: this.appKey },
            timeout: 60000,
          }),
        );

        // *** Ajuste as chaves conforme a resposta no seu ambiente ***
        // Normalmente vem algo como: { produtos: [ { codigo: 123, valor: "0.00", ... }, ... ] }
        const precos: any[] = Array.isArray(resp?.data?.produtos) ? resp.data.produtos : [];

        // Empilha no array final com .push (sem paginação extra)
        for (const prec of precos) {
          // identificar o código do produto e o valor
          // use 'codigo' ou 'codProd' conforme vier na resposta
          const cod = String(prec?.codigo ?? prec?.codProd ?? '');
          const valorStr = prec?.valor ?? null;
          const valorNum =
            valorStr != null ? Number(String(valorStr).replace(',', '.')) : null;

          if (cod) {
            // Captura a descrição do cadastro carregada antes
            const descr = lote.find(p => p.CODPROD === cod)?.DESCRPROD ?? null;

            // FILTRO: somente preço 0 ou null
            if (valorNum === null || isNaN(valorNum) || valorNum === 0) {
              rows.push({
                CODPROD: cod,
                DESCRPROD: descr,
                PRECO: valorStr, // guarda como string original (ou null)
              });
            }
          }
        }
      } catch (err: any) {
        // Se o lote falhar, marca todos os itens do lote como sem preço (opcional)
        for (const p of lote) {
          rows.push({ CODPROD: p.CODPROD, DESCRPROD: p.DESCRPROD, PRECO: null });
        }
        // this.logger.warn(`Falha no lote: ${err?.message || err}`);
      }
    }

    // 3) Gerar Excel
    await fS.mkdir(this.outputDir, { recursive: true });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('PrecoZeroOuNull (Contextualizado)');

    ws.columns = [
      { header: 'CODPROD', key: 'CODPROD', width: 12 },
      { header: 'DESCRPROD', key: 'DESCRPROD', width: 40 },
      { header: 'PRECO', key: 'PRECO', width: 14 },
    ];
    ws.addRows(rows);
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(
      this.outputDir,
      `produtos_preco_zero_context_${codigoTabela}_${stamp}.xlsx`,
    );
    await wb.xlsx.writeFile(filePath);
    this.logger.log(`Planilha gerada: ${filePath}`);

    return filePath;
  }

  private async callSankhya(body: any, authToken: string) {
    const { data } = await firstValueFrom(
      this.http.post(this.serviceUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          appkey: this.appKey,
        },
        timeout: 60_000,
      }),
    );
    // opcional: validar status === '1'
    return data;
  }


  async getProductsByLocation(location: string, token: string): Promise<any[]> {
    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Produto',
          includePresentationFields: 'N',
          tryJoinedFields: 'true',
          offsetPage: '0',
          criteria: {
            expression: { $: 'this.LOCALIZACAO = ?' },
            parameter: [{ $: location, type: 'S' }],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'CODPROD,DESCRPROD,LOCALIZACAO',
              },
            },
          ],
        },
      },
    };

    const data = await this.callSankhya(payload, token);

    const entities = data?.responseBody?.entities?.entity;
    const list: any[] = Array.isArray(entities) ? entities : entities ? [entities] : [];

    return list.map((e) => ({
      CODPROD: Number(e.f0?.$ ?? e.f0 ?? 0),
      DESCRPROD: e.f1?.$ ?? e.f1 ?? null,
      LOCALIZACAO: e.f2?.$ ?? e.f2 ?? location,
    }));
  }


  //#endregion


  //

  /**
   * Executa o SQL do gadget e retorna TODOS os itens com TODAS as colunas.
   * Pagina por CODPROD (keyset) + ROWNUM, evitando limite/bug do offsetPage.
   */

  async getcurvaProdutoFromGadgetSql(authToken: string): Promise<GadgetRow[]> {
    if (!authToken) throw new Error('authToken é obrigatório');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      appkey: this.appKey,
    };

    const pageSize = 5000;
    let lastCodProd = 0;

    const all: GadgetRow[] = [];
    const seenLast = new Set<number>(); // trava anti-loop

    // SQL do gadget (mesmo conteúdo). A paginação vai envolver isso num SELECT externo.
    const gadgetSql = `
      WITH EST AS (
        SELECT
          e.codprod,
          e.codlocal,
          SUM(NVL(e.estoque,0)) AS estoque_total,
          SUM(NVL(e.reservado,0)) AS reservado_total
        FROM tgfest e
        WHERE e.codlocal = 1100
        GROUP BY e.codprod, e.codlocal
      ),
      SAIDAS AS (
        SELECT
          i.codprod,
          SUM(CASE WHEN c.codtipoper = 700 THEN NVL(i.qtdneg,0) ELSE 0 END) AS saidas_700,
          SUM(CASE WHEN c.codtipoper = 701 THEN NVL(i.qtdneg,0) ELSE 0 END) AS saidas_701,
          SUM(CASE WHEN c.codtipoper = 326 THEN NVL(i.qtdneg,0) ELSE 0 END) AS saidas_326,
          SUM(CASE WHEN c.codtipoper IN (700,701,326) THEN NVL(i.qtdneg,0) ELSE 0 END) AS saidas_total,
          COUNT(DISTINCT CASE WHEN c.codtipoper IN (700,701,326) THEN c.nunota END) AS qtd_notas_saida
        FROM tgfite i
        JOIN tgfcab c ON c.nunota = i.nunota
        WHERE c.codtipoper IN (700,701,326)
          AND NVL(c.numnota,0) <> 0
          AND c.dtneg >= ADD_MONTHS(TRUNC(SYSDATE), -12)
        GROUP BY i.codprod
      ),
      BASE AS (
        SELECT
          p.codprod,
          p.descrprod,
          p.marca,
          p.codgrupoprod,
          gru.descrgrupoprod,
          p.usoprod,
          p.ativo,
          NVL(p.localizacao,'') AS localizacao,
          est.codlocal AS local,
          NVL(est.estoque_total,0) AS estoque_total,
          NVL(est.reservado_total,0) AS reservado_total,
          (NVL(est.estoque_total,0) - NVL(est.reservado_total,0)) AS disponivel,
          NVL(s.saidas_700,0) AS saidas_700,
          NVL(s.saidas_701,0) AS saidas_701,
          NVL(s.saidas_326,0) AS saidas_326,
          NVL(s.saidas_total,0) AS saidas_total,
          NVL(s.qtd_notas_saida,0) AS qtd_notas_saida
        FROM tgfpro p
        LEFT JOIN tgfgru gru ON gru.codgrupoprod = p.codgrupoprod
        JOIN EST est ON est.codprod = p.codprod
        LEFT JOIN SAIDAS s ON s.codprod = p.codprod
      ),
      ABC AS (
        SELECT
          b.*,
          ROW_NUMBER() OVER (
            PARTITION BY b.codgrupoprod
            ORDER BY b.saidas_total DESC, b.codprod
          ) AS rank_12m_grupo,
          SUM(b.saidas_total) OVER (
            PARTITION BY b.codgrupoprod
          ) AS total_saidas_12m_grupo,
          SUM(b.saidas_total) OVER (
            PARTITION BY b.codgrupoprod
            ORDER BY b.saidas_total DESC, b.codprod
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS acum_saidas_12m_grupo
        FROM BASE b
      )
      SELECT
        a.*,
        CASE
          WHEN NVL(a.saidas_total,0) = 0 THEN 'D'
          WHEN a.total_saidas_12m_grupo = 0 THEN 'C'
          WHEN (a.acum_saidas_12m_grupo / a.total_saidas_12m_grupo) <= 0.75 THEN 'A'
          WHEN (a.acum_saidas_12m_grupo / a.total_saidas_12m_grupo) <= 0.99 THEN 'B'
          ELSE 'C'
        END AS curva_abc_12m,
        ROUND(
          CASE
            WHEN a.total_saidas_12m_grupo = 0 THEN 0
            ELSE (a.acum_saidas_12m_grupo / a.total_saidas_12m_grupo) * 100
          END,
          2
        ) AS pct_acum_12m
      FROM ABC a
          `.replace(/\s+/g, ' ').trim();

    const normalizeExecuteQueryRows = (data: any): GadgetRow[] => {
      // Alguns ambientes retornam:
      // - responseBody.rows (array de objetos)
      // - responseBody.result / data
      // - responseBody (lista)
      // - rows com f0,f1...
      const rb = data?.responseBody ?? data;

      const rows =
        rb?.rows ??
        rb?.result ??
        rb?.data ??
        rb?.dados ??
        rb?.registros ??
        [];

      const arr = Array.isArray(rows) ? rows : rows ? [rows] : [];

      // Caso venha como { columns: [...], rows: [[...],[...]] } (alguns retornos de executeQuery)
      if (arr.length === 1 && arr[0] && Array.isArray(arr[0].columns) && Array.isArray(arr[0].rows)) {
        const cols = arr[0].columns.map((c: any) => String(c?.name ?? c ?? '').toUpperCase());
        return arr[0].rows.map((line: any[]) => {
          const obj: any = {};
          cols.forEach((col: string, i: number) => (obj[col] = line?.[i] ?? null));
          return obj;
        });
      }

      // Caso padrão: array de objetos já “nomeados”
      // ou objetos com f0..fN (sem metadata)
      return arr.map((r: any) => {
        if (!r || typeof r !== 'object') return {};
        // se tiver $ (estilo loadRecords), extrai
        const out: any = {};
        for (const [k, v] of Object.entries(r)) {
          if (v && typeof v === 'object' && '$' in (v as any)) out[k.toUpperCase()] = (v as any).$;
          else out[k.toUpperCase()] = v;
        }
        return out;
      });
    };

    // 🔁 Loop de páginas (keyset)
    for (let guard = 0; guard < 5000; guard++) {
      // Envolve o gadgetSql e pagina por CODPROD + ROWNUM
      // Mantém TODAS as colunas do gadget.
      const pagedSql = `
        SELECT * FROM (
          SELECT q.* FROM (
            ${gadgetSql}
          ) q
          WHERE q.CODPROD > ${Number(lastCodProd)}
          ORDER BY q.CODPROD
        )
        WHERE ROWNUM <= ${pageSize}
              `.replace(/\s+/g, ' ').trim();

      const body = {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: {
          sql: pagedSql,
        },
      };

      const resp = await firstValueFrom(this.http.post(this.executeQueryUrl, body, { headers }));
      const data = resp?.data;

      // Erro do gateway
      const errMsg =
        data?.error?.descricao ||
        data?.error?.message ||
        data?.responseBody?.errorMessage ||
        data?.statusMessage;
      if (errMsg) throw new Error(errMsg);

      const rows = normalizeExecuteQueryRows(data);

      if (rows.length === 0) break;

      // tenta descobrir CODPROD de forma tolerante
      const getCodProd = (r: any): number => {
        const v =
          r?.CODPROD ??
          r?.codprod ??
          r?.F0 ??
          r?.f0 ??
          r?.['0'] ??
          null;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      // adiciona
      all.push(...rows);

      // avança a paginação
      const maxCodProd = rows.reduce((m, r) => Math.max(m, getCodProd(r)), lastCodProd);

      if (!maxCodProd || maxCodProd <= lastCodProd) {
        // trava anti-loop: se não avançou, para e acusa
        throw new Error(
          `Paginação travou: CODPROD não avançou (lastCodProd=${lastCodProd}, maxCodProd=${maxCodProd}). ` +
          `Possível retorno sem CODPROD ou formato inesperado do executeQuery.`,
        );
      }

      if (seenLast.has(maxCodProd)) {
        throw new Error(
          `Paginação travou: mesma "última chave" repetida (CODPROD=${maxCodProd}).`,
        );
      }
      seenLast.add(maxCodProd);

      lastCodProd = maxCodProd;

      // se veio menos que o tamanho, acabou
      if (rows.length < pageSize) break;
    }
    console.log(all)
    return all;
  }


  async updateCoresConsultaPrecoPermCompProdN(authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const sql = `
    UPDATE tgfpro
      SET corfontconspreco  = 16777215,
          corfundoconspreco = 255
    WHERE permcompprod = 'N'
    `.trim();

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: {
        sql,
      },
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(msg || `Falha ao executar SQL (status ${resp.status})`);
    }

    return resp.json();
  }

  async emSeparacao(nunota: number, dtneg: string, hrneg: string, authToken: string) {
    if (!authToken?.trim()) throw new Error('authToken é obrigatório');
    //if (!Number.isFinite(codBarra))  throw new Error('codBarra é obrigatório');
    if (!Number.isFinite(nunota)) throw new Error('nunota inválido');

    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'CabecalhoNota',
        standAlone: false,
        fields: ['NUNOTA', 'AD_EMSEPARACAO'],
        records: [
          {
            pk: { NUNOTA: nunota },
            values: {
              1: 'S',
            },
          },
        ],
      },
    };

    const { data } = await firstValueFrom(
      this.http.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          appkey: this.appKey,
        },
      }),
    );

    if (data?.status !== '1') {
      const msg =
        data?.statusMessage ||
        data?.responseBody?.errorMessage ||
        JSON.stringify(data);
      throw new Error(`Falha ao lançar pedido para separação: ${msg}`);
    }

    return data;
  }

  async deseparacao(nunota: number, authToken: string) {
    if (!authToken?.trim()) throw new Error('authToken é obrigatório');
    //if (!Number.isFinite(codBarra))  throw new Error('codBarra é obrigatório');
    if (!Number.isFinite(nunota)) throw new Error('nunota inválido');

    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'CabecalhoNota',
        standAlone: false,
        fields: ['NUNOTA', 'AD_EMSEPARACAO'],
        records: [
          {
            // normalmente CODBARRA é a PK
            pk: { NUNOTA: nunota },
            // valores na mesma ordem de "fields"
            values: {
              1: '',
            },
          },
        ],
      },
    };

    const { data } = await firstValueFrom(
      this.http.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          appkey: this.appKey,
        },
      }),
    );

    if (data?.status !== '1') {
      const msg =
        data?.statusMessage ||
        data?.responseBody?.errorMessage ||
        JSON.stringify(data);
      throw new Error(`Falha ao criar CodigoBarras: ${msg}`);
    }

    return data;
  }

  //#region ifood

  async listarProdutosPorGrupoEFabricante(
    params: ProdutoListaParams,
    token: string
  ): Promise<{ items: any[]; total: number }> {

    const {
      groupId,
      manufacturerId,
      manufacturerIds,
      search,
      limit,
      offset,
    } = params;

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const manufacturerList = Array.isArray(manufacturerIds)
      ? manufacturerIds.filter((x) => Number.isFinite(x))
      : [];

    if (manufacturerList.length === 0 && Number.isFinite(manufacturerId)) {
      manufacturerList.push(Number(manufacturerId));
    }

    const conditions: string[] = [
      `PRO.ATIVO = 'S'`,
      `PRO.USOPROD = 'R'`,
      `BAR.CODBARRA IS NOT NULL`,
      `TRIM(BAR.CODBARRA) IS NOT NULL`,
    ];

    if (Number.isFinite(groupId)) {
      conditions.push(`PRO.CODGRUPOPROD = ${Number(groupId)}`);
    }

    if (manufacturerList.length > 0) {
      conditions.push(`PRO.CODFAB IN (${manufacturerList.join(',')})`);
    }

    if (search?.trim()) {
      const s = search.trim().replace(/'/g, "''");

      if (/^\d+$/.test(s)) {
        conditions.push(`
          (
            PRO.CODPROD = ${Number(s)}
            OR BAR.CODBARRA = '${s}'
            OR UPPER(PRO.DESCRPROD) LIKE UPPER('%${s}%')
          )
        `);
      } else {
        conditions.push(`
          (
            UPPER(PRO.DESCRPROD) LIKE UPPER('%${s}%')
            OR UPPER(NVL(FAB.NOMEFANTASIA, FAB.RAZAOSOCIAL)) LIKE UPPER('%${s}%')
          )
        `);
      }
    }

    const whereClause = conditions.join(' AND ');

    const url = `${process.env.SANKHYA_API_URL || 'https://api.sankhya.com.br'}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const sqlItems = `
      SELECT * FROM (
        SELECT
          PRO.CODPROD,
          PRO.DESCRPROD,
          PRO.CODGRUPOPROD,
          GRU.DESCRGRUPOPROD,
          NVL(FAB.NOMEFANTASIA, FAB.RAZAOSOCIAL) AS MARCA,
          PRO.CODFAB,
          PRO.ATIVO,
          PRO.USOPROD,
          BAR.CODBARRA
        FROM TGFPRO PRO
        INNER JOIN TGFGRU GRU ON GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
        INNER JOIN TGFBAR BAR ON BAR.CODPROD = PRO.CODPROD
        LEFT JOIN TGFABR FAB ON FAB.CODFAB = PRO.CODFAB
        WHERE ${whereClause}
        ORDER BY PRO.CODPROD, BAR.CODBARRA
      )
      OFFSET ${safeOffset} ROWS FETCH NEXT ${safeLimit * 20} ROWS ONLY
    `.trim();

    const sqlTotal = `
      SELECT COUNT(DISTINCT PRO.CODPROD)
      FROM TGFPRO PRO
      INNER JOIN TGFBAR BAR ON BAR.CODPROD = PRO.CODPROD
      LEFT JOIN TGFABR FAB ON FAB.CODFAB = PRO.CODFAB
      WHERE ${whereClause}
    `.trim();

    const [respItems, respTotal] = await Promise.all([
      firstValueFrom(this.http.post(url, {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql: sqlItems },
      }, { headers })),
      firstValueFrom(this.http.post(url, {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql: sqlTotal },
      }, { headers })),
    ]);

    const dataItems = respItems?.data;
    const dataTotal = respTotal?.data;

    if (dataItems?.status === '0') {
      const cod = dataItems?.tsError?.tsErrorCode ? ` (${dataItems.tsError.tsErrorCode})` : '';
      const msg = dataItems?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
      throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
    }

    if (dataTotal?.status === '0') {
      const cod = dataTotal?.tsError?.tsErrorCode ? ` (${dataTotal.tsError.tsErrorCode})` : '';
      const msg = dataTotal?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
      throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
    }

    const rowsItems: any[] =
      dataItems?.responseBody?.rows ??
      dataItems?.responseBody?.result ??
      dataItems?.rows ??
      [];

    const rowsTotal: any[] =
      dataTotal?.responseBody?.rows ??
      dataTotal?.responseBody?.result ??
      dataTotal?.rows ??
      [];

    const productsMap = new Map<number, any>();

    const safeStr = (v: any) => (v == null ? '' : String(v).trim());
    const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

    for (const r of rowsItems) {
      const codProd = safeNum(r[0]);
      const descrprod = safeStr(r[1]);
      const codGrupo = safeNum(r[2]);
      const descrGrupo = safeStr(r[3]);
      const marca = safeStr(r[4]);
      const codFab = safeNum(r[5]);
      const ativo = safeStr(r[6]);
      const usoProd = safeStr(r[7]);
      const codBarra = safeStr(r[8]);

      if (!codProd || !codBarra) continue;

      if (!productsMap.has(codProd)) {
        productsMap.set(codProd, {
          CODPROD: codProd,
          DESCRPROD: descrprod,
          CODGRUPOPROD: codGrupo,
          DESCRGRUPOPROD: descrGrupo,
          MARCA: marca,
          CODFAB: codFab,
          ATIVO: ativo,
          USOPROD: usoProd,
          CODBARRA: codBarra,
          CODBARRAS: [codBarra],
        });
      } else {
        const prod = productsMap.get(codProd);
        if (!prod.CODBARRAS.includes(codBarra)) {
          prod.CODBARRAS.push(codBarra);
        }
      }
    }

    const groupedItems = Array.from(productsMap.values())
      .slice(0, safeLimit);

    const total = Number(rowsTotal?.[0]?.[0] ?? 0);

    return {
      items: groupedItems,
      total,
    };
  }

  //#endregion


  //#region Notas

  //lista todas as notas não confirmadas, paginando externamente | Metodo Não utilizado mais
  async listarNotasNaoConfirmadasPaginado(
    authToken: string,
    opts?: { pageSize?: number; cursorDtneg?: string; cursorNunota?: number; codtipoper?: number },
  ) {
    const pageSize = opts?.pageSize ?? 5000;
    const codtipoper = opts?.codtipoper ?? 601;

    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    // cursor (keyset pagination): pega "mais antigos" que o último item da página anterior
    const whereCursor =
      opts?.cursorDtneg && opts?.cursorNunota
        ? `
          AND (
                c.DTNEG < TO_DATE('${opts.cursorDtneg}','YYYY-MM-DD HH24:MI:SS')
             OR (c.DTNEG = TO_DATE('${opts.cursorDtneg}','YYYY-MM-DD HH24:MI:SS') AND c.NUNOTA < ${opts.cursorNunota})
          )
        `
        : '';

    const sql = `
      SELECT *
      FROM (
        SELECT
          c.NUNOTA,
          c.NUMNOTA,
          c.STATUS, -- (mantive, mas você pode tirar)
          c.CODEMP,
          c.CODPARC,
          c.CODTIPOPER,
          TO_CHAR(c.DTNEG,'YYYY-MM-DD HH24:MI:SS') AS DTNEG,
          TO_CHAR(c.DTENTSAI,'YYYY-MM-DD HH24:MI:SS') AS DTENTSAI,
          c.STATUSNOTA
        FROM TGFCAB c
        WHERE NVL(c.STATUSNOTA,'L') <> 'L'
          AND c.CODTIPOPER = ${codtipoper}
          ${whereCursor}
        ORDER BY c.DTNEG DESC, c.NUNOTA DESC
      )
      WHERE ROWNUM <= ${pageSize}
    `;

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    const data = resp?.data;

    if (data?.status === '0') {
      const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
      const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
      throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
    }

    const rows: any[] =
      data?.responseBody?.rows ??
      data?.responseBody?.result ??
      data?.rows ??
      [];

    const mapped = rows
      .map((r) => this.mapNotaRow(r))
      .filter(Boolean) as NotaNaoConfirmada[];

    return mapped;
  }

  //lista todas as notas não confirmadas, paginando internamente 
  async listarNotasNaoConfirmadas2(authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const pageSize = 5000;

    let lastDtneg: string | null = null;   // vamos usar string no formato do banco
    let lastNunota: number | null = null;

    const allRows: any[] = [];

    while (true) {
      const whereCursor =
        lastDtneg && lastNunota != null
          ? `
          AND (
            c.DTNEG < TO_DATE('${lastDtneg}','YYYY-MM-DD HH24:MI:SS')
            OR (c.DTNEG = TO_DATE('${lastDtneg}','YYYY-MM-DD HH24:MI:SS') AND c.NUNOTA < ${lastNunota})
          )
        `
          : '';

      const sql = `
      SELECT *
      FROM (
        SELECT
          c.NUNOTA,
          c.NUMNOTA,
          c.SERIENOTA,
          c.CODEMP,
          c.CODPARC,
          c.CODTIPOPER,
          TO_CHAR(c.DTNEG,'YYYY-MM-DD HH24:MI:SS') AS DTNEG,
          TO_CHAR(c.DTENTSAI,'YYYY-MM-DD HH24:MI:SS') AS DTENTSAI,
          c.STATUSNOTA
        FROM TGFCAB c
        WHERE NVL(c.STATUSNOTA,'L') <> 'L'
         AND c.CODTIPOPER = 601
         AND c.DTNEG < TRUNC(SYSDATE)
        ${whereCursor}
        ORDER BY c.DTNEG DESC, c.NUNOTA DESC
      )
      WHERE ROWNUM <= ${pageSize}
    `;

      const body = {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql },
      };

      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      // erro "aplicacional" do Sankhya
      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
        throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }

      const rows =
        data?.responseBody?.rows ??
        data?.responseBody?.result ??
        data?.rows ??
        [];

      if (!Array.isArray(rows) || rows.length === 0) break;

      allRows.push(...rows);

      // pega o último item do lote para virar o cursor
      const last = rows[rows.length - 1];

      // ⚠️ Aqui depende do formato que o DbExplorer está devolvendo:
      // - Se vier "array posicional", ajuste os índices
      // - Se vier "objeto", use as chaves
      //
      // Vou suportar os dois formatos abaixo.

      if (Array.isArray(last)) {
        // Exemplo seu antigo: [nunota,numnota,status,...,dtneg,dt2,confirmada]
        // Neste SELECT aqui eu devolvo DTNEG e DTENTSAI como string também,
        // então os índices podem variar conforme a config do DbExplorer.
        // Se seu retorno for array, me diga a ordem exata que eu deixo 100%.
        lastNunota = Number(last[0]);
        lastDtneg = String(last[6] ?? last[7] ?? last[8] ?? '').slice(0, 19);
      } else {
        lastNunota = Number(last.NUNOTA);
        lastDtneg = String(last.DTNEG).slice(0, 19);
      }

      // Se voltou menos que pageSize, acabou
      if (rows.length < pageSize) break;

      // Se por algum motivo não conseguimos cursor, evita loop infinito
      if (!lastDtneg || !Number.isFinite(lastNunota)) break;
    }

    return allRows;
  }

  // cancela uma nota via CACSP.cancelarNota
  async cancelarNota(authToken: string, nunota: number, justificativa: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.cancelarNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    // formato conforme doc do CACSP.cancelarNota :contentReference[oaicite:2]{index=2}
    const body = {
      serviceName: 'CACSP.cancelarNota',
      requestBody: {
        nota: {
          NUNOTA: { $: String(nunota) },
          JUSTIFICATIVA: { $: justificativa },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    const data = resp?.data;

    if (data?.status === '0') {
      const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
      const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
      throw new Error(`Sankhya status=0${cod}: ${msg}`);
    }

    return data;
  }

  //lista todas as notas não confirmadas (sem paginação, maximo de 5000 notas)
  async listarNotasNaoConfirmadas(authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    // ajuste/adicione campos aqui conforme você precisar
    const sql = `
    SELECT
      c.NUNOTA,
      c.NUMNOTA,
      c.SERIENOTA,
      c.CODEMP,
      c.CODPARC,
      c.CODTIPOPER,
      c.DTNEG,
      c.DTENTSAI,
      c.STATUSNOTA
    FROM TGFCAB c
    WHERE NVL(c.STATUSNOTA,'L') = 'L'
    ORDER BY c.DTNEG DESC
  `;

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: {
        sql,
      },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      // alguns ambientes devolvem { status: "0" } mesmo em HTTP 200
      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
        throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }

      // compatível com variações do DbExplorer (lista pode vir em data.responseBody.rows etc.)
      const rows =
        data?.responseBody?.rows ??
        data?.responseBody?.result ??
        data?.rows ??
        [];

      return rows;
    } catch (err: any) {
      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const sankhyaData = err?.response?.data;

      const msg =
        sankhyaData?.statusMessage ||
        sankhyaData?.message ||
        err?.message ||
        'Falha ao chamar o serviço do Sankhya.';

      const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

      throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
    }
  }




  //teste2

  //#region Listar cabos e imprimir etiquetas


  async updateImpresso(nunota: number, sequencia: number, authToken: string) {
    console.log("Nunota" + nunota)
    console.log("sequencia: " + sequencia)
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'ItemNota', // TGFITE
        standAlone: false,
        fields: ['NUNOTA', 'SEQUENCIA', 'AD_IMPRESSO'],
        records: [
          {
            // ✅ PK correta do ItemNota (TGFITE)
            pk: { NUNOTA: nunota, SEQUENCIA: sequencia },
            // ✅ atualização direta pelo nome do campo (mais seguro que índice)
            values: { 2: "S" },
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }


  // 1) aplica cores para permcompprod='N'
  async aplicarCoresProdutos(authToken: string) {
    const criteria = "this.PERMCOMPPROD = 'N'";
    const produtos = await this.loadTgfpro(authToken, criteria, 50);

    const codprods = produtos.map((r) => r?.CODPROD?.$ ?? r?.CODPROD).filter(Boolean);

    await this.mapLimit(codprods, 5, async (codprod) => {
      return this.saveProdutoCampos(authToken, codprod, {
        CORFONTCONSPRECO: 16777215,
        CORFUNDOCONSPRECO: 255,
      });
    });

    return { total: codprods.length, ok: true };
  }

  // 2) remove cores (null) onde estiverem setadas
  async removerCoresProdutos(authToken: string) {
    const criteria = 'this.CORFONTCONSPRECO = 16777215 AND this.CORFUNDOCONSPRECO = 255';
    const produtos = await this.loadTgfpro(authToken, criteria, 50);

    const codprods = produtos.map((r) => r?.CODPROD?.$ ?? r?.CODPROD).filter(Boolean);

    await this.mapLimit(codprods, 5, async (codprod) => {
      return this.saveProdutoCampos(authToken, codprod, {
        CORFONTCONSPRECO: null,
        CORFUNDOCONSPRECO: null,
      });
    });

    return { total: codprods.length, ok: true };

  }

  private async mapLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, idx: number) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = [];
    let i = 0;

    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await fn(items[idx], idx);
      }
    });

    await Promise.all(workers);
    return results;
  }

  private gatewayUrl(serviceName: string) {
    return `https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=${serviceName}&outputType=json`;
  }

  private headers(authToken: string) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };
  }


  private async loadTgfpro(authToken: string, criteria: string, pageSize = 50) {
    const url = this.gatewayUrl('DbExplorerSP.executeQuery');
    const headers = this.headers(authToken);

    let offset = 0;
    const rows: any[] = [];
    let pagina = 0;
    while (true) {
      const body = {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: {
          dataSet: {
            rootEntity: 'Produto',
            includePresentationFields: 'S',
            offsetPage: { $: String(pagina) },
            limit: { $: String(pageSize) },
            criteria: { $: criteria },
            entity: [
              {
                path: '',
                field: [
                  { $: 'CODPROD' },
                  { $: 'PERMCOMPPROD' },
                  { $: 'CORFONTCONSPRECO' },
                  { $: 'CORFUNDOCONSPRECO' },
                ],
              },
            ],
          },
        },
      };

      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      if (data?.status === '0') {
        const msg = data?.statusMessage || 'Erro ao carregar produtos';
        throw new Error(msg);
      }

      const entities =
        data?.responseBody?.entities?.entity ||
        data?.responseBody?.entity ||
        [];

      // Em alguns retornos vem como objeto único
      const list = Array.isArray(entities) ? entities : [entities];

      // Extrai registros
      const page = list
        .flatMap((e: any) => e?.fetchedRecords?.record || e?.record || [])
        .map((r: any) => r);

      if (!page.length) break;

      rows.push(...page);

      if (page.length < pageSize) break;
      offset += pageSize;
      pagina += 1;
    }

    return rows;
  }

  private async saveProdutoCampos(
    authToken: string,
    codprod: string | number,
    campos: Record<string, any>,
  ) {
    const url = this.gatewayUrl('CRUDServiceProvider.saveRecord');
    const headers = this.headers(authToken);

    // monta campos no padrão Sankhya: { CAMPO: { $: "valor" } } e null vira { $: null } ou remove
    const record: any = {
      CODPROD: { $: String(codprod) },
    };

    for (const [k, v] of Object.entries(campos)) {
      record[k] = v === null ? { $: null } : { $: String(v) };
    }

    const body = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        entityName: 'Produto',
        standAlone: false,
        fieldsToUpdate: Object.keys(campos).join(','),
        record,
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    const data = resp?.data;

    if (data?.status === '0') {
      const msg = data?.statusMessage || 'Erro ao salvar produto';
      throw new Error(msg);
    }

    return data;
  }

  //#endregion

  //#endregion


  //#region Ifood/Mercado Livre

  async listarMarcas(
    token: string,
    search?: string,
  ): Promise<MarcaOption[]> {
    const url = `${process.env.SANKHYA_API_URL || 'https://api.sankhya.com.br'}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const filtroBusca = search?.trim()
      ? `AND UPPER(TRIM(NVL(FAB.NOMEFANTASIA, FAB.RAZAOSOCIAL))) LIKE UPPER('%${search.trim().replace(/'/g, "''")}%')`
      : '';

    const sql = `
      SELECT DISTINCT
        FAB.CODFAB,
        NVL(FAB.NOMEFANTASIA, FAB.RAZAOSOCIAL) AS MARCA
      FROM TGFPRO PRO
      INNER JOIN TGFABR FAB ON FAB.CODFAB = PRO.CODFAB
      WHERE PRO.CODFAB IS NOT NULL
        AND PRO.ATIVO = 'S'
        AND PRO.USOPROD = 'R'
        ${filtroBusca}
      ORDER BY NVL(FAB.NOMEFANTASIA, FAB.RAZAOSOCIAL)
    `.trim();

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    const data = resp?.data;

    if (data?.status === '0') {
      const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
      const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
      throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
    }

    const rows: any[] =
      data?.responseBody?.rows ??
      data?.responseBody?.result ??
      data?.rows ??
      [];

    return rows
      .map((r) => ({
        id: Number(r[0]),
        nome: String(r[1] ?? '').trim(),
      }))
      .filter((x) => Number.isFinite(x.id) && !!x.nome);
  }

  async getAllProdutosTGFPRO(
    token: string,
    opts?: { maxRecords?: number; pageSize?: number }
  ): Promise<any[]> {
    const url = `${process.env.SANKHYA_API_URL || 'https://api.sankhya.com.br'}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 3. SQL Otimizado (Produto + Grupo + Barra)
    const sql = `
      SELECT 
        P.CODPROD, 
        P.DESCRPROD, 
        P.CODGRUPOPROD, 
        G.DESCRGRUPOPROD, 
        P.MARCA, 
        P.ATIVO,
        B.CODBARRA
      FROM TGFPRO P
      INNER JOIN TGFGRU G ON P.CODGRUPOPROD = G.CODGRUPOPROD
      INNER JOIN TGFBAR B ON P.CODPROD = B.CODPROD
      WHERE P.ATIVO = 'S'
        AND B.CODBARRA IS NOT NULL
        AND TRIM(B.CODBARRA) IS NOT NULL
      ORDER BY P.CODPROD, B.CODBARRA
    `.trim();

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql },
    };

    try {
      // 4. Executa a requisição usando o padrão do seu exemplo
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      // 5. Tratamento de erro igual ao seu exemplo
      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
        throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }

      // 6. Extração das linhas
      const rows: any[] =
        data?.responseBody?.rows ??
        data?.responseBody?.result ??
        data?.rows ??
        [];

      // 7. Processamento e Agrupamento (Mapeamento)
      // Como o SQL retorna uma linha por código de barra, precisamos agrupar no JS
      // Mapeamento das colunas do SQL:
      // [0]:CODPROD, [1]:DESCRPROD, [2]:CODGRUPOPROD, [3]:DESCRGRUPOPROD, [4]:MARCA, [5]:ATIVO, [6]:CODBARRA

      const productsMap = new Map<number, any>();

      const safeStr = (v: any) => (v == null ? '' : String(v).trim());
      const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

      for (const r of rows) {
        const codProd = safeNum(r[0]);
        const codBarra = safeStr(r[6]);

        if (!codBarra) continue;

        if (!productsMap.has(codProd)) {
          productsMap.set(codProd, {
            CODPROD: codProd,
            DESCRPROD: safeStr(r[1]),
            CODGRUPOPROD: safeNum(r[2]),
            DESCRGRUPOPROD: safeStr(r[3]),
            MARCA: safeStr(r[4]),
            ATIVO: safeStr(r[5]),
            CODBARRA: codBarra, // Mantém o primeiro como principal
            CODBARRAS: [codBarra] // Inicia lista
          });
        } else {
          // Apenas adiciona a barra extra se o produto já existe
          const prod = productsMap.get(codProd);
          if (!prod.CODBARRAS.includes(codBarra)) {
            prod.CODBARRAS.push(codBarra);
          }
        }
      }

      return Array.from(productsMap.values());

    } catch (error) {
      console.error('Erro em getAllProdutos:', error);
      throw error;
    }
  }

  async getProdutoInfos(codProd: number, authToken: string): Promise<ProdutoInfos> {
    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Produto',
          includePresentationFields: 'N',
          tryJoinedFields: 'true',
          offsetPage: '0',
          criteria: {
            expression: {
              $: 'this.CODPROD = ?',
            },
            parameter: [
              {
                $: codProd.toString(),
                type: 'I',
              },
            ],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'CODPROD,DESCRPROD,MARCA,CARACTERISTICAS,CODVOL,CODGRUPOPROD,LOCALIZACAO,ENDIMAGEM,AD_UNIDADELV',
              },
            },
            {
              path: 'GrupoProduto',
              fieldset: {
                list: 'DESCRGRUPOPROD',
              },
            },
          ],
        },
      },
    };
    try {
      const response = await firstValueFrom(
        this.http.post(this.queryUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
          },
        }),
      );

      return response.data.responseBody?.entities?.entity;
    } catch (error: any) {
      console.error(
        'Erro ao buscar produto:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  //#endregion



  private normalizeEntities(responseBody: any): any[] {
    const entities =
      responseBody?.entities?.entity ??
      responseBody?.dataSet?.entities?.entity ??
      responseBody?.result ??
      [];

    if (!entities) return [];
    return Array.isArray(entities) ? entities : [entities];
  }

  /**
   * Busca todos os registros da TGFIXN (Instância: ImportacaoXMLNotas).
   * @param token Bearer token do Sankhya
   */

  /*
  
    async getAllTGFIXNviaCRUD(authToken: string, pageSize = 200): Promise<any[]> {
    const all: any[] = [];
    let page = 0;
    const token = await this.login();
    while (true) {
      const resp: any = await this.callSankhya({
        serviceName: 'CRUDServiceProvider.loadRecords',
        authToken,
        body: {
          serviceName: 'CRUDServiceProvider.loadRecords',
          requestBody: {
            dataSet: {
              rootEntity: 'TGFIXN',
              includePresentationFields: 'S',
              // Em alguns ambientes: "offset"/"limit"; em outros: "page"/"pageSize"
              page,
              pageSize,
            },
          },
        },
      }, authToken);
  
      const rows = resp?.responseBody?.entities ?? resp?.responseBody?.rows ?? [];
      if (!rows.length) break;
  
      all.push(...rows);
  
      if (rows.length < pageSize) break;
      page += 1;
    }
  
    return all;
  }
  
  */

  // =========================================================================
  // 1. BUSCA DE XMLs (Agora restrito às mesmas regras do Dashboard)
  // =========================================================================
  async getAllTGFIXN(
    authToken: string,
    dtIni: string,
    dtFim: string,
    fetchSize = 500
  ): Promise<any[]> {
    const all: any[] = [];
    let offset = 0;

    // dtIni/dtFim no formato YYYY-MM-DD
    const ini = (dtIni ?? '').slice(0, 10);
    const fim = (dtFim ?? '').slice(0, 10);

    while (true) {
      // ✅ Realizado JOIN com a TGFCAB para trazer APENAS os XMLs das TOPs do Dashboard
      const sql = `
        SELECT
          t.NUMNOTA AS NUMNOTA,
          t.VLRNOTA AS VLRNOTA,
          t.XML AS XML,
          t.CONFIG AS CONFIG
        FROM TGFIXN t
        WHERE (t.TIPO = 'C' OR (t.TIPO = 'N' AND t.ENTSAINFE = 1))
          AND TRUNC(t.DHEMISS) BETWEEN TO_DATE('${ini}','YYYY-MM-DD') AND TO_DATE('${fim}','YYYY-MM-DD')
        ORDER BY t.NUNOTA
        OFFSET ${offset} ROWS FETCH NEXT ${fetchSize} ROWS ONLY
      `;

      const body = {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql },
      };

      const resp: any = await this.callBackSankhya(body, authToken);

      const rawRows =
        resp?.responseBody?.rows ??
        resp?.responseBody?.result ??
        resp?.rows ??
        resp?.result ??
        [];

      if (!Array.isArray(rawRows) || rawRows.length === 0) break;

      const mapped = rawRows.map((r: any) => {
        if (Array.isArray(r)) {
          return { NUMNOTA: r[0], VLRNOTA: r[1], XML: r[2], CONFIG: r[3] };
        }
        return {
          NUMNOTA: r?.NUMNOTA ?? r?.numnota,
          VLRNOTA: r?.VLRNOTA ?? r?.vlrnota,
          XML: r?.XML ?? r?.xml,
          CONFIG: r?.CONFIG ?? r?.config,
        };
      });

      all.push(...mapped);

      if (rawRows.length < fetchSize) break;
      offset += fetchSize;
    }

    return all;
  }

  async getNotaPorChaveNfe(
    chaveNfe: string, token: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const chaveNfeClean = String(chaveNfe ?? '').trim();
    if (!chaveNfeClean) throw new Error('Chave da NFe inválida');

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'N',
          metadata: 'S',
          tryJoinedFields: 'false',
          offsetPage: '0',
          criteria: {
            expression: {
              $: `
              this.CHAVENFE = ?
            `.replace(/\s+/g, ' ').trim(),
            },
            parameter: [
              { $: chaveNfeClean, type: 'S' }, // 'S' é perfeito para a CHAVENFE (String de 44 posições)
            ],
          },
          entity: [
            {
              path: '',
              fieldset: {
                // Adicionado CHAVENFE na lista e removido um DTNEG duplicado que havia no seu original
                list: 'NUNOTA,CHAVENFE,CODTIPOPER,DTNEG,CODPARC,STATUSNFE,VLRNOTA,CODVEND,CODVENDTEC,AD_INFIDELIMAX,DTFATUR,CODEMP,PENDENTE',
              },
            },
            {
              path: 'Vendedor',
              fieldset: { list: 'AD_TIPOTECNICO' },
            },
            {
              path: 'Parceiro',
              fieldset: { list: 'TIPPESSOA' },
            },
          ],
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.responseBody?.errorMessage ||
        resp?.data?.serviceMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords: ${msg}`);
    }

    const entities = resp.data.responseBody?.entities;

    // --- helpers ---
    const asArray = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);
    const rawFields = asArray(entities?.metadata?.fields?.field);
    const rawRows = asArray(entities?.entity);

    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };

    const toNumOrNull = (v: any) => (v === null || v === '' ? null : Number(v));
    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };

    const rowsNamed = rawRows.map(rowToNamed);

    const parsed = rowsNamed.map((r) => ({
      NUNOTA: toNumOrNull(r.NUNOTA) ?? 0,
      CHAVENFE: r.CHAVENFE ?? null, // Adicionado no mapeamento
      CODTIPOPER: toNumOrNull(r.CODTIPOPER) ?? 0,
      DTNEG: r.DTNEG ?? null,
      CODPARC: toNumOrNull(r.CODPARC) ?? 0,
      STATUSNFE: r.STATUSNFE ?? null,
      VLRNOTA: toNumOrNull(r.VLRNOTA) ?? 0,
      CODVEND: toNumOrNull(r.CODVEND),
      CODVENDTEC: toNumOrNull(r.CODVENDTEC),
      AD_INFIDELIMAX: r.AD_INFIDELIMAX ?? null,
      DTFATUR: r.DTFATUR ?? null,
      CODEMP: toNumOrNull(r.CODEMP),
      VENDEDOR_AD_TIPOTECNICO: toNumOrNull(r['Vendedor_AD_TIPOTECNICO']),
      TIPPESSOA: r['Parceiro_TIPPESSOA'],
    }));

    // se não achou, retorna null (ou lance erro se preferir)
    return parsed[0] ?? null;
  }


  async getItensNotaNfe(
    token: string, nunota: number): Promise<any[]> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'ItemNota', // Entidade que representa a TGFITE
          includePresentationFields: 'S',
          offsetPage: 0,
          criteria: {
            expression: {
              $: `this.NUNOTA = ${nunota}`
            },
          },
          entity: {
            fieldset: {
              // Adicione ou remova campos conforme sua necessidade
              list: 'NUNOTA,SEQUENCIA,CODPROD,QTDNEG,VLRUNIT,VLRTOT,CODVOL,CODTRIB',
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.responseBody?.errorMessage ||
        resp?.data?.serviceMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords (getItensPorNota): ${msg}`);
    }

    const entities = resp.data.responseBody?.entities;

    // --- Helpers de Parsing (Reutilizados) ---
    const asArray = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);
    const rawFields = asArray(entities?.metadata?.fields?.field);
    const rawRows = asArray(entities?.entity);

    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };

    const toNum = (v: any) => Number(val(v));

    // Mapeia os nomes dos campos retornados (f0 -> NUNOTA, f1 -> SEQUENCIA, etc.)
    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };

    const rowsNamed = rawRows.map(rowToNamed);

    // Retorna o objeto formatado com os tipos corretos
    return rowsNamed.map((r: any) => ({
      NUNOTA: toNum(r.NUNOTA),
      SEQUENCIA: toNum(r.SEQUENCIA),
      CODPROD: toNum(r.CODPROD),
      QTDNEG: toNum(r.QTDNEG),
      VLRUNIT: toNum(r.VLRUNIT),
      VLRTOT: toNum(r.VLRTOT),
      CODVOL: String(r.CODVOL ?? '')
    }));
  }


  async getDashboardData(
    authToken: string,
    visao: string,
    dtRef: string,
    codParc?: string
  ): Promise<any[]> {
    const ref = (dtRef ?? '').slice(0, 10);
    let sql = '';

    if (visao === 'top') {
      sql = `
        WITH ITENS AS (
          SELECT
            c.codtipoper,
            c.nunota,
            (CASE WHEN c.codtipoper IN (800,801) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) AS vlr_assinado,
            CASE
              WHEN NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70') THEN 'ST'
              ELSE 'TRIB'
            END AS tip_trib
          FROM tgfcab c
          JOIN tgfite i ON i.nunota = c.nunota
          WHERE (
              c.codtipoper IN (299,700,382,412,326,417,800,801) 
              OR (c.codtipoper = 383 AND TRUNC(c.dtneg) >= DATE '2026-02-18')
            )
            AND c.statusnfe = 'A' AND NVL(c.numnota,0) <> 0 AND c.codemp = 1
            /* ALTERADO: Removido ADD_MONTHS -1 para buscar no mês atual da ref */
            AND TRUNC(c.dtneg) BETWEEN TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM') AND LAST_DAY(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'))
        ),
        GRUPO AS (
          SELECT
            CASE 
              WHEN codtipoper IN (299,700,382,326,383,417) THEN '299,700,382,326,383,417' 
              WHEN codtipoper IN (800,801) THEN '800,801' 
            END AS TOPS,
            CASE 
              WHEN codtipoper IN (299,700,382,326,383,417) THEN 'Vendas total - icms' 
              WHEN codtipoper IN (800,801) THEN 'devolucao de venda' 
            END AS DESCRICAO,
            nunota, tip_trib, vlr_assinado
          FROM ITENS
        ),
        AGG AS (
          SELECT 
            TOPS, 
            DESCRICAO, 
            COUNT(DISTINCT nunota) AS QTD_NOTAS,
            NVL(SUM(CASE WHEN tip_trib='ST' THEN vlr_assinado ELSE 0 END),0) AS VLR_TOTAL_ST,
            NVL(SUM(CASE WHEN tip_trib='TRIB' THEN vlr_assinado ELSE 0 END),0) AS VLR_TOTAL_TB,
            NVL(SUM(vlr_assinado),0) AS VLR_TOTAL
          FROM GRUPO 
          WHERE TOPS IS NOT NULL 
          GROUP BY TOPS, DESCRICAO
        )
        SELECT TOPS, QTD_NOTAS, DESCRICAO, VLR_TOTAL_ST, VLR_TOTAL_TB, VLR_TOTAL 
        FROM AGG 
        ORDER BY CASE TOPS WHEN '299,700,382,326,383,417' THEN 1 WHEN '800,801' THEN 5 END
      `;
    }
    else if (visao === 'tipo' || visao === 'perfil') {
      sql = `
        WITH ITENS AS (
          SELECT c.codparc, i.codprod, c.nunota, c.codtipoper,
            CASE WHEN NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70') THEN 'ST' ELSE 'TRIB' END AS tip_trib,
            (CASE WHEN c.codtipoper IN (800,801) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) AS vlr_liq
          FROM tgfcab c JOIN tgfite i ON i.nunota = c.nunota
          WHERE c.codtipoper IN (700, 701, 326, 299, 382, 801, 800) AND c.statusnfe = 'A' AND NVL(c.numnota,0) <> 0 AND c.codemp = 1
            AND TRUNC(c.dtneg) BETWEEN TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM') AND LAST_DAY(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'))
        ),
        ULTIMA_ENTRADA_PROD AS (
          SELECT x.codprod, x.ad_indpb FROM (
            SELECT ite_ent.codprod, par_ent.ad_indpb, ROW_NUMBER() OVER (PARTITION BY ite_ent.codprod ORDER BY cab_ent.dtneg DESC, cab_ent.nunota DESC) AS rn
            FROM tgfcab cab_ent JOIN tgfite ite_ent ON ite_ent.nunota = cab_ent.nunota LEFT JOIN tgfpar par_ent ON par_ent.codparc = cab_ent.codparc
            WHERE NVL(cab_ent.numnota,0) <> 0 AND cab_ent.statusnota = 'L' AND cab_ent.codtipoper IN (300,344)
          ) x WHERE x.rn = 1
        ),
        MOV AS (
          SELECT it.codparc, it.tip_trib, SUM(it.vlr_liq) AS total_liq, SUM(CASE WHEN NVL(ue.ad_indpb,'N') = 'S' THEN it.vlr_liq ELSE 0 END) AS total_liq_indpb
          FROM ITENS it LEFT JOIN ULTIMA_ENTRADA_PROD ue ON ue.codprod = it.codprod GROUP BY it.codparc, it.tip_trib
        ),
        PIV AS (
          SELECT codparc, SUM(total_liq) AS total,
            SUM(CASE WHEN tip_trib='ST' THEN total_liq ELSE 0 END) AS total_st, SUM(CASE WHEN tip_trib='TRIB' THEN total_liq ELSE 0 END) AS total_trib,
            SUM(CASE WHEN tip_trib='ST' THEN total_liq_indpb ELSE 0 END) AS st_ind_pb, SUM(CASE WHEN tip_trib='TRIB' THEN total_liq_indpb ELSE 0 END) AS trib_ind_pb
          FROM MOV GROUP BY codparc
        ),
        BASE_FATURAMENTO AS (
          SELECT
            CASE WHEN NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70') THEN (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) ELSE 0 END AS vlr_st,
            CASE WHEN NOT (NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')) THEN (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) ELSE 0 END AS vlr_trib
          FROM tgfcab c JOIN tgfite i ON i.nunota = c.nunota
          WHERE c.codtipoper IN (700, 701, 326, 299, 382, 801, 800) AND c.STATUSNFE = 'A' AND NVL(c.numnota,0) <> 0 AND c.CODEMP = 1
            /* ALTERADO: Removido ADD_MONTHS -1 */
            AND TRUNC(c.dtneg) BETWEEN TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM') AND LAST_DAY(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'))
        ),
        T AS (
          SELECT NVL(SUM(vlr_st),0)*0.07 AS FATOR_ST_7, NVL(SUM(vlr_st),0)*0.10 AS FATOR_ST_10, NVL(SUM(vlr_trib),0)*0.07 AS FATOR_TRIB_7, NVL(SUM(vlr_trib),0)*0.10 AS FATOR_TRIB_10
          FROM BASE_FATURAMENTO
        ),
        PARC AS (
          SELECT pv.*, NVL(p.ad_tipoclientefaturar, 5) AS tipo_cli FROM PIV pv JOIN tgfpar p ON p.codparc = pv.codparc
        ),
        CALC_POR_PARC AS (
          SELECT tipo_cli, NVL(total,0) AS total_vendas, NVL(total_st,0) AS total_vendas_st, NVL(total_trib,0) AS total_vendas_trib,
            (CASE TO_CHAR(NVL(tipo_cli, 5)) WHEN '1' THEN NVL(t.FATOR_ST_7,0) WHEN '4' THEN NVL(t.FATOR_ST_7,0) WHEN '5' THEN NVL(t.FATOR_ST_10,0) ELSE 0 END) AS fator_st,
            (CASE TO_CHAR(NVL(tipo_cli, 5)) WHEN '1' THEN NVL(t.FATOR_TRIB_7,0) WHEN '4' THEN NVL(t.FATOR_TRIB_7,0) WHEN '5' THEN NVL(t.FATOR_TRIB_10,0) ELSE 0 END) AS fator_trib,
            (CASE TO_CHAR(NVL(tipo_cli, 5))
              WHEN '1' THEN CASE WHEN NVL(total_trib,0) > NVL(t.FATOR_TRIB_7,0) THEN ((NVL(total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04) ELSE NVL(total_trib,0) * 0.04 END
              WHEN '2' THEN NVL(total_trib,0) * 0.20 WHEN '3' THEN NVL(total_trib,0) * 0.20
              WHEN '4' THEN CASE WHEN NVL(total_trib,0) > NVL(t.FATOR_TRIB_7,0) THEN ((NVL(total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04) ELSE NVL(total_trib,0) * 0.04 END
              WHEN '5' THEN CASE WHEN NVL(total_trib,0) > NVL(t.FATOR_TRIB_10,0) THEN ((NVL(total_trib,0) - NVL(t.FATOR_TRIB_10,0)) * 0.20) + (NVL(t.FATOR_TRIB_10,0) * 0.04) ELSE NVL(total_trib,0) * 0.04 END
              WHEN '6' THEN NVL(total_trib,0) * 0.01 WHEN '7' THEN NVL(total_trib,0) * 0.20 ELSE 0 END) AS imposto_trib,
            (CASE TO_CHAR(NVL(tipo_cli, 5))
              WHEN '1' THEN CASE WHEN NVL(total_st,0) > NVL(t.FATOR_ST_7,0) THEN (NVL(total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04 ELSE 0 END
              WHEN '2' THEN NVL(total_st,0) * 0.04 WHEN '3' THEN NVL(total_st,0) * 0.04
              WHEN '4' THEN CASE WHEN NVL(total_st,0) > NVL(t.FATOR_ST_7,0) THEN (NVL(total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04 ELSE 0 END
              WHEN '5' THEN CASE WHEN NVL(total_st,0) > NVL(t.FATOR_ST_10,0) THEN (NVL(total_st,0) - NVL(t.FATOR_ST_10,0)) * 0.04 ELSE 0 END
              WHEN '6' THEN 0 WHEN '7' THEN NVL(total_st,0) * 0.04 ELSE 0 END) AS imposto_st,
            NVL(st_ind_pb,0) AS st_pb, NVL(trib_ind_pb,0) AS trib_pb,
            GREATEST(NVL(total_st,0) - NVL(st_ind_pb,0), 0) AS restante_st, GREATEST(NVL(total_trib,0) - NVL(trib_ind_pb,0), 0) AS restante_trib
          FROM PARC CROSS JOIN T t
        )
        SELECT
          TO_CHAR(NVL(tipo_cli, 5)) AS TIPO_COD,
          CASE TO_CHAR(NVL(tipo_cli, 5)) WHEN '1' THEN 'Construtora' WHEN '2' THEN 'Pessoa Física' WHEN '3' THEN 'Jurídica sem IE' WHEN '4' THEN 'Jurídica com IE' WHEN '5' THEN 'Atacadista / Indústria' WHEN '6' THEN 'Fora do estado com IE' WHEN '7' THEN 'Fora do estado (PF+PJ sem IE+Construtora)' ELSE 'ERROR' END AS TIPO_DESC,
          MAX(fator_st) AS FATOR_ST, MAX(fator_trib) AS FATOR_TRIB,
          NVL(SUM(total_vendas),0) AS TOT_VENDAS, NVL(SUM(total_vendas_st),0) AS TOT_VENDAS_ST, NVL(SUM(total_vendas_trib),0) AS TOT_VENDAS_TRIB,
          NVL(SUM(imposto_st),0) AS TOT_IMP_ST, NVL(SUM(imposto_trib),0) AS TOT_IMP_TRIB, NVL(SUM(imposto_st + imposto_trib),0) AS TOT_IMPOSTOS,
          NVL(SUM(st_pb),0) AS TOT_ST_PB, NVL(SUM(trib_pb),0) AS TOT_TRIB_PB, NVL(SUM(restante_st),0) AS TOT_REST_ST, NVL(SUM(restante_trib),0) AS TOT_REST_TRIB
        FROM CALC_POR_PARC
        GROUP BY TO_CHAR(NVL(tipo_cli, 5)), CASE TO_CHAR(NVL(tipo_cli, 5)) WHEN '1' THEN 'Construtora' WHEN '2' THEN 'Pessoa Física' WHEN '3' THEN 'Jurídica sem IE' WHEN '4' THEN 'Jurídica com IE' WHEN '5' THEN 'Atacadista / Indústria' WHEN '6' THEN 'Fora do estado com IE' WHEN '7' THEN 'Fora do estado (PF+PJ sem IE+Construtora)' ELSE 'ERROR' END
        ORDER BY TO_NUMBER(TO_CHAR(NVL(tipo_cli, 5)))
      `;
    }
    else if (visao === 'parceiro') {
      sql = `
        WITH BASE_FATURAMENTO AS (
          SELECT CASE WHEN NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70') THEN (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) ELSE 0 END AS vlr_st,
                 CASE WHEN NOT (NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')) THEN (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) ELSE 0 END AS vlr_trib,
                 (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) AS vlr_assinado
          FROM tgfcab c JOIN tgfite i ON i.nunota = c.nunota
          WHERE c.codtipoper IN (700, 701, 326, 299, 382, 801, 800) AND c.STATUSNFE = 'A' AND NVL(c.numnota,0) <> 0 AND c.CODEMP = 1
            /* ALTERADO: Removido ADD_MONTHS -1 */
            AND TRUNC(c.dtneg) BETWEEN TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM') AND LAST_DAY(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'))
        ),
        TOTALIZADORES AS (
          SELECT NVL(SUM(vlr_assinado),0) AS FATUR_TOTAL, NVL(SUM(vlr_assinado),0)*0.07 AS FATOR_7, NVL(SUM(vlr_st),0)*0.10 AS FATOR_ST_10, NVL(SUM(vlr_st),0)*0.07 AS FATOR_ST_7, NVL(SUM(vlr_trib),0)*0.10 AS FATOR_TRIB_10, NVL(SUM(vlr_trib),0)*0.07 AS FATOR_TRIB_7 FROM BASE_FATURAMENTO
        ),
        ITENS AS (
          SELECT c.codparc, i.codprod, c.nunota, c.codtipoper, CASE WHEN NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70') THEN 'ST' ELSE 'TRIB' END AS tip_trib,
                 (CASE WHEN c.codtipoper IN (800,801) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) AS vlr_liq
          FROM tgfcab c JOIN tgfite i ON i.nunota = c.nunota
          WHERE c.codtipoper IN (700, 701, 326, 299, 382, 801, 800) AND c.statusnfe = 'A' AND NVL(c.numnota,0) <> 0 AND c.codemp = 1
            AND TRUNC(c.dtneg) BETWEEN TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM') AND LAST_DAY(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'))
        ),
        ULTIMA_ENTRADA_PROD AS (
          SELECT x.codprod, x.ad_indpb FROM (SELECT ite_ent.codprod, par_ent.ad_indpb, ROW_NUMBER() OVER (PARTITION BY ite_ent.codprod ORDER BY cab_ent.dtneg DESC, cab_ent.nunota DESC) AS rn FROM tgfcab cab_ent JOIN tgfite ite_ent ON ite_ent.nunota = cab_ent.nunota LEFT JOIN tgfpar par_ent ON par_ent.codparc = cab_ent.codparc WHERE NVL(cab_ent.numnota,0) <> 0 AND cab_ent.statusnota = 'L' AND cab_ent.codtipoper IN (300,344)) x WHERE x.rn = 1
        ),
        MOV AS (
          SELECT it.codparc, it.tip_trib, COUNT(DISTINCT it.nunota) AS qtd_notas,
            SUM(CASE WHEN it.codtipoper IN (800,801) THEN 0 ELSE NVL(it.vlr_liq,0) END) AS vlr_vendas,
            SUM(CASE WHEN it.codtipoper IN (800,801) THEN ABS(NVL(it.vlr_liq,0)) ELSE 0 END) AS vlr_devolucao,
            SUM(it.vlr_liq) AS total_liq, SUM(CASE WHEN NVL(ue.ad_indpb,'N') = 'S' THEN it.vlr_liq ELSE 0 END) AS total_liq_indpb
          FROM ITENS it LEFT JOIN ULTIMA_ENTRADA_PROD ue ON ue.codprod = it.codprod GROUP BY it.codparc, it.tip_trib
        ),
        PIV AS (
          SELECT codparc, SUM(qtd_notas) AS qtd_notas, SUM(vlr_vendas) AS VLR_VENDAS, SUM(vlr_devolucao) AS VLR_DEVOLUCAO,
            SUM(total_liq) AS total, SUM(CASE WHEN tip_trib='ST' THEN total_liq ELSE 0 END) AS total_st, SUM(CASE WHEN tip_trib='TRIB' THEN total_liq ELSE 0 END) AS total_trib,
            SUM(CASE WHEN tip_trib='ST' THEN total_liq_indpb ELSE 0 END) AS st_ind_pb, SUM(CASE WHEN tip_trib='TRIB' THEN total_liq_indpb ELSE 0 END) AS trib_ind_pb
          FROM MOV GROUP BY codparc
        )
        SELECT
          pv.codparc AS CODPARC, 
          p.razaosocial AS NOMEPARC,
          CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5)) WHEN '1' THEN 'Construtora' WHEN '2' THEN 'Pessoa Física' WHEN '3' THEN 'Jurídica sem IE' WHEN '4' THEN 'Jurídica com IE' WHEN '5' THEN 'Atacadista / Indústria' WHEN '6' THEN 'Fora do estado com IE' WHEN '7' THEN 'Fora do estado (PF+PJ sem IE+Construtora)' ELSE 'ERROR' END AS AD_TIPOCLIENTEFATURAR,
          pv.VLR_VENDAS AS VLR_VENDAS, 
          pv.VLR_DEVOLUCAO AS VLR_DEVOLUCAO,
          (CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5))
            WHEN '1' THEN CASE WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_7,0) THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04) ELSE NVL(pv.total_trib,0) * 0.04 END
            WHEN '2' THEN NVL(pv.total_trib,0) * 0.20 WHEN '3' THEN NVL(pv.total_trib,0) * 0.20
            WHEN '4' THEN CASE WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_7,0) THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04) ELSE NVL(pv.total_trib,0) * 0.04 END
            WHEN '5' THEN CASE WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_10,0) THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_10,0)) * 0.20) + (NVL(t.FATOR_TRIB_10,0) * 0.04) ELSE NVL(pv.total_trib,0) * 0.04 END
            WHEN '6' THEN NVL(pv.total_trib,0) * 0.01 WHEN '7' THEN NVL(pv.total_trib,0) * 0.20 ELSE 0 END) AS IMPOSTOTRIB,
          (CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5))
            WHEN '1' THEN CASE WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_7,0) THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04 ELSE 0 END
            WHEN '2' THEN NVL(pv.total_st,0) * 0.04 WHEN '3' THEN NVL(pv.total_st,0) * 0.04
            WHEN '4' THEN CASE WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_7,0) THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04 ELSE 0 END
            WHEN '5' THEN CASE WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_10,0) THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_10,0)) * 0.04 ELSE 0 END
            WHEN '6' THEN 0 WHEN '7' THEN NVL(pv.total_st,0) * 0.04 ELSE 0 END) AS IMPOSTOST,
          ((CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5)) WHEN '1' THEN CASE WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_7,0) THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04) ELSE NVL(pv.total_trib,0) * 0.04 END WHEN '2' THEN NVL(pv.total_trib,0) * 0.20 WHEN '3' THEN NVL(pv.total_trib,0) * 0.20 WHEN '4' THEN CASE WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_7,0) THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04) ELSE NVL(pv.total_trib,0) * 0.04 END WHEN '5' THEN CASE WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_10,0) THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_10,0)) * 0.20) + (NVL(t.FATOR_TRIB_10,0) * 0.04) ELSE NVL(pv.total_trib,0) * 0.04 END WHEN '6' THEN NVL(pv.total_trib,0) * 0.01 WHEN '7' THEN NVL(pv.total_trib,0) * 0.20 ELSE 0 END) + (CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5)) WHEN '1' THEN CASE WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_7,0) THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04 ELSE 0 END WHEN '2' THEN NVL(pv.total_st,0) * 0.04 WHEN '3' THEN NVL(pv.total_st,0) * 0.04 WHEN '4' THEN CASE WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_7,0) THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04 ELSE 0 END WHEN '5' THEN CASE WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_10,0) THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_10,0)) * 0.04 ELSE 0 END WHEN '6' THEN 0 WHEN '7' THEN NVL(pv.total_st,0) * 0.04 ELSE 0 END)) AS IMPOSTOS,
          pv.qtd_notas AS QTD_NOTAS, pv.total AS TOTAL, pv.total_st AS TOTAL_ST, pv.total_trib AS TOTAL_TRIB, pv.st_ind_pb AS ST_IND_PB, pv.trib_ind_pb AS TRIB_IND_PB,
          GREATEST(NVL(pv.total_st,0) - NVL(pv.st_ind_pb,0), 0) AS RESTANTE_ST, GREATEST(NVL(pv.total_trib,0) - NVL(pv.trib_ind_pb,0), 0) AS RESTANTE_TRIB,
          (GREATEST(NVL(pv.total_st,0) - NVL(pv.st_ind_pb,0), 0) + GREATEST(NVL(pv.total_trib,0) - NVL(pv.trib_ind_pb,0), 0)) AS VALOR_RESTANTE,
          '#E3F2FD' AS BK_ST, '#1E88E5' AS FG_ST, '#FFEBEE' AS BK_TRIB, '#E53935' AS FG_TRIB
        FROM PIV pv JOIN tgfpar p ON p.codparc = pv.codparc CROSS JOIN TOTALIZADORES t ORDER BY pv.total DESC
      `;
    } else if (visao === 'detalhe') {
      sql = `
        SELECT
          cab.numnota AS NUMNOTA, TRUNC(cab.dtneg) AS DTNEG, cab.codtipoper AS CODTIPOPER, cab.codparc AS CODPARC, par.razaosocial AS NOMEPARC,
          MAX(CASE TO_CHAR(NVL(par.ad_tipoclientefaturar, 5)) WHEN '1' THEN 'Construtora' WHEN '2' THEN 'Pessoa Física' WHEN '3' THEN 'Jurídica sem IE' WHEN '4' THEN 'Jurídica com IE' WHEN '5' THEN 'Atacadista / Indústria' WHEN '6' THEN 'Fora do estado com IE' WHEN '7' THEN 'Fora do estado (PF+PJ sem IE+Construtora)' ELSE 'ERROR' END) AS AD_TIPOCLIENTEFATURAR,
          MAX(CASE TO_CHAR(NVL(par.ad_tipoclientefaturar, 5)) WHEN '2' THEN 0.07 ELSE 0.10 END) AS IMPOSTOS,
          CASE WHEN cab.codtipoper IN (800,801) THEN -SUM(NVL(ite.vlrtot,0) - NVL(ite.vlrdesc,0)) ELSE SUM(NVL(ite.vlrtot,0) - NVL(ite.vlrdesc,0)) END AS VLRNOTA_AJUSTADO,
          cab.codemp AS CODEMP
        FROM tgfcab cab JOIN tgfpar par ON par.codparc = cab.codparc JOIN tgfite ite ON ite.nunota = cab.nunota
        WHERE cab.codparc = ${Number(codParc)} AND cab.codtipoper IN (700, 701, 326, 299, 382, 801, 800)
          AND cab.STATUSNFE = 'A' AND NVL(cab.numnota,0) <> 0 AND cab.codemp = 1
          AND TRUNC(cab.dtneg) BETWEEN TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM') AND LAST_DAY(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'))
        GROUP BY cab.numnota, TRUNC(cab.dtneg), cab.codtipoper, cab.codparc, par.razaosocial, cab.codemp
        ORDER BY TRUNC(cab.dtneg) DESC, cab.numnota DESC
      `;
    }

    const body = { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } };
    const resp: any = await this.callBackSankhya(body, authToken);
    const rb = resp?.responseBody;

    if (rb?.fieldsMetadata && Array.isArray(rb?.rows)) {
      return rb.rows.map((row: any[]) => {
        const obj: any = {};
        row.forEach((val, idx) => { obj[rb.fieldsMetadata[idx]?.name || `COL_${idx}`] = val; });
        return obj;
      });
    }

    return rb?.rows ?? rb?.result ?? resp?.rows ?? resp?.result ?? [];
  }

  /*
  async getDashboardData(
    authToken: string,
    visao: string,
    dtRef: string,
    codParc?: string
  ): Promise<any[]> {
    const ref = (dtRef ?? '').slice(0, 10); // Garante YYYY-MM-DD
    let sql = '';

    if (visao === 'top') {
      sql = `
        WITH ITENS AS (
          SELECT
            c.codtipoper,
            c.nunota,
            (CASE WHEN c.codtipoper IN (800,801) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) AS vlr_assinado,
            CASE
              WHEN NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70') THEN 'ST'
              ELSE 'TRIB'
            END AS tip_trib
          FROM tgfcab c
          JOIN tgfite i ON i.nunota = c.nunota
          WHERE (
              c.codtipoper IN (299,700,382,412,326,417,800,801) 
              OR (c.codtipoper = 383 AND TRUNC(c.dtneg) >= DATE '2026-02-18')
            )
            AND c.statusnfe = 'A' AND NVL(c.numnota,0) <> 0 AND c.codemp = 1
            AND TRUNC(c.dtneg) BETWEEN ADD_MONTHS(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'), -1) 
                                   AND LAST_DAY(ADD_MONTHS(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'), -1))
        ),
        GRUPO AS (
          SELECT
            CASE 
              WHEN codtipoper IN (299,700,382,326,383,417) THEN '299,700,382,326,383,417' 
              WHEN codtipoper IN (800,801) THEN '800,801' 
            END AS TOPS,
            CASE 
              WHEN codtipoper IN (299,700,382,326,383,417) THEN 'Vendas total - icms' 
              WHEN codtipoper IN (800,801) THEN 'devolucao de venda' 
            END AS DESCRICAO,
            nunota, tip_trib, vlr_assinado
          FROM ITENS
        ),
        AGG AS (
          SELECT 
            TOPS, 
            DESCRICAO, 
            COUNT(DISTINCT nunota) AS QTD_NOTAS,
            NVL(SUM(CASE WHEN tip_trib='ST' THEN vlr_assinado ELSE 0 END),0) AS VLR_TOTAL_ST,
            NVL(SUM(CASE WHEN tip_trib='TRIB' THEN vlr_assinado ELSE 0 END),0) AS VLR_TOTAL_TB,
            NVL(SUM(vlr_assinado),0) AS VLR_TOTAL
          FROM GRUPO 
          WHERE TOPS IS NOT NULL -- Remove qualquer outra TOP que não esteja nas 2 linhas
          GROUP BY TOPS, DESCRICAO
        )
        SELECT TOPS, QTD_NOTAS, DESCRICAO, VLR_TOTAL_ST, VLR_TOTAL_TB, VLR_TOTAL 
        FROM AGG 
        ORDER BY CASE TOPS WHEN '299,700,382,326,383,417' THEN 1 WHEN '800,801' THEN 5 END
      `;
    }
    else if (visao === 'tipo' || visao === 'perfil') {
      sql = `
        WITH ITENS AS (
          SELECT c.codparc, i.codprod, c.nunota, c.codtipoper,
            CASE WHEN NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70') THEN 'ST' ELSE 'TRIB' END AS tip_trib,
            (CASE WHEN c.codtipoper IN (800,801) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) AS vlr_liq
          FROM tgfcab c JOIN tgfite i ON i.nunota = c.nunota
          WHERE c.codtipoper IN (700, 701, 326, 299, 382, 801, 800) AND c.statusnfe = 'A' AND NVL(c.numnota,0) <> 0 AND c.codemp = 1
            AND TRUNC(c.dtneg) BETWEEN TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM') AND LAST_DAY(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'))
        ),
        ULTIMA_ENTRADA_PROD AS (
          SELECT x.codprod, x.ad_indpb FROM (
            SELECT ite_ent.codprod, par_ent.ad_indpb, ROW_NUMBER() OVER (PARTITION BY ite_ent.codprod ORDER BY cab_ent.dtneg DESC, cab_ent.nunota DESC) AS rn
            FROM tgfcab cab_ent JOIN tgfite ite_ent ON ite_ent.nunota = cab_ent.nunota LEFT JOIN tgfpar par_ent ON par_ent.codparc = cab_ent.codparc
            WHERE NVL(cab_ent.numnota,0) <> 0 AND cab_ent.statusnota = 'L' AND cab_ent.codtipoper IN (300,344)
          ) x WHERE x.rn = 1
        ),
        MOV AS (
          SELECT it.codparc, it.tip_trib, SUM(it.vlr_liq) AS total_liq, SUM(CASE WHEN NVL(ue.ad_indpb,'N') = 'S' THEN it.vlr_liq ELSE 0 END) AS total_liq_indpb
          FROM ITENS it LEFT JOIN ULTIMA_ENTRADA_PROD ue ON ue.codprod = it.codprod GROUP BY it.codparc, it.tip_trib
        ),
        PIV AS (
          SELECT codparc, SUM(total_liq) AS total,
            SUM(CASE WHEN tip_trib='ST' THEN total_liq ELSE 0 END) AS total_st, SUM(CASE WHEN tip_trib='TRIB' THEN total_liq ELSE 0 END) AS total_trib,
            SUM(CASE WHEN tip_trib='ST' THEN total_liq_indpb ELSE 0 END) AS st_ind_pb, SUM(CASE WHEN tip_trib='TRIB' THEN total_liq_indpb ELSE 0 END) AS trib_ind_pb
          FROM MOV GROUP BY codparc
        ),
        BASE_FATURAMENTO AS (
          SELECT
            CASE WHEN NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70') THEN (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) ELSE 0 END AS vlr_st,
            CASE WHEN NOT (NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')) THEN (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) ELSE 0 END AS vlr_trib
          FROM tgfcab c JOIN tgfite i ON i.nunota = c.nunota
          WHERE c.codtipoper IN (700, 701, 326, 299, 382, 801, 800) AND c.STATUSNFE = 'A' AND NVL(c.numnota,0) <> 0 AND c.CODEMP = 1
            AND TRUNC(c.dtneg) BETWEEN ADD_MONTHS(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'), -1) AND LAST_DAY(ADD_MONTHS(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'), -1))
        ),
        T AS (
          SELECT NVL(SUM(vlr_st),0)*0.07 AS FATOR_ST_7, NVL(SUM(vlr_st),0)*0.10 AS FATOR_ST_10, NVL(SUM(vlr_trib),0)*0.07 AS FATOR_TRIB_7, NVL(SUM(vlr_trib),0)*0.10 AS FATOR_TRIB_10
          FROM BASE_FATURAMENTO
        ),
        PARC AS (
          SELECT pv.*, NVL(p.ad_tipoclientefaturar, 5) AS tipo_cli FROM PIV pv JOIN tgfpar p ON p.codparc = pv.codparc
        ),
        CALC_POR_PARC AS (
          SELECT tipo_cli, NVL(total,0) AS total_vendas, NVL(total_st,0) AS total_vendas_st, NVL(total_trib,0) AS total_vendas_trib,
            (CASE TO_CHAR(NVL(tipo_cli, 5)) WHEN '1' THEN NVL(t.FATOR_ST_7,0) WHEN '4' THEN NVL(t.FATOR_ST_7,0) WHEN '5' THEN NVL(t.FATOR_ST_10,0) ELSE 0 END) AS fator_st,
            (CASE TO_CHAR(NVL(tipo_cli, 5)) WHEN '1' THEN NVL(t.FATOR_TRIB_7,0) WHEN '4' THEN NVL(t.FATOR_TRIB_7,0) WHEN '5' THEN NVL(t.FATOR_TRIB_10,0) ELSE 0 END) AS fator_trib,
            (CASE TO_CHAR(NVL(tipo_cli, 5))
              WHEN '1' THEN CASE WHEN NVL(total_trib,0) > NVL(t.FATOR_TRIB_7,0) THEN ((NVL(total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04) ELSE NVL(total_trib,0) * 0.04 END
              WHEN '2' THEN NVL(total_trib,0) * 0.20 WHEN '3' THEN NVL(total_trib,0) * 0.20
              WHEN '4' THEN CASE WHEN NVL(total_trib,0) > NVL(t.FATOR_TRIB_7,0) THEN ((NVL(total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04) ELSE NVL(total_trib,0) * 0.04 END
              WHEN '5' THEN CASE WHEN NVL(total_trib,0) > NVL(t.FATOR_TRIB_10,0) THEN ((NVL(total_trib,0) - NVL(t.FATOR_TRIB_10,0)) * 0.20) + (NVL(t.FATOR_TRIB_10,0) * 0.04) ELSE NVL(total_trib,0) * 0.04 END
              WHEN '6' THEN NVL(total_trib,0) * 0.01 WHEN '7' THEN NVL(total_trib,0) * 0.20 ELSE 0 END) AS imposto_trib,
            (CASE TO_CHAR(NVL(tipo_cli, 5))
              WHEN '1' THEN CASE WHEN NVL(total_st,0) > NVL(t.FATOR_ST_7,0) THEN (NVL(total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04 ELSE 0 END
              WHEN '2' THEN NVL(total_st,0) * 0.04 WHEN '3' THEN NVL(total_st,0) * 0.04
              WHEN '4' THEN CASE WHEN NVL(total_st,0) > NVL(t.FATOR_ST_7,0) THEN (NVL(total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04 ELSE 0 END
              WHEN '5' THEN CASE WHEN NVL(total_st,0) > NVL(t.FATOR_ST_10,0) THEN (NVL(total_st,0) - NVL(t.FATOR_ST_10,0)) * 0.04 ELSE 0 END
              WHEN '6' THEN 0 WHEN '7' THEN NVL(total_st,0) * 0.04 ELSE 0 END) AS imposto_st,
            NVL(st_ind_pb,0) AS st_pb, NVL(trib_ind_pb,0) AS trib_pb,
            GREATEST(NVL(total_st,0) - NVL(st_ind_pb,0), 0) AS restante_st, GREATEST(NVL(total_trib,0) - NVL(trib_ind_pb,0), 0) AS restante_trib
          FROM PARC CROSS JOIN T t
        )
        SELECT
          TO_CHAR(NVL(tipo_cli, 5)) AS TIPO_COD,
          CASE TO_CHAR(NVL(tipo_cli, 5)) WHEN '1' THEN 'Construtora' WHEN '2' THEN 'Pessoa Física' WHEN '3' THEN 'Jurídica sem IE' WHEN '4' THEN 'Jurídica com IE' WHEN '5' THEN 'Atacadista / Indústria' WHEN '6' THEN 'Fora do estado com IE' WHEN '7' THEN 'Fora do estado (PF+PJ sem IE+Construtora)' ELSE 'ERROR' END AS TIPO_DESC,
          MAX(fator_st) AS FATOR_ST, MAX(fator_trib) AS FATOR_TRIB,
          NVL(SUM(total_vendas),0) AS TOT_VENDAS, NVL(SUM(total_vendas_st),0) AS TOT_VENDAS_ST, NVL(SUM(total_vendas_trib),0) AS TOT_VENDAS_TRIB,
          NVL(SUM(imposto_st),0) AS TOT_IMP_ST, NVL(SUM(imposto_trib),0) AS TOT_IMP_TRIB, NVL(SUM(imposto_st + imposto_trib),0) AS TOT_IMPOSTOS,
          NVL(SUM(st_pb),0) AS TOT_ST_PB, NVL(SUM(trib_pb),0) AS TOT_TRIB_PB, NVL(SUM(restante_st),0) AS TOT_REST_ST, NVL(SUM(restante_trib),0) AS TOT_REST_TRIB
        FROM CALC_POR_PARC
        GROUP BY TO_CHAR(NVL(tipo_cli, 5)), CASE TO_CHAR(NVL(tipo_cli, 5)) WHEN '1' THEN 'Construtora' WHEN '2' THEN 'Pessoa Física' WHEN '3' THEN 'Jurídica sem IE' WHEN '4' THEN 'Jurídica com IE' WHEN '5' THEN 'Atacadista / Indústria' WHEN '6' THEN 'Fora do estado com IE' WHEN '7' THEN 'Fora do estado (PF+PJ sem IE+Construtora)' ELSE 'ERROR' END
        ORDER BY TO_NUMBER(TO_CHAR(NVL(tipo_cli, 5)))
      `;
    }
    else if (visao === 'parceiro') {
      sql = `
        WITH BASE_FATURAMENTO AS (
          SELECT CASE WHEN NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70') THEN (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) ELSE 0 END AS vlr_st,
                 CASE WHEN NOT (NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')) THEN (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) ELSE 0 END AS vlr_trib,
                 (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) AS vlr_assinado
          FROM tgfcab c JOIN tgfite i ON i.nunota = c.nunota
          WHERE c.codtipoper IN (700, 701, 326, 299, 382, 801, 800) AND c.STATUSNFE = 'A' AND NVL(c.numnota,0) <> 0 AND c.CODEMP = 1
            AND TRUNC(c.dtneg) BETWEEN ADD_MONTHS(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'), -1) AND LAST_DAY(ADD_MONTHS(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'), -1))
        ),
        TOTALIZADORES AS (
          SELECT NVL(SUM(vlr_assinado),0) AS FATUR_TOTAL, NVL(SUM(vlr_assinado),0)*0.07 AS FATOR_7, NVL(SUM(vlr_st),0)*0.10 AS FATOR_ST_10, NVL(SUM(vlr_st),0)*0.07 AS FATOR_ST_7, NVL(SUM(vlr_trib),0)*0.10 AS FATOR_TRIB_10, NVL(SUM(vlr_trib),0)*0.07 AS FATOR_TRIB_7 FROM BASE_FATURAMENTO
        ),
        ITENS AS (
          SELECT c.codparc, i.codprod, c.nunota, c.codtipoper, CASE WHEN NVL(i.basesubstit,0) > 0 OR NVL(i.vlrsubst,0) > 0 OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70') THEN 'ST' ELSE 'TRIB' END AS tip_trib,
                 (CASE WHEN c.codtipoper IN (800,801) THEN -1 ELSE 1 END) * (NVL(i.vlrtot,0) - NVL(i.vlrdesc,0)) AS vlr_liq
          FROM tgfcab c JOIN tgfite i ON i.nunota = c.nunota
          WHERE c.codtipoper IN (700, 701, 326, 299, 382, 801, 800) AND c.statusnfe = 'A' AND NVL(c.numnota,0) <> 0 AND c.codemp = 1
            AND TRUNC(c.dtneg) BETWEEN TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM') AND LAST_DAY(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'))
        ),
        ULTIMA_ENTRADA_PROD AS (
          SELECT x.codprod, x.ad_indpb FROM (SELECT ite_ent.codprod, par_ent.ad_indpb, ROW_NUMBER() OVER (PARTITION BY ite_ent.codprod ORDER BY cab_ent.dtneg DESC, cab_ent.nunota DESC) AS rn FROM tgfcab cab_ent JOIN tgfite ite_ent ON ite_ent.nunota = cab_ent.nunota LEFT JOIN tgfpar par_ent ON par_ent.codparc = cab_ent.codparc WHERE NVL(cab_ent.numnota,0) <> 0 AND cab_ent.statusnota = 'L' AND cab_ent.codtipoper IN (300,344)) x WHERE x.rn = 1
        ),
        MOV AS (
          SELECT it.codparc, it.tip_trib, COUNT(DISTINCT it.nunota) AS qtd_notas,
            SUM(CASE WHEN it.codtipoper IN (800,801) THEN 0 ELSE NVL(it.vlr_liq,0) END) AS vlr_vendas,
            SUM(CASE WHEN it.codtipoper IN (800,801) THEN ABS(NVL(it.vlr_liq,0)) ELSE 0 END) AS vlr_devolucao,
            SUM(it.vlr_liq) AS total_liq, SUM(CASE WHEN NVL(ue.ad_indpb,'N') = 'S' THEN it.vlr_liq ELSE 0 END) AS total_liq_indpb
          FROM ITENS it LEFT JOIN ULTIMA_ENTRADA_PROD ue ON ue.codprod = it.codprod GROUP BY it.codparc, it.tip_trib
        ),
        PIV AS (
          SELECT codparc, SUM(qtd_notas) AS qtd_notas, SUM(vlr_vendas) AS VLR_VENDAS, SUM(vlr_devolucao) AS VLR_DEVOLUCAO,
            SUM(total_liq) AS total, SUM(CASE WHEN tip_trib='ST' THEN total_liq ELSE 0 END) AS total_st, SUM(CASE WHEN tip_trib='TRIB' THEN total_liq ELSE 0 END) AS total_trib,
            SUM(CASE WHEN tip_trib='ST' THEN total_liq_indpb ELSE 0 END) AS st_ind_pb, SUM(CASE WHEN tip_trib='TRIB' THEN total_liq_indpb ELSE 0 END) AS trib_ind_pb
          FROM MOV GROUP BY codparc
        )
        SELECT
          pv.codparc AS CODPARC, 
          p.razaosocial AS NOMEPARC,
          CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5)) WHEN '1' THEN 'Construtora' WHEN '2' THEN 'Pessoa Física' WHEN '3' THEN 'Jurídica sem IE' WHEN '4' THEN 'Jurídica com IE' WHEN '5' THEN 'Atacadista / Indústria' WHEN '6' THEN 'Fora do estado com IE' WHEN '7' THEN 'Fora do estado (PF+PJ sem IE+Construtora)' ELSE 'ERROR' END AS AD_TIPOCLIENTEFATURAR,
          pv.VLR_VENDAS AS VLR_VENDAS, 
          pv.VLR_DEVOLUCAO AS VLR_DEVOLUCAO,
          (CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5))
            WHEN '1' THEN CASE WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_7,0) THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04) ELSE NVL(pv.total_trib,0) * 0.04 END
            WHEN '2' THEN NVL(pv.total_trib,0) * 0.20 WHEN '3' THEN NVL(pv.total_trib,0) * 0.20
            WHEN '4' THEN CASE WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_7,0) THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04) ELSE NVL(pv.total_trib,0) * 0.04 END
            WHEN '5' THEN CASE WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_10,0) THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_10,0)) * 0.20) + (NVL(t.FATOR_TRIB_10,0) * 0.04) ELSE NVL(pv.total_trib,0) * 0.04 END
            WHEN '6' THEN NVL(pv.total_trib,0) * 0.01 WHEN '7' THEN NVL(pv.total_trib,0) * 0.20 ELSE 0 END) AS IMPOSTOTRIB,
          (CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5))
            WHEN '1' THEN CASE WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_7,0) THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04 ELSE 0 END
            WHEN '2' THEN NVL(pv.total_st,0) * 0.04 WHEN '3' THEN NVL(pv.total_st,0) * 0.04
            WHEN '4' THEN CASE WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_7,0) THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04 ELSE 0 END
            WHEN '5' THEN CASE WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_10,0) THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_10,0)) * 0.04 ELSE 0 END
            WHEN '6' THEN 0 WHEN '7' THEN NVL(pv.total_st,0) * 0.04 ELSE 0 END) AS IMPOSTOST,
          ((CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5)) WHEN '1' THEN CASE WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_7,0) THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04) ELSE NVL(pv.total_trib,0) * 0.04 END WHEN '2' THEN NVL(pv.total_trib,0) * 0.20 WHEN '3' THEN NVL(pv.total_trib,0) * 0.20 WHEN '4' THEN CASE WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_7,0) THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04) ELSE NVL(pv.total_trib,0) * 0.04 END WHEN '5' THEN CASE WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_10,0) THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_10,0)) * 0.20) + (NVL(t.FATOR_TRIB_10,0) * 0.04) ELSE NVL(pv.total_trib,0) * 0.04 END WHEN '6' THEN NVL(pv.total_trib,0) * 0.01 WHEN '7' THEN NVL(pv.total_trib,0) * 0.20 ELSE 0 END) + (CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5)) WHEN '1' THEN CASE WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_7,0) THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04 ELSE 0 END WHEN '2' THEN NVL(pv.total_st,0) * 0.04 WHEN '3' THEN NVL(pv.total_st,0) * 0.04 WHEN '4' THEN CASE WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_7,0) THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04 ELSE 0 END WHEN '5' THEN CASE WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_10,0) THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_10,0)) * 0.04 ELSE 0 END WHEN '6' THEN 0 WHEN '7' THEN NVL(pv.total_st,0) * 0.04 ELSE 0 END)) AS IMPOSTOS,
          pv.qtd_notas AS QTD_NOTAS, pv.total AS TOTAL, pv.total_st AS TOTAL_ST, pv.total_trib AS TOTAL_TRIB, pv.st_ind_pb AS ST_IND_PB, pv.trib_ind_pb AS TRIB_IND_PB,
          GREATEST(NVL(pv.total_st,0) - NVL(pv.st_ind_pb,0), 0) AS RESTANTE_ST, GREATEST(NVL(pv.total_trib,0) - NVL(pv.trib_ind_pb,0), 0) AS RESTANTE_TRIB,
          (GREATEST(NVL(pv.total_st,0) - NVL(pv.st_ind_pb,0), 0) + GREATEST(NVL(pv.total_trib,0) - NVL(pv.trib_ind_pb,0), 0)) AS VALOR_RESTANTE,
          '#E3F2FD' AS BK_ST, '#1E88E5' AS FG_ST, '#FFEBEE' AS BK_TRIB, '#E53935' AS FG_TRIB
        FROM PIV pv JOIN tgfpar p ON p.codparc = pv.codparc CROSS JOIN TOTALIZADORES t ORDER BY pv.total DESC
      `;
    } else if (visao === 'detalhe') {
      sql = `
        SELECT
          cab.numnota AS NUMNOTA, TRUNC(cab.dtneg) AS DTNEG, cab.codtipoper AS CODTIPOPER, cab.codparc AS CODPARC, par.razaosocial AS NOMEPARC,
          MAX(CASE TO_CHAR(NVL(par.ad_tipoclientefaturar, 5)) WHEN '1' THEN 'Construtora' WHEN '2' THEN 'Pessoa Física' WHEN '3' THEN 'Jurídica sem IE' WHEN '4' THEN 'Jurídica com IE' WHEN '5' THEN 'Atacadista / Indústria' WHEN '6' THEN 'Fora do estado com IE' WHEN '7' THEN 'Fora do estado (PF+PJ sem IE+Construtora)' ELSE 'ERROR' END) AS AD_TIPOCLIENTEFATURAR,
          MAX(CASE TO_CHAR(NVL(par.ad_tipoclientefaturar, 5)) WHEN '2' THEN 0.07 ELSE 0.10 END) AS IMPOSTOS,
          CASE WHEN cab.codtipoper IN (800,801) THEN -SUM(NVL(ite.vlrtot,0) - NVL(ite.vlrdesc,0)) ELSE SUM(NVL(ite.vlrtot,0) - NVL(ite.vlrdesc,0)) END AS VLRNOTA_AJUSTADO,
          cab.codemp AS CODEMP
        FROM tgfcab cab JOIN tgfpar par ON par.codparc = cab.codparc JOIN tgfite ite ON ite.nunota = cab.nunota
        WHERE cab.codparc = ${Number(codParc)} AND cab.codtipoper IN (700, 701, 326, 299, 382, 801, 800)
          AND cab.STATUSNFE = 'A' AND NVL(cab.numnota,0) <> 0 AND cab.codemp = 1
          AND TRUNC(cab.dtneg) BETWEEN TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM') AND LAST_DAY(TRUNC(TO_DATE('${ref}','YYYY-MM-DD'),'MM'))
        GROUP BY cab.numnota, TRUNC(cab.dtneg), cab.codtipoper, cab.codparc, par.razaosocial, cab.codemp
        ORDER BY TRUNC(cab.dtneg) DESC, cab.numnota DESC
      `;
    }

    const body = { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } };
    const resp: any = await this.callBackSankhya(body, authToken);
    const rb = resp?.responseBody;

    if (rb?.fieldsMetadata && Array.isArray(rb?.rows)) {
      return rb.rows.map((row: any[]) => {
        const obj: any = {};
        row.forEach((val, idx) => { obj[rb.fieldsMetadata[idx]?.name || `COL_${idx}`] = val; });
        return obj;
      });
    }

    return rb?.rows ?? rb?.result ?? resp?.rows ?? resp?.result ?? [];
  }

  
  */

  private async callBackSankhya(
    body: any, authToken: string) {
    const serviceName = body?.serviceName;
    if (!serviceName) {
      throw new Error('callSankhya: body.serviceName é obrigatório');
    }

    // base sem serviceName fixo
    const baseUrl = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr';

    const url =
      `${baseUrl}?serviceName=${encodeURIComponent(serviceName)}` +
      `&outputType=json`;

    const { data } = await firstValueFrom(
      this.http.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`,
          appkey: this.appKey,
        },
        timeout: 60_000,
      }),
    );

    return data;
  }


  async getRelatorioIncentivo(
    dtIni: string,
    dtFin: string,
    cfops: number[] = []
  ): Promise<IncentivoResumoParceiro[]> {

    const listaCfops = cfops || [];
    const cfopClause = listaCfops.length > 0
      ? `AND c.CODCFO IN (${listaCfops.join(',')})`
      : '';

    const sqlQuery = `
      WITH ITENS AS (
        SELECT
          c.codparc,
          i.codprod,
          CASE
            WHEN NVL(i.basesubstit,0) > 0
              OR NVL(i.vlrsubst,0) > 0
              OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')
            THEN 'ST'
            ELSE 'TRIB'
          END AS tip_trib,
          c.nunota,
          c.codtipoper,
          (CASE WHEN c.codtipoper IN (800,801) THEN -1 ELSE 1 END) * NVL(i.vlrtot,0) AS vlr_liq
        FROM tgfcab c
        JOIN tgfite i ON i.nunota = c.nunota
        WHERE c.codtipoper IN (700, 701, 326, 299, 801, 800)
          AND c.statusnfe = 'A'
          AND NVL(c.numnota,0) <> 0
          AND c.codemp = 1
          AND TRUNC(c.dtneg) BETWEEN TO_DATE('${dtIni}', 'DD/MM/YYYY') AND TO_DATE('${dtFin}', 'DD/MM/YYYY')
          ${cfopClause}
      ),
      ULTIMA_ENTRADA_PROD AS (
        SELECT
          x.codprod,
          x.ad_indpb
        FROM (
          SELECT
            ite_ent.codprod,
            par_ent.ad_indpb AS ad_indpb,
            ROW_NUMBER() OVER (
              PARTITION BY ite_ent.codprod
              ORDER BY cab_ent.dtneg DESC, cab_ent.nunota DESC
            ) AS rn
          FROM tgfcab cab_ent
          JOIN tgfite ite_ent ON ite_ent.nunota = cab_ent.nunota
          LEFT JOIN tgfpar par_ent ON par_ent.codparc = cab_ent.codparc
          WHERE NVL(cab_ent.numnota,0) <> 0
            AND cab_ent.statusnota = 'L'
            AND cab_ent.codtipoper IN (300,344)
        ) x
        WHERE x.rn = 1
      ),
      MOV AS (
        SELECT
          it.codparc,
          it.tip_trib,
          COUNT(DISTINCT it.nunota) AS qtd_notas,
          SUM(it.vlr_liq) AS total_liq,
          SUM(CASE WHEN NVL(ue.ad_indpb,'N') = 'S' THEN it.vlr_liq ELSE 0 END) AS total_liq_indpb
        FROM ITENS it
        LEFT JOIN ULTIMA_ENTRADA_PROD ue ON ue.codprod = it.codprod
        GROUP BY it.codparc, it.tip_trib
      ),
      PIV AS (
        SELECT
          codparc,
          SUM(qtd_notas) AS qtd_notas,
          SUM(total_liq) AS total,
          SUM(CASE WHEN tip_trib='ST'   THEN total_liq ELSE 0 END) AS total_st,
          SUM(CASE WHEN tip_trib='TRIB' THEN total_liq ELSE 0 END) AS total_trib,
          SUM(CASE WHEN tip_trib='ST'   THEN total_liq_indpb ELSE 0 END) AS st_ind_pb,
          SUM(CASE WHEN tip_trib='TRIB' THEN total_liq_indpb ELSE 0 END) AS trib_ind_pb
        FROM MOV
        GROUP BY codparc
      )
      SELECT
        pv.codparc AS CODPARC,
        p.razaosocial AS NOMEPARC,
        CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5))
          WHEN '1' THEN 'Construtora'
          WHEN '2' THEN 'Pessoa Física'
          WHEN '3' THEN 'Jurídica sem IE'
          WHEN '4' THEN 'Jurídica com IE'
          WHEN '5' THEN 'Atacadista / Indústria'
          ELSE 'Atacadista / Indústria'
        END AS AD_TIPOCLIENTEFATURAR,
        pv.qtd_notas AS QTD_NOTAS,
        pv.total AS TOTAL,
        pv.total_st AS TOTAL_ST,
        pv.total_trib AS TOTAL_TRIB,
        pv.st_ind_pb AS ST_IND_PB,
        pv.trib_ind_pb AS TRIB_IND_PB,
        (pv.total - (pv.st_ind_pb + pv.trib_ind_pb)) AS VALOR_RESTANTE
      FROM PIV pv
      JOIN tgfpar p ON p.codparc = pv.codparc
      ORDER BY pv.total DESC
    `;

    // CORREÇÃO DO ERRO DE TIPAGEM: Removemos o <Generico> da chamada
    const token = await this.login();
    const result = await this.executeQuery(token, sqlQuery);
    await this.logout(token, "relatorio incentivo");
    // Forçamos o tipo no retorno
    return result as unknown as IncentivoResumoParceiro[];
  }

  /*
  async getNotasMesGadget(token: string, codEmp: number, dtIni: string, dtFim: string): Promise<any[]> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // A query SQL exata do Gadget, substituindo as variáveis bind por TO_DATE e valores literais
    const sqlQuery = `
      WITH cab AS (
        SELECT
          CAB.NUNOTA,
          CAB.NUMNOTA,
          CAB.CODTIPOPER,
          CAB.DTNEG,
          CAB.CODPARC,
          CAB.VLRNOTA
        FROM TGFCAB CAB
        WHERE (((CAB.TIPMOV = 'V' OR CAB.TIPMOV = '3' OR CAB.TIPMOV = 'T')
          AND CAB.STATUSNFE = 'A') or CAB.TIPMOV = 'C' or CAB.TIPMOV = 'D')
          AND CAB.CODEMP    = ${codEmp}
          AND CAB.DTNEG >= TO_DATE('${dtIni}', 'YYYY-MM-DD')
          AND CAB.DTNEG <= TO_DATE('${dtFim}', 'YYYY-MM-DD')
      ),
      itens_cfop_cst AS (
        SELECT
          I.NUNOTA,
          I.CODCFO AS CFOP,
          LPAD(TO_CHAR(NVL(I.CODTRIB,0)), 2, '0') AS CST,
          SUM(NVL(I.VLRTOT,0) - NVL(I.VLRDESC,0)) AS VLR_CFOP_CST
        FROM TGFITE I
        JOIN cab C ON C.NUNOTA = I.NUNOTA
        GROUP BY I.NUNOTA, I.CODCFO, LPAD(TO_CHAR(NVL(I.CODTRIB,0)), 2, '0')
      )
      SELECT
        C.NUNOTA,
        C.NUMNOTA,
        C.CODTIPOPER,
        C.DTNEG,
        PAR.CODPARC,
        PAR.NOMEPARC,
        PAR.CGC_CPF AS CPF_CNPJ,
        CASE WHEN PAR.TIPPESSOA = 'J' THEN 'PJ' ELSE 'PF' END AS TIPO_PESSOA,
        PAR.IDENTINSCESTAD AS IE,
        NFE.CHAVENFE AS CHAVE_ACESSO,
        CASE TO_CHAR(PAR.AD_CONSTRUTORA)
              WHEN '1' THEN 'Sim'
              WHEN '2' THEN 'Não'
              ELSE 'Não informado' END AS CONSTRUTORA,
        CASE TO_CHAR(PAR.AD_CONTRIBUINTE)
              WHEN '1' THEN 'Sim'
              WHEN '2' THEN 'Não'
              ELSE 'Não informado' END AS CONTRIBUINTE,
        ICF.CFOP,
        ICF.CST,
        ICF.VLR_CFOP_CST AS VLRNOTA
      FROM cab C
      JOIN itens_cfop_cst ICF ON ICF.NUNOTA = C.NUNOTA
      LEFT JOIN TGFPAR PAR ON PAR.CODPARC = C.CODPARC
      LEFT JOIN TGFNFE NFE ON NFE.NUNOTA  = C.NUNOTA
      ORDER BY C.DTNEG DESC, ICF.CFOP, ICF.CST
    `;

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: {
        sql: sqlQuery
      }
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg = resp?.data?.statusMessage || JSON.stringify(resp?.data);
      throw new Error(`Falha ao buscar dados do Gadget: ${msg}`);
    }

    const responseBody = resp.data.responseBody;
    if (!responseBody || !responseBody.fieldsMetadata || !responseBody.rows) {
      return [];
    }

    // Parse dinâmico do retorno do DbExplorerSP (mapeia as colunas com os valores da matriz)
    const fields = responseBody.fieldsMetadata.map((f: any) => f.name);
    const rows = responseBody.rows.map((row: any[]) => {
      const obj: any = {};
      fields.forEach((field, index) => {
        obj[field] = row[index];
      });
      return obj;
    });

    return rows;
  }*/

  async getNotasMesGadget(
    token: string, codEmp: number, dtIni: string, dtFim: string): Promise<any[]> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Query atualizada conforme o seu Gadget XML
    const sqlQuery = `
      WITH cab AS (
        SELECT
          CAB.NUNOTA, CAB.NUMNOTA, CAB.CODTIPOPER, CAB.DTNEG, CAB.CODPARC, CAB.VLRNOTA
        FROM TGFCAB CAB
        WHERE (((CAB.TIPMOV = 'V' OR CAB.TIPMOV = '3' OR CAB.TIPMOV = 'T')
          AND CAB.STATUSNFE = 'A') OR CAB.TIPMOV = 'C' OR CAB.TIPMOV = 'D')
          AND CAB.CODEMP = ${codEmp}
          AND CAB.DTNEG >= TO_DATE('${dtIni}', 'YYYY-MM-DD')
          AND CAB.DTNEG <= TO_DATE('${dtFim}', 'YYYY-MM-DD')
      ),
     itens_cfop_cst AS (
        SELECT
          I.NUNOTA, I.CODCFO AS CFOP, LPAD(TO_CHAR(NVL(I.CODTRIB,0)), 2, '0') AS CST,
          SUM(NVL(I.VLRTOT,0) - NVL(I.VLRDESC,0)) AS VLR_CFOP_CST
        FROM TGFITE I
        JOIN cab C ON C.NUNOTA = I.NUNOTA
        WHERE I.CODCFO IN (5102, 5405, 5117, 6102, 6108, 6404, 6117,  1202, 1411, 2202, 2411)
        GROUP BY I.NUNOTA, I.CODCFO, LPAD(TO_CHAR(NVL(I.CODTRIB,0)), 2, '0')
      )
      SELECT
        C.NUNOTA, C.NUMNOTA, C.CODTIPOPER, C.DTNEG, PAR.CODPARC, PAR.NOMEPARC,
        UFS.UF AS UF, PAR.CGC_CPF AS CPF_CNPJ,
        CASE WHEN PAR.TIPPESSOA = 'J' THEN 'PJ' ELSE 'PF' END AS TIPO_PESSOA,
        PAR.IDENTINSCESTAD AS IE, NFE.CHAVENFE AS CHAVE_ACESSO,
        
        PAR.AD_TIPOCLIENTEFATURAR AS AD_TIPOCLIENTEFATURAR,
        
        CASE
          WHEN TO_CHAR(PAR.AD_TIPOCLIENTEFATURAR) IN ('1','4','5','6') THEN 'CONTRIBUINTE'
          WHEN TO_CHAR(PAR.AD_TIPOCLIENTEFATURAR) IN ('2','3','7') THEN 'NAO_CONTRIBUINTE'
          ELSE 'OUTROS'
        END AS CLASSE_CONTRIB,
        
        ICF.CFOP, CF.DESCRCFO AS DESCRCFO, ICF.CST, ICF.VLR_CFOP_CST AS VLRNOTA
      FROM cab C
      JOIN itens_cfop_cst ICF ON ICF.NUNOTA = C.NUNOTA
      LEFT JOIN TGFPAR PAR ON PAR.CODPARC = C.CODPARC
      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
      LEFT JOIN TGFNFE NFE ON NFE.NUNOTA  = C.NUNOTA
      LEFT JOIN TGFCFO CF  ON CF.CODCFO   = ICF.CFOP
      ORDER BY C.DTNEG DESC, ICF.CFOP, ICF.CST
    `;

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql: sqlQuery }
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg = resp?.data?.statusMessage || JSON.stringify(resp?.data);
      throw new Error(`Falha ao buscar dados do Gadget: ${msg}`);
    }

    const responseBody = resp.data.responseBody;
    if (!responseBody || !responseBody.fieldsMetadata || !responseBody.rows) {
      return [];
    }

    console.log(responseBody)

    const fields = responseBody.fieldsMetadata.map((f: any) => f.name);
    return responseBody.rows.map((row: any[]) => {
      const obj: any = {};
      fields.forEach((field, index) => {
        obj[field] = row[index];
      });
      return obj;
    });
  }
  /*
  async getNotasEntradaMes(
      token: string,
      codEmp: number,
      dtIni: string,
      dtFim: string,
    ): Promise<any[]> {
      const url =
        'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';
  
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
  
      const sqlQuery = `
        WITH cab AS (
          SELECT
            CAB.NUNOTA,
            CAB.NUMNOTA,
            CAB.CODTIPOPER,
            CAB.DTENTSAI,
            CAB.CODPARC,
            CAB.VLRNOTA
          FROM TGFCAB CAB
          WHERE CAB.TIPMOV IN ('C', 'D')
            AND CAB.CODEMP = ${codEmp}
            AND CAB.DTENTSAI >= TO_DATE('${dtIni}', 'YYYY-MM-DD')
            AND CAB.DTENTSAI < TO_DATE('${dtFim}', 'YYYY-MM-DD') + 1
        ),
        itens_agrupados AS (
          SELECT
            ITE.NUNOTA,
            ITE.CODCFO AS CFOP,
            SUM(NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)) AS VALORCONTABIL,
            SUM(NVL(ITE.BASEICMS, 0)) AS BASEICMS,
            SUM(NVL(ITE.VLRICMS, 0)) AS ICMS,
            SUM(NVL(ITE.BASESUBSTIT, 0)) AS BASEST,
            SUM(NVL(ITE.VLRSUBST, 0)) AS ICMSST,
            
            -- Separação do Valor dos Itens por CST (Tributado vs ST)
            SUM(
              CASE
                WHEN LPAD(TO_CHAR(NVL(ITE.CODTRIB, 0)), 2, '0') IN ('00', '20')
                THEN NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)
                ELSE 0
              END
            ) AS VLR_ITEM_TRIB,
            
            SUM(
              CASE
                WHEN LPAD(TO_CHAR(NVL(ITE.CODTRIB, 0)), 2, '0') IN ('10', '30', '60', '70')
                THEN NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)
                ELSE 0
              END
            ) AS VLR_ITEM_ST,
            
            SUM(NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)) AS VLR_ITEM_TOTAL,
            
            LISTAGG(
              DISTINCT LPAD(TO_CHAR(NVL(ITE.CODTRIB, 0)), 2, '0'),
              ','
            ) WITHIN GROUP (
              ORDER BY LPAD(TO_CHAR(NVL(ITE.CODTRIB, 0)), 2, '0')
            ) AS CST,
            MAX(NVL(ITE.ALIQICMS, 0)) AS ALIQICMS
          FROM TGFITE ITE
          INNER JOIN cab C ON C.NUNOTA = ITE.NUNOTA
          GROUP BY
            ITE.NUNOTA,
            ITE.CODCFO
        )
  
        SELECT
          C.NUNOTA,
          C.NUMNOTA,
          C.CODTIPOPER,
          TO_CHAR(C.DTENTSAI, 'YYYY-MM-DD HH24:MI:SS') AS DTENTSAI,
          PAR.CODPARC,
          PAR.NOMEPARC,
          UFS.UF AS UF,
          PAR.CGC_CPF AS CPF_CNPJ,
          CASE
            WHEN PAR.TIPPESSOA = 'J' THEN 'PJ'
            ELSE 'PF'
          END AS TIPO_PESSOA,
          PAR.IDENTINSCESTAD AS IE,
          NFE.CHAVENFE AS CHAVE_ACESSO,
          PAR.AD_TIPOCLIENTEFATURAR AS AD_TIPOCLIENTEFATURAR,
          CASE
            WHEN TO_CHAR(PAR.AD_TIPOCLIENTEFATURAR) IN ('1', '4', '5', '6') THEN 'CONTRIBUINTE'
            WHEN TO_CHAR(PAR.AD_TIPOCLIENTEFATURAR) IN ('2', '3', '7') THEN 'NAO_CONTRIBUINTE'
            ELSE 'OUTROS'
          END AS CLASSE_CONTRIB,
          I.CFOP,
          CF.DESCRCFO AS DESCRCFO,
          NVL(I.CST, '00') AS CST,
          NVL(I.ALIQICMS, 0) AS ALIQICMS,
          
          -- Valores Mapeados Diretamente dos Itens
          NVL(I.VALORCONTABIL, 0) AS VALORCONTABIL,
          NVL(I.BASEICMS, 0) AS BASEICMS,
          NVL(I.ICMS, 0) AS ICMS,
          NVL(I.BASEST, 0) AS BASEST,
          NVL(I.ICMSST, 0) AS ICMSST,
          
          0 AS OUTRAS, 
          0 AS ISENTAS, 
          
          NVL(I.VLR_ITEM_TRIB, 0) AS VLR_TRIBUTADO,
          NVL(I.VLR_ITEM_ST, 0) AS VLR_ST_CLASSIFICADO,
          NVL(C.VLRNOTA, 0) AS VLRNOTA
  
        FROM cab C
        INNER JOIN itens_agrupados I ON I.NUNOTA = C.NUNOTA
        LEFT JOIN TGFPAR PAR ON PAR.CODPARC = C.CODPARC
        LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
        LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
        LEFT JOIN TGFNFE NFE ON NFE.NUNOTA = C.NUNOTA
        LEFT JOIN TGFCFO CF ON CF.CODCFO = I.CFOP
        ORDER BY C.DTENTSAI DESC, C.NUNOTA, I.CFOP
      `;
  
      const body = {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql: sqlQuery },
      };
  
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
  
      if (resp?.data?.status !== '1') {
        const msg = resp?.data?.statusMessage || JSON.stringify(resp?.data);
        throw new Error(`Falha ao buscar dados do Gadget: ${msg}`);
      }
  
      const responseBody = resp.data.responseBody;
      if (!responseBody || !responseBody.fieldsMetadata || !responseBody.rows) {
        return [];
      }
  
      const fields = responseBody.fieldsMetadata.map((f: any) => f.name);
  
      return responseBody.rows.map((row: any[]) => {
        const obj: any = {};
        fields.forEach((field: string, index: number) => {
          obj[field] = row[index];
        });
        return obj;
      });
    }*/

  /*
      async getNotasEntradaMes(
    token: string,
    codEmp: number,
    dtIni: string,
    dtFim: string,
  ): Promise<any[]> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const sqlQuery = `
      WITH cab AS (
        SELECT
          CAB.NUNOTA,
          CAB.NUMNOTA,
          CAB.CODTIPOPER,
          CAB.DTENTSAI,
          CAB.CODPARC,
          CAB.VLRNOTA
        FROM TGFCAB CAB
        WHERE CAB.TIPMOV IN ('C', 'D')
          AND CAB.CODEMP = ${codEmp}
          AND CAB.DTENTSAI >= TO_DATE('${dtIni}', 'YYYY-MM-DD')
          AND CAB.DTENTSAI < TO_DATE('${dtFim}', 'YYYY-MM-DD') + 1
      ),
      itens_agrupados AS (
        SELECT
          ITE.NUNOTA,
          ITE.CODCFO AS CFOP,
          PRO.NCM,
          SUM(NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)) AS VALORCONTABIL,
          SUM(NVL(ITE.BASEICMS, 0)) AS BASEICMS,
          SUM(NVL(ITE.VLRICMS, 0)) AS ICMS,
          SUM(NVL(ITE.BASESUBSTIT, 0)) AS BASEST,
          SUM(NVL(ITE.VLRSUBST, 0)) AS ICMSST,
          SUM(CASE WHEN LPAD(TO_CHAR(NVL(ITE.CODTRIB, 0)), 2, '0') IN ('00', '20') THEN NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0) ELSE 0 END) AS VLR_ITEM_TRIB,
          SUM(CASE WHEN LPAD(TO_CHAR(NVL(ITE.CODTRIB, 0)), 2, '0') IN ('10', '30', '60', '70') THEN NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0) ELSE 0 END) AS VLR_ITEM_ST,
          SUM(NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)) AS VLR_ITEM_TOTAL,
          LISTAGG(DISTINCT LPAD(TO_CHAR(NVL(ITE.CODTRIB, 0)), 2, '0'), ',') WITHIN GROUP (ORDER BY LPAD(TO_CHAR(NVL(ITE.CODTRIB, 0)), 2, '0')) AS CST,
          MAX(NVL(ITE.ALIQICMS, 0)) AS ALIQICMS
        FROM TGFITE ITE
        INNER JOIN cab C ON C.NUNOTA = ITE.NUNOTA
        INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
        GROUP BY ITE.NUNOTA, ITE.CODCFO, PRO.NCM
      ),
      -- CORREÇÃO: Puxar a coluna XML diretamente, pois o seu banco não requer conversão de XMLType
      xml_unico AS (
        SELECT NUNOTA, XML AS XML_STRING
        FROM (
          SELECT NUNOTA, XML, ROW_NUMBER() OVER(PARTITION BY NUNOTA ORDER BY NUNOTA) as rn 
          FROM TGFIXN
          WHERE NUNOTA IS NOT NULL
        ) WHERE rn = 1
      )

      SELECT
        C.NUNOTA, C.NUMNOTA, C.CODTIPOPER, TO_CHAR(C.DTENTSAI, 'YYYY-MM-DD HH24:MI:SS') AS DTENTSAI,
        PAR.CODPARC, PAR.NOMEPARC, UFS.UF AS UF, PAR.CGC_CPF AS CPF_CNPJ,
        CASE WHEN PAR.TIPPESSOA = 'J' THEN 'PJ' ELSE 'PF' END AS TIPO_PESSOA,
        PAR.IDENTINSCESTAD AS IE, NFE.CHAVENFE AS CHAVE_ACESSO, PAR.AD_TIPOCLIENTEFATURAR AS AD_TIPOCLIENTEFATURAR,
        CASE
          WHEN TO_CHAR(PAR.AD_TIPOCLIENTEFATURAR) IN ('1', '4', '5', '6') THEN 'CONTRIBUINTE'
          WHEN TO_CHAR(PAR.AD_TIPOCLIENTEFATURAR) IN ('2', '3', '7') THEN 'NAO_CONTRIBUINTE'
          ELSE 'OUTROS'
        END AS CLASSE_CONTRIB,
        I.CFOP, CF.DESCRCFO AS DESCRCFO, NVL(I.CST, '00') AS CST, NVL(I.ALIQICMS, 0) AS ALIQICMS,
        I.NCM,
        
        NVL(I.VALORCONTABIL, 0) AS VALORCONTABIL, NVL(I.BASEICMS, 0) AS BASEICMS, NVL(I.ICMS, 0) AS ICMS,
        NVL(I.BASEST, 0) AS BASEST, NVL(I.ICMSST, 0) AS ICMSST, 0 AS OUTRAS, 0 AS ISENTAS, 
        NVL(I.VLR_ITEM_TRIB, 0) AS VLR_TRIBUTADO, NVL(I.VLR_ITEM_ST, 0) AS VLR_ST_CLASSIFICADO, NVL(C.VLRNOTA, 0) AS VLRNOTA,

        -- Traz a coluna do CTE
        X.XML_STRING AS XML

      FROM cab C
      INNER JOIN itens_agrupados I ON I.NUNOTA = C.NUNOTA
      LEFT JOIN TGFPAR PAR ON PAR.CODPARC = C.CODPARC
      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
      LEFT JOIN TGFNFE NFE ON NFE.NUNOTA = C.NUNOTA
      LEFT JOIN TGFCFO CF ON CF.CODCFO = I.CFOP
      LEFT JOIN xml_unico X ON X.NUNOTA = C.NUNOTA
      ORDER BY C.DTENTSAI DESC, C.NUNOTA, I.CFOP
    `;

    const body = { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlQuery } };
    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg = resp?.data?.statusMessage || JSON.stringify(resp?.data);
      throw new Error(`Falha ao buscar dados do Gadget: ${msg}`);
    }

    const responseBody = resp.data.responseBody;
    if (!responseBody || !responseBody.fieldsMetadata || !responseBody.rows) {
      return [];
    }

    const fields = responseBody.fieldsMetadata.map((f: any) => f.name);

    return responseBody.rows.map((row: any[]) => {
      const obj: any = {};
      fields.forEach((field: string, index: number) => {
        obj[field] = row[index];
      });
      return obj;
    });
  }
  */

  async getNotasEntradaMes(
    token: string,
    codEmp: number,
    dtIni: string,
    dtFim: string,
  ): Promise<any[]> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const sqlQuery = `
      WITH cab AS (
        SELECT CAB.NUNOTA, CAB.NUMNOTA, CAB.DTENTSAI, CAB.DTNEG, CAB.CODPARC, CAB.VLRNOTA, CAB.STATUSNOTA
        FROM TGFCAB CAB
        INNER JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
        INNER JOIN TSICID CID ON CID.CODCID = PAR.CODCID
        INNER JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
        WHERE CAB.TIPMOV IN ('C', 'E') 
          AND CAB.CODEMP = ${codEmp}
          AND UFS.UF <> 'PB' 
          AND CAB.STATUSNOTA IN ('L', 'A') 
          AND CAB.DTENTSAI >= TO_DATE('${dtIni}', 'YYYY-MM-DD') 
          AND CAB.DTENTSAI < TO_DATE('${dtFim}', 'YYYY-MM-DD') + 1
      ),
      itens_agrupados AS (
        SELECT ITE.NUNOTA,
               MAX(ITE.CODCFO) AS CFOP,
               MAX(PRO.NCM) AS NCM,
               SUM(NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)) AS VALORCONTABIL,
               
               -- RECEITA 1154: Direcionada apenas pelos CFOPs Normais (2102, 2101, etc)
               -- Exclui apenas os puramente Isentos ou Não Tributados (40, 41)
               SUM(
                 CASE 
                   WHEN ITE.CODCFO IN (2101, 2102, 2124, 2125, 2551, 2556) 
                        AND LPAD(TO_CHAR(NVL(ITE.CODTRIB,0)), 2, '0') NOT IN ('40', '41', '50') 
                   THEN (NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)) 
                   ELSE 0 
                 END
               ) AS VLR_ITEM_TRIB,
               
               -- RECEITA 1106: Direcionada EXCLUSIVAMENTE pelos CFOPs de ST (2403, 2401)
               -- (O bloqueio do CST 60 foi removido daqui para as notas voltarem a aparecer)
               SUM(
                 CASE 
                   WHEN ITE.CODCFO IN (2401, 2403, 2405) 
                        AND LPAD(TO_CHAR(NVL(ITE.CODTRIB,0)), 2, '0') NOT IN ('40', '41', '50')
                   THEN (NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)) 
                   ELSE 0 
                 END
               ) AS VLR_ITEM_ST

        FROM TGFITE ITE
        JOIN cab C ON C.NUNOTA = ITE.NUNOTA
        LEFT JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
        -- Filtra apenas CFOPs que compõem mercadorias (ignora fretes como Braspress)
        WHERE ITE.CODCFO IN (2101, 2102, 2124, 2125, 2401, 2403, 2405, 2551, 2556)
        GROUP BY ITE.NUNOTA
      )
      SELECT 
        C.NUNOTA, 
        C.NUMNOTA, 
        TO_CHAR(C.DTENTSAI, 'DD/MM/YYYY') AS DTENTSAI, 
        TO_CHAR(C.DTNEG, 'DD/MM/YYYY') AS DTNEG,
        PAR.NOMEPARC, 
        UFS.UF, 
        I.CFOP,
        I.NCM,
        C.STATUSNOTA,
        NVL(NFE.XML, '') AS XML,
        NVL(I.VALORCONTABIL, 0) AS VALORCONTABIL,
        NVL(I.VLR_ITEM_TRIB, 0) AS VLR_TRIBUTADO,
        NVL(I.VLR_ITEM_ST, 0) AS VLR_ST_CLASSIFICADO,
        NVL(C.VLRNOTA, 0) AS VLRNOTA
      FROM cab C
      INNER JOIN itens_agrupados I ON I.NUNOTA = C.NUNOTA
      LEFT JOIN TGFPAR PAR ON PAR.CODPARC = C.CODPARC
      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
      LEFT JOIN TGFNFE NFE ON NFE.NUNOTA = C.NUNOTA
      -- Se não tiver nenhum valor tributado, a nota é lixo e não vai pro Frontend
      WHERE (I.VLR_ITEM_TRIB > 0 OR I.VLR_ITEM_ST > 0)
      ORDER BY C.DTENTSAI DESC, C.NUMNOTA
    `;

    const body = { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sqlQuery } };
    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') throw new Error(`Falha: ${resp?.data?.statusMessage}`);

    const responseBody = resp.data.responseBody;
    if (!responseBody || !responseBody.fieldsMetadata || !responseBody.rows) return [];

    const fields = responseBody.fieldsMetadata.map((f: any) => f.name);
    return responseBody.rows.map((row: any[]) => {
      const obj: any = {};
      fields.forEach((field, index) => obj[field] = row[index]);
      return obj;
    });
  }


  // No arquivo SankhyaService.ts
  async getNotasMesDetalhado(
    token: string,
    codEmp: number,
    dtIni: string,
    dtFim: string,
    contrib: boolean,
    nContrib: boolean,
    cfops?: string[] // array recebido do controller
  ): Promise<any[]> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Prepara os filtros baseados nos parâmetros
    const pContrib = contrib ? 'S' : 'N';
    const pNContrib = nContrib ? 'S' : 'N';

    // Trata o filtro de múltiplos CFOPs
    let filtroCfop = '';
    if (cfops && cfops.length > 0 && !cfops.includes('0')) {
      const listaCfops = cfops.join(',');
      filtroCfop = `AND ICF.CFOP IN (${listaCfops})`;
    }

    const sqlQuery = `
    WITH cab AS (
      SELECT
        CAB.NUNOTA, CAB.NUMNOTA, CAB.CODTIPOPER, CAB.DTNEG, CAB.DTENTSAI, CAB.CODPARC, CAB.VLRNOTA
      FROM TGFCAB CAB
      WHERE (((CAB.TIPMOV = 'V' OR CAB.TIPMOV = '3' OR CAB.TIPMOV = 'T')
        AND CAB.STATUSNFE = 'A') OR CAB.TIPMOV = 'C' OR CAB.TIPMOV = 'D')
        AND CAB.CODEMP = ${codEmp}
        AND (
          (CAB.DTNEG >= TO_DATE('${dtIni}', 'YYYY-MM-DD') AND CAB.DTNEG <= TO_DATE('${dtFim}', 'YYYY-MM-DD'))
          OR
          (CAB.DTENTSAI >= TO_DATE('${dtIni}', 'YYYY-MM-DD') AND CAB.DTENTSAI <= TO_DATE('${dtFim}', 'YYYY-MM-DD'))
        )
    ),
    itens_cfop_cst AS (
      SELECT
        I.NUNOTA, 
        I.CODCFO AS CFOP, 
        LPAD(TO_CHAR(NVL(I.CODTRIB,0)), 2, '0') AS CST,
        SUM(NVL(I.VLRTOT,0) - NVL(I.VLRDESC,0)) AS VLR_CFOP_CST,
        
        -- As colunas fiscais exatas da TGFITE:
        SUM(NVL(I.BASEICMS,0)) AS BASEICMS,
        SUM(NVL(I.VLRICMS,0)) AS VLRICMS,
        SUM(NVL(I.BASESUBSTIT,0)) AS BASESUBST, -- AQUI ESTÁ O AJUSTE!
        SUM(NVL(I.VLRSUBST,0)) AS VLRSUBST
      FROM TGFITE I
      JOIN cab C ON C.NUNOTA = I.NUNOTA
      GROUP BY I.NUNOTA, I.CODCFO, LPAD(TO_CHAR(NVL(I.CODTRIB,0)), 2, '0')
    ),
    res AS (
      SELECT
        C.NUNOTA, C.NUMNOTA, C.CODTIPOPER,
        CASE
          WHEN ICF.CFOP IN (1102,1202,1403,1407,1411,1556,1926,1949,2102,2202,2353,2411,2403,2556,2949)
          THEN NVL(C.DTENTSAI, C.DTNEG)
          ELSE C.DTNEG
        END AS DTREF,
        C.DTNEG, C.DTENTSAI,
        PAR.CODPARC, PAR.NOMEPARC, UFS.UF, PAR.CGC_CPF AS CPF_CNPJ,
        CASE WHEN PAR.TIPPESSOA = 'J' THEN 'PJ' ELSE 'PF' END AS TIPO_PESSOA,
        PAR.IDENTINSCESTAD AS IE, NFE.CHAVENFE AS CHAVE_ACESSO,
        
        PAR.AD_TIPOCLIENTEFATURAR AS AD_TIPOCLIENTEFATURAR,
        CASE TO_CHAR(PAR.AD_TIPOCLIENTEFATURAR)
          WHEN '1' THEN 'Construtora'
          WHEN '2' THEN 'Pessoa Física'
          WHEN '3' THEN 'Jurídica sem IE'
          WHEN '4' THEN 'Jurídica com IE'
          WHEN '5' THEN 'Atacadista / Indústria'
          WHEN '6' THEN 'Fora do estado (Contribuinte)'
          WHEN '7' THEN 'Fora do estado (Não contribuinte)'
          ELSE 'Não informado'
        END AS AD_TIPOCLIENTEFATURAR_DESC,
        
        CASE
          WHEN TO_CHAR(PAR.AD_TIPOCLIENTEFATURAR) IN ('1','4','5','6') THEN 'CONTRIBUINTE'
          WHEN TO_CHAR(PAR.AD_TIPOCLIENTEFATURAR) IN ('2','3','7') THEN 'NAO_CONTRIBUINTE'
          ELSE 'OUTROS'
        END AS CLASSE_CONTRIB,
        
        ICF.CFOP, CF.DESCRCFO, ICF.CST, ICF.VLR_CFOP_CST AS VLRNOTA,
        
        -- E trazendo pro resultado final:
        ICF.BASEICMS,
        ICF.VLRICMS,
        ICF.BASESUBST,
        ICF.VLRSUBST
      FROM cab C
      JOIN itens_cfop_cst ICF ON ICF.NUNOTA = C.NUNOTA
      LEFT JOIN TGFPAR PAR ON PAR.CODPARC = C.CODPARC
      LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
      LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
      LEFT JOIN TGFNFE NFE ON NFE.NUNOTA = C.NUNOTA
      LEFT JOIN TGFCFO CF ON CF.CODCFO = ICF.CFOP
      WHERE (
        ('${pContrib}' = 'S' AND TO_CHAR(PAR.AD_TIPOCLIENTEFATURAR) IN ('1','4','5','6'))
        OR
        ('${pNContrib}' = 'S' AND TO_CHAR(PAR.AD_TIPOCLIENTEFATURAR) IN ('2','3','7'))
      )
      ${filtroCfop}
    )
    SELECT * FROM res 
    WHERE DTREF BETWEEN TO_DATE('${dtIni}', 'YYYY-MM-DD') AND TO_DATE('${dtFim}', 'YYYY-MM-DD')
    ORDER BY DTREF DESC, CFOP, CST
  `;

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql: sqlQuery }
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg = resp?.data?.statusMessage || JSON.stringify(resp?.data);
      throw new Error(`Falha ao buscar detalhes: ${msg}`);
    }

    const responseBody = resp.data.responseBody;
    if (!responseBody || !responseBody.fieldsMetadata || !responseBody.rows) {
      return [];
    }

    const fields = responseBody.fieldsMetadata.map((f: any) => f.name);
    return responseBody.rows.map((row: any[]) => {
      const obj: any = {};
      fields.forEach((field, index) => {
        obj[field] = row[index];
      });
      return obj;
    });
  }

  async getTotaisVendasMes(
    token: string,
    codEmp: number,
    dtIni: string,
    dtFim: string,
    cfops?: string[]
  ): Promise<Array<{ cst: string; totalLiquido: number; valorTributado: number; valorSt: number }>> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    let filtroCfop = '';
    if (cfops && cfops.length > 0 && !cfops.includes('0')) {
      const listaCfops = cfops.join(',');
      filtroCfop = `AND ITE.CODCFO IN (${listaCfops})`;
    }

    // Normaliza CST no SQL pra evitar duplicidade por espaços / NULL
    // (TRIM + NVL) e agrupa por essa expressão
    const sqlQuery = `
    SELECT
      NVL(TRIM(ITE.CSTICMS), 'Desconhecido') AS CST,
      SUM(NVL(ITE.VLRTOT, 0) - NVL(ITE.VLRDESC, 0)) AS TOTAL_LIQUIDO,
      SUM(NVL(ITE.BASEICMS, 0)) AS VALOR_TRIBUTADO,
      SUM(NVL(ITE.VLRICMS, 0)) AS VALOR_ST
    FROM TGFCAB CAB
    JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
    WHERE CAB.CODEMP = ${codEmp}
      AND CAB.TIPMOV IN ('V', '3', 'T')
      AND CAB.STATUSNFE = 'A'
      AND CAB.DTNEG BETWEEN TO_DATE('${dtIni}', 'YYYY-MM-DD') AND TO_DATE('${dtFim}', 'YYYY-MM-DD')
      ${filtroCfop}
    GROUP BY NVL(TRIM(ITE.CSTICMS), 'Desconhecido')
    ORDER BY NVL(TRIM(ITE.CSTICMS), 'Desconhecido')
  `;

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql: sqlQuery },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg = resp?.data?.statusMessage || JSON.stringify(resp?.data);
      throw new Error(`Falha ao buscar totais: ${msg}`);
    }

    const responseBody = resp.data.responseBody;
    if (!responseBody?.fieldsMetadata || !Array.isArray(responseBody.rows) || responseBody.rows.length === 0) {
      return [];
    }

    const fields: string[] = responseBody.fieldsMetadata.map((f: any) => f.name);

    // Mapeia linhas
    const linhas = responseBody.rows.map((row: any[]) => {
      const result: Record<string, any> = {};
      fields.forEach((field: string, index: number) => {
        result[field] = row[index];
      });

      return {
        cst: String(result.CST ?? 'Desconhecido').trim() || 'Desconhecido',
        totalLiquido: Number(result.TOTAL_LIQUIDO) || 0,
        valorTributado: Number(result.VALOR_TRIBUTADO) || 0,
        valorSt: Number(result.VALOR_ST) || 0,
      };
    });

    // Seguro extra: consolida no JS também (caso a API retorne algo estranho)
    const map = new Map<string, { cst: string; totalLiquido: number; valorTributado: number; valorSt: number }>();

    for (const it of linhas) {
      const key = it.cst;
      const atual = map.get(key);
      if (!atual) {
        map.set(key, { ...it });
      } else {
        atual.totalLiquido += it.totalLiquido;
        atual.valorTributado += it.valorTributado;
        atual.valorSt += it.valorSt;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.cst.localeCompare(b.cst));
  }

  async getLivroCfopAliquota(
    token: string,
    codEmp: number,
    dtIni: string,
    dtFim: string,
    tipo: number, // 1 = SAÍDA | 2 = ENTRADA
  ): Promise<any[]> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    if (![1, 2].includes(Number(tipo))) {
      throw new Error('Parâmetro tipo inválido. Use 1 para SAÍDA ou 2 para ENTRADA.');
    }

    // Usamos UNION ALL para não cruzar as tabelas e evitar a duplicação de valores (Produto Cartesiano)
    const sqlQuery = `
    SELECT
      DADOS.CFOP,
      DADOS.ALIQUOTA,
      SUM(DADOS.VALORCONTABIL) AS VALORCONTABIL,
      SUM(DADOS.BASEICMS) AS BASEICMS,
      SUM(DADOS.ICMS) AS ICMS,
      SUM(DADOS.BASEST) AS BASEST,
      SUM(DADOS.ICMSST) AS ICMSST,
      SUM(DADOS.OUTRAS) AS OUTRAS,
      SUM(DADOS.ISENTAS) AS ISENTAS
    FROM (
      -- BLOCO 1: DADOS TRIBUTADOS REAIS DO LIVRO FISCAL (SAÍDAS)
      SELECT
        LIV.CODCFO AS CFOP,
        LIV.ALIQICMS AS ALIQUOTA,
        LIV.VLRCTB AS VALORCONTABIL,
        LIV.BASEICMS AS BASEICMS,
        LIV.VLRICMS AS ICMS,
        0 AS BASEST,
        0 AS ICMSST,
        LIV.OUTRASICMS AS OUTRAS,
        LIV.ISENTASICMS AS ISENTAS
      FROM TGFLIV LIV
      INNER JOIN TGFCAB CAB ON LIV.NUNOTA = CAB.NUNOTA
      WHERE CAB.TIPMOV IN ('V','E')
        AND CAB.CODEMP = ${codEmp}
        AND CAB.DTNEG >= TO_DATE('${dtIni}', 'YYYY-MM-DD')
        AND CAB.DTNEG <= TO_DATE('${dtFim}', 'YYYY-MM-DD')
        AND 1 = ${tipo}
        AND CAB.NUNOTA IN (SELECT NUNOTA FROM TGFLIV WHERE DTDOC >= TO_DATE('${dtIni}', 'YYYY-MM-DD') AND DTDOC <= TO_DATE('${dtFim}', 'YYYY-MM-DD') AND CODEMP = ${codEmp})

      UNION ALL

      -- BLOCO 2: DADOS TRIBUTADOS REAIS DO LIVRO FISCAL (ENTRADAS)
      SELECT
        LIV.CODCFO AS CFOP,
        LIV.ALIQICMS AS ALIQUOTA,
        LIV.VLRCTB AS VALORCONTABIL,
        LIV.BASEICMS AS BASEICMS,
        LIV.VLRICMS AS ICMS,
        0 AS BASEST,
        0 AS ICMSST,
        LIV.OUTRASICMS AS OUTRAS,
        LIV.ISENTASICMS AS ISENTAS
      FROM TGFLIV LIV
      INNER JOIN TGFCAB CAB ON LIV.NUNOTA = CAB.NUNOTA
      WHERE CAB.TIPMOV IN ('C','D')
        AND CAB.CODEMP = ${codEmp}
        AND CAB.DTENTSAI >= TO_DATE('${dtIni}', 'YYYY-MM-DD')
        AND CAB.DTENTSAI <= TO_DATE('${dtFim}', 'YYYY-MM-DD')
        AND 2 = ${tipo}
        AND CAB.NUNOTA IN (SELECT NUNOTA FROM TGFLIV WHERE DHMOV >= TO_DATE('${dtIni}', 'YYYY-MM-DD') AND DHMOV <= TO_DATE('${dtFim}', 'YYYY-MM-DD') AND CODEMP = ${codEmp})

      UNION ALL

      -- BLOCO 3: DADOS DE ST PUXADOS DIRETAMENTE DOS ITENS (SAÍDAS)
      SELECT
        ITE.CODCFO AS CFOP,
        ITE.ALIQICMS AS ALIQUOTA,
        0 AS VALORCONTABIL,
        0 AS BASEICMS,
        0 AS ICMS,
        NVL(ITE.BASESUBSTIT, 0) AS BASEST,
        NVL(ITE.VLRSUBST, 0) AS ICMSST,
        0 AS OUTRAS,
        0 AS ISENTAS
      FROM TGFITE ITE
      INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
      WHERE CAB.TIPMOV IN ('V','E')
        AND CAB.CODEMP = ${codEmp}
        AND CAB.DTNEG >= TO_DATE('${dtIni}', 'YYYY-MM-DD')
        AND CAB.DTNEG <= TO_DATE('${dtFim}', 'YYYY-MM-DD')
        AND 1 = ${tipo}
        AND CAB.NUNOTA IN (SELECT NUNOTA FROM TGFLIV WHERE DTDOC >= TO_DATE('${dtIni}', 'YYYY-MM-DD') AND DTDOC <= TO_DATE('${dtFim}', 'YYYY-MM-DD') AND CODEMP = ${codEmp})

      UNION ALL

      -- BLOCO 4: DADOS DE ST PUXADOS DIRETAMENTE DOS ITENS (ENTRADAS)
      SELECT
        ITE.CODCFO AS CFOP,
        ITE.ALIQICMS AS ALIQUOTA,
        0 AS VALORCONTABIL,
        0 AS BASEICMS,
        0 AS ICMS,
        NVL(ITE.BASESUBSTIT, 0) AS BASEST,
        NVL(ITE.VLRSUBST, 0) AS ICMSST,
        0 AS OUTRAS,
        0 AS ISENTAS
      FROM TGFITE ITE
      INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
      WHERE CAB.TIPMOV IN ('C','D')
        AND CAB.CODEMP = ${codEmp}
        AND CAB.DTENTSAI >= TO_DATE('${dtIni}', 'YYYY-MM-DD')
        AND CAB.DTENTSAI <= TO_DATE('${dtFim}', 'YYYY-MM-DD')
        AND 2 = ${tipo}
        AND CAB.NUNOTA IN (SELECT NUNOTA FROM TGFLIV WHERE DHMOV >= TO_DATE('${dtIni}', 'YYYY-MM-DD') AND DHMOV <= TO_DATE('${dtFim}', 'YYYY-MM-DD') AND CODEMP = ${codEmp})

    ) DADOS
    GROUP BY DADOS.CFOP, DADOS.ALIQUOTA
    ORDER BY DADOS.CFOP, DADOS.ALIQUOTA
  `;

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: {
        sql: sqlQuery,
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg = resp?.data?.statusMessage || JSON.stringify(resp?.data);
      throw new Error(`Falha ao buscar livro CFOP/alíquota: ${msg}`);
    }

    const responseBody = resp.data.responseBody;
    if (!responseBody || !responseBody.fieldsMetadata || !responseBody.rows) {
      return [];
    }

    const fields = responseBody.fieldsMetadata.map((f: any) => f.name);

    return responseBody.rows.map((row: any[]) => {
      const obj: any = {};
      fields.forEach((field: string, index: number) => {
        obj[field] = row[index];
      });
      return obj;
    });
  }

  async obterConferenciaAgrupada(token: string, filtros: DashboardFiltrosDto): Promise<any[]> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';


    // Montagem dinâmica dos filtros
    const filtroEmpresa = filtros.P_CODEMP ? `AND CAB.CODEMP = ${filtros.P_CODEMP}` : '';
    const filtroCfop = filtros.P_CODCFO ? `AND ITE.CODCFO = ${filtros.P_CODCFO}` : '';

    const sqlQuery = `
      SELECT R.CODCFO, COUNT(1) QTDREGISTROS, SUM(R.VLRTOT) VLRTOT, SUM(R.VLRICMS) VLRICMS
      FROM (
        SELECT ITE.CODCFO, ITE.VLRTOT,
        COALESCE((SELECT SUM(DIN.VALOR) FROM TGFDIN DIN WHERE DIN.NUNOTA = ITE.NUNOTA AND DIN.SEQUENCIA = ITE.SEQUENCIA AND DIN.CODIMP = 1 AND DIN.SEQUENCIA > 0),0) VLRICMS
        FROM TGFITE ITE 
        INNER JOIN TGFCAB CAB ON(CAB.NUNOTA = ITE.NUNOTA) 
        INNER JOIN TGFPRO PRO ON(PRO.CODPROD = ITE.CODPROD) 
        INNER JOIN TSIEMP EMP ON(EMP.CODEMP = ITE.CODEMP) 
        INNER JOIN TGFPAR PAR ON(PAR.CODPARC = CAB.CODPARC) 
        WHERE 
          ((CASE '${filtros.P_TIPDATA}' WHEN '1' THEN CAB.DTNEG WHEN '2' THEN CAB.DTMOV WHEN '3' THEN CAB.DTENTSAI WHEN '4' THEN CAB.DTFATUR END) 
          BETWEEN TO_DATE('${filtros.P_PERIODO_INI}', 'YYYY-MM-DD') AND TO_DATE('${filtros.P_PERIODO_FIN}', 'YYYY-MM-DD'))
          ${filtroEmpresa}
          ${filtroCfop}
      ) R
      GROUP BY R.CODCFO 
      ORDER BY 1
    `;

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql: sqlQuery }
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg = resp?.data?.statusMessage || JSON.stringify(resp?.data);
      throw new Error(`Falha ao buscar dados agrupados: ${msg}`);
    }

    return this.mapearRespostaSankhya(resp.data.responseBody);
  }

  // 2. Método para o Grid Analítico (Detalhes do CFOP)
  async obterListagemAnalitica(token: string, filtros: DashboardFiltrosDto, cfop: number): Promise<any[]> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';


    const filtroEmpresa = filtros.P_CODEMP ? `AND CAB.CODEMP = ${filtros.P_CODEMP}` : '';

    const sqlQuery = `
      SELECT 
        ITE.NUNOTA, CAB.DTNEG, CAB.DTENTSAI, ITE.CODPROD, 
        (SELECT PROD.DESCRPROD FROM TGFPRO PROD WHERE PROD.CODPROD = ITE.CODPROD) DESCRPROD, 
        ITE.CODCFO, ITE.VLRTOT, CAB.CODPARC, PAR.RAZAOSOCIAL
      FROM TGFITE ITE 
      INNER JOIN TGFCAB CAB ON(CAB.NUNOTA = ITE.NUNOTA) 
      INNER JOIN TGFPRO PRO ON(PRO.CODPROD = ITE.CODPROD) 
      INNER JOIN TSIEMP EMP ON(EMP.CODEMP = ITE.CODEMP) 
      INNER JOIN TGFPAR PAR ON(PAR.CODPARC = CAB.CODPARC) 
      WHERE 
        ((CASE '${filtros.P_TIPDATA}' WHEN '1' THEN CAB.DTNEG WHEN '2' THEN CAB.DTMOV WHEN '3' THEN CAB.DTENTSAI WHEN '4' THEN CAB.DTFATUR END) 
        BETWEEN TO_DATE('${filtros.P_PERIODO_INI}', 'YYYY-MM-DD') AND TO_DATE('${filtros.P_PERIODO_FIN}', 'YYYY-MM-DD'))
        AND ITE.CODCFO = ${cfop}
        ${filtroEmpresa}
    `;

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql: sqlQuery }
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg = resp?.data?.statusMessage || JSON.stringify(resp?.data);
      throw new Error(`Falha ao buscar detalhes analíticos: ${msg}`);
    }

    return this.mapearRespostaSankhya(resp.data.responseBody);
  }

  // Helper para reaproveitar a lógica de mapeamento de fieldsMetadata e rows
  private mapearRespostaSankhya(responseBody: any): any[] {
    if (!responseBody || !responseBody.fieldsMetadata || !responseBody.rows) {
      return [];
    }

    const fields = responseBody.fieldsMetadata.map((f: any) => f.name);
    return responseBody.rows.map((row: any[]) => {
      const obj: any = {};
      fields.forEach((field, index) => {
        obj[field] = row[index];
      });
      return obj;
    });
  }

  async separadoLoc2(nunota: number, authToken: string) {
    console.log("Nunota" + nunota)
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'CabecalhoNota', // TGFITE
        standAlone: false,
        fields: ['NUNOTA', 'AD_SEPARACAOLOC2'],
        records: [
          {
            // ✅ PK correta do ItemNota (TGFITE)
            pk: { NUNOTA: nunota },
            // ✅ atualização direta pelo nome do campo (mais seguro que índice)
            values: { 1: "S" },
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }


  async getNotasPendentesFaturamento(token: string): Promise<any[]> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // A Query SQL baseada no seu Gadget original
    const sqlQuery = `
      SELECT
          CAB.NUNOTA
        , CAB.NUMNOTA
        , TRUNC(CAB.DTNEG) AS DTNEG
        , CAB.DTFATUR
        , CAB.CODEMP
        , CAB.CODPARC
        , PAR.RAZAOSOCIAL
        , CAB.CODTIPOPER
        , NVL(CAB.VLRNOTA, 0) AS VLRNOTA
      FROM TGFCAB CAB
      INNER JOIN TGFPAR PAR
              ON PAR.CODPARC = CAB.CODPARC
      LEFT JOIN TGFNTA TAB
             ON TAB.CODTAB = PAR.CODTAB
      WHERE CAB.CODTIPOPER IN (100, 91)
        AND CAB.DTFATUR < TRUNC(SYSDATE)
        AND CAB.PENDENTE = 'S'
      ORDER BY
          CAB.DTFATUR DESC
        , CAB.NUMNOTA DESC
    `;

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: {
        sql: sqlQuery,
      },
    };

    // Fazendo a requisição para a API do Sankhya
    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    // Tratamento de erro nativo do retorno da API do Sankhya (status '1' = Sucesso)
    if (resp?.data?.status !== '1') {
      const msg = resp?.data?.statusMessage || JSON.stringify(resp?.data);
      throw new Error(`Falha ao buscar notas pendentes de faturamento: ${msg}`);
    }

    const responseBody = resp.data.responseBody;

    // Se a query não retornar nada, devolvemos um array vazio preventivamente
    if (!responseBody || !responseBody.fieldsMetadata || !responseBody.rows) {
      return [];
    }

    // Mapeia os nomes das colunas (NUNOTA, NUMNOTA, DTNEG, etc.)
    const fields = responseBody.fieldsMetadata.map((f: any) => f.name);

    // Monta o array de objetos final, combinando as colunas (fields) com os valores (rows)
    return responseBody.rows.map((row: any[]) => {
      const obj: any = {};
      fields.forEach((field: string, index: number) => {
        obj[field] = row[index];
      });
      return obj;
    });
  }



  private async executeSaveRecord(authToken: string, ncm: string, mvaOrig: number, mva4: number, mva7: number, mva12: number) {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json';

    const localFields: any = {
      NCM: { "$": ncm },
      MVAPADRAO: { "$": String(mvaOrig) },
      MVA4: { "$": String(mva4) },
      MVVA7: { "$": String(mva7) },
      MVVA12: { "$": String(mva12) },
    };

    let dataRow: any = { localFields };

    const body = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        dataSet: {
          rootEntity: 'AD_TABNCM',
          includePresentationFields: 'N',
          dataRow: dataRow,
          entity: {
            fieldset: {
              list: 'NCM,MVAPADRAO,MVA4,MVVA7,MVVA12'
            }
          }
        }
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      appkey: this.appKey,
    };

    try {
      const response = await firstValueFrom(this.http.post(url, body, { headers }));

      if (response.data?.status !== '1') {
        const msg = response.data?.statusMessage || JSON.stringify(response.data);

        // Se a entidade gritar que a chave já existe, repete enviando como UPDATE explícito (dataRow.key)
        if (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('cadastra') || msg.toLowerCase().includes('unique')) {
          dataRow.key = { NCM: { "$": ncm } };
          const retryResp = await firstValueFrom(this.http.post(url, body, { headers }));
          if (retryResp.data?.status !== '1') {
            throw new Error(retryResp.data?.statusMessage || JSON.stringify(retryResp.data));
          }
          return;
        }

        throw new Error(msg);
      }
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  }

  async uploadNcmCsv(buffer: Buffer, token: string): Promise<any> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(sheet, { raw: false });

    let successCount = 0;
    const errors: any[] = [];
    const validRows: any[] = [];

    for (const row of data) {
      const rawNcm = row['NCM'];
      const rawMvaOrig = row['MVA_Orig'];
      const rawMva4 = row['MVA_Aliq4pct'];
      const rawMva7 = row['MVVA_Aliq7pct'] ?? row['MVA_Aliq7pct'];
      const rawMva12 = row['MVVA_Aliq12pct'] ?? row['MVA_Aliq12pct'];

      if (
        rawNcm == null || String(rawNcm).trim() === '' ||
        rawMvaOrig == null || String(rawMvaOrig).trim() === '' ||
        rawMva4 == null || String(rawMva4).trim() === '' ||
        rawMva7 == null || String(rawMva7).trim() === '' ||
        rawMva12 == null || String(rawMva12).trim() === ''
      ) {
        continue;
      }

      const formatVal = (v: any) => {
        const str = String(v).replace(',', '.');
        const n = parseFloat(str);
        return isNaN(n) ? 0 : n;
      };

      validRows.push({
        ncm: String(rawNcm).trim(),
        mvaOrig: formatVal(rawMvaOrig),
        mva4: formatVal(rawMva4),
        mva7: formatVal(rawMva7),
        mva12: formatVal(rawMva12)
      });
    }

    // Processamento SEQUENCIAL estrito para evitar a trava de SESSÃO CONCORRENTE nativa do Sankhya e o ERRO HTTP 429 (Too Many Requests).
    console.log(`[CSV NCM] Iniciando carga de ${validRows.length} NCMs (Sequencial)...`);

    // 1. Salvar no banco de dados local da aplicação (Prisma)
    try {
      const prismaData = validRows.map(r => ({
        ncm: r.ncm,
        mva4: String(r.mva4),
        mva7: String(r.mva7),
        mva12: String(r.mva12)
      }));
      await this.prisma.upsertManyNCM(prismaData);
      console.log(`[CSV NCM] Todos os ${validRows.length} NCMs salvos localmente via Prisma com sucesso!`);
      successCount = validRows.length;
    } catch (e: any) {
      console.error(`[CSV NCM] Erro ao salvar NCMs no Prisma:`, e.message);
      errors.push({ ncm: 'ALL', error: e.message });
    }

    return { ok: true, processed: successCount, errors };
  }

  async getAllNcmLocais() {
    return this.prisma.getAllNcm();
  }

  async searchProdutosCrm(search: string, token: string) {
    const cleanSearch = search.trim().toUpperCase();
    const isNumeric = /^\d+$/.test(cleanSearch);

    const whereClause = isNumeric
      ? `P.CODPROD = ${cleanSearch}`
      : `UPPER(P.DESCRPROD) LIKE '%${cleanSearch}%'`;

    const sql = `
      SELECT * FROM (
        SELECT 
          P.CODPROD, 
          P.DESCRPROD, 
          P.MARCA, 
          P.CODGRUPOPROD, 
          P.ATIVO,
          COALESCE((SELECT SUM(ESTOQUE) FROM TGFEST E WHERE E.CODPROD = P.CODPROD AND E.CODLOCAL = 1100), 0) AS ESTOQUE,
          COALESCE((SELECT MAX(VLRVENDA) FROM TGFEXC X WHERE X.CODPROD = P.CODPROD AND X.VLRVENDA > 0 AND X.NUTAB = 0), 0) AS PRECOVENDA
        FROM TGFPRO P
        WHERE (${whereClause}) AND P.ATIVO = 'S'
        ORDER BY P.DESCRPROD
      ) WHERE ROWNUM <= 50
    `;

    console.log(`[Sankhya Search] Executando busca para: ${cleanSearch}`);

    const url = `${process.env.SANKHYA_API_URL || 'https://api.sankhya.com.br'}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      appkey: this.appKey,
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql }
      }, { headers }));

      const data = resp?.data;
      if (data?.status !== '1') {
        const msg = data?.statusMessage || 'Erro na consulta SQL Sankhya';
        console.error(`[Sankhya Search] Erro retornado pelo Sankhya: ${msg}`);
        throw new HttpException(msg, HttpStatus.BAD_REQUEST);
      }

      const rows = data?.responseBody?.rows || [];
      const fields = data?.responseBody?.fieldsMetadata || [];

      console.log(`[Sankhya Search] Sucesso. Itens encontrados: ${rows.length}`);

      return rows.map(row => {
        const obj: any = {};
        fields.forEach((field, index) => {
          const val = row[index];
          obj[field.name] = field.name === 'CODPROD' ? String(val) : val;
        });
        return obj;
      });
    } catch (e: any) {
      console.error(`[Sankhya Search] Falha na requisição: ${e.message}`);
      throw e;
    }
  }

  async getAllProdutosCrmSync(token: string) {
    const sql = `SELECT 
      P.CODPROD, 
      P.DESCRPROD, 
      P.CODGRUPOPROD, 
      P.MARCA, 
      P.ATIVO,
      COALESCE((SELECT SUM(ESTOQUE) FROM TGFEST E WHERE E.CODPROD = P.CODPROD AND E.CODLOCAL = 1100), 0) AS ESTOQUE,
      COALESCE((SELECT MAX(VLRVENDA) FROM TGFEXC X WHERE X.CODPROD = P.CODPROD AND X.VLRVENDA > 0), 0) AS PRECO
    FROM TGFPRO P`;
    const data = await this.executeQuery(token, sql);
    return this.normalizeRows(data);
  }

  async getAllParceirosCrmSync(token: string) {
    const sql = `SELECT CODPARC, NOMEPARC, EMAIL, TELEFONE, CGC_CPF FROM TGFPAR`;
    const data = await this.executeQuery(token, sql);
    return this.normalizeRows(data);
  }
}





