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

const onlyDigits = (v: any) => String(v ?? '').replace(/\D/g, '');



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
  private readonly loginUrl = 'https://api.sankhya.com.br/login';
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
        this.http.post(
          url,
          {}, // <- não use null
          {
            headers: {
              'Content-Type': 'application/json', // <- força json
              token: process.env.SANKHYA_TOKEN!,
              appkey: process.env.SANKHYA_APPKEY!,
              username: process.env.SANKHYA_USERNAME!,
              password: process.env.SANKHYA_PASSWORD!,
            },
            timeout: 15000,
          },
        ),
      );

      const bearerToken = resp.data?.bearerToken;
      if (!bearerToken) throw new Error('bearerToken não retornado no login.');
      return bearerToken;
    } catch (e: any) {
      // log útil (sem vazar segredo)
      const status = e.response?.status;
      const data = e.response?.data;
      console.error('Login Sankhya falhou:', { status, data });
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
                list: 'CODPROD,DESCRPROD,MARCA,CARACTERISTICAS,CODVOL,CODGRUPOPROD,LOCALIZACAO',
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
                list: 'CODPROD,DESCRPROD,MARCA,CARACTERISTICAS,CODVOL,CODGRUPOPROD,LOCALIZACAO,REFERENCIA,AD_LOCALIZACAO,AD_QTDMAX,ATIVO',
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


 async incluirAjustesPositivo(itens: AjusteItem[], authToken: string): Promise<IncluirAjustesResult> {
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
          OBSERVACAO: { $: 'Ajuste realizado por API' },
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

    // DbExplorer costuma retornar em resp.data.responseBody.rows / ou algo parecido dependendo do tenant
    return resp?.data;
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
  async incluirAjustesNegativo(itens: AjusteItem[], authToken: string) {
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
            OBSERVACAO: { $: 'Ajuste realizado por API p/ Ajuste de inventário' },
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

  async getNota(token: string) { // inverter o ad_infidelimax = 'S' dentro do where para 'is null'
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
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'N',
          metadata: 'S',
          tryJoinedFields: 'false',
          offsetPage: '0',
          criteria: {
            expression: {
              $: `
                this.CODTIPOPER IN (700,701,326)
                AND this.CODPARC <> 111111
                AND this.CODEMP = 1
                AND (this.AD_INFIDELIMAX IS NULL OR this.AD_INFIDELIMAX != 'S')
                AND this.STATUSNFE = ?
                AND this.DTFATUR IS NOT NULL
                AND this.DTFATUR >= TO_DATE('01/11/2025','DD/MM/YYYY')
                AND this.DTFATUR <= (SYSDATE - 1)
                `.replace(/\s+/g, ' ').trim(),
            },
            parameter: [
              { $: 'A', type: 'S' },   // STATUSNFE
            ],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'NUNOTA,CODTIPOPER,DTNEG,CODPARC,STATUSNFE,VLRNOTA,CODVEND,CODVENDTEC,AD_INFIDELIMAX',
              },
            },
            {
              // JOIN no Vendedor via CODVEND
              path: 'Vendedor',
              fieldset: {
                // traga ao menos AD_TIPOTECNICO; pode adicionar outros (APELIDO, etc.)
                list: 'AD_TIPOTECNICO',
              },
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

    // trata {} como null e extrai $ quando existir
    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };
    const toNumOrNull = (v: any) => (v === null || v === '' ? null : Number(v));

    // nomes dos campos na ordem de f0..fN
    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    // converte {f0..fN} -> {NOME_CAMPO: valor}
    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };


    const rowsNamed = rawRows.map(rowToNamed);

    // mapeia para o formato final (com AD_TIPOTECNICO do vendedor)
    const parsed = rowsNamed.map(r => ({
      NUNOTA: toNumOrNull(r.NUNOTA) ?? 0,
      CODTIPOPER: toNumOrNull(r.CODTIPOPER) ?? 0,
      DTNEG: r.DTNEG ?? null,
      CODPARC: toNumOrNull(r.CODPARC) ?? 0,
      STATUSNFE: r.STATUSNFE ?? null,
      VLRNOTA: toNumOrNull(r.VLRNOTA) ?? 0,
      CODVEND: toNumOrNull(r.CODVEND),
      CODVENDTEC: toNumOrNull(r.CODVENDTEC),

      // campo trazido pelo join em Vendedor:
      VENDEDOR_AD_TIPOTECNICO: toNumOrNull(r['Vendedor_AD_TIPOTECNICO']),
    }));

    return parsed;
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


  async getNotaDevol(token: string) { // inverter o ad_infidelimax = 'S' dentro do where para 'is null'
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
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'N',
          metadata: 'S',
          tryJoinedFields: 'false',
          offsetPage: '0',
          criteria: {
            expression: {
              $: `
              this.CODTIPOPER IN (800,801)
              AND this.CODPARC <> 111111
              AND this.CODEMP = 1
              AND (this.AD_INFIDELIMAX IS NULL OR this.AD_INFIDELIMAX != 'S')
              AND this.STATUSNFE = ?
              AND this.DTFATUR IS NOT NULL
              AND this.DTFATUR >= TO_DATE('01/11/2025','DD/MM/YYYY')
              AND this.DTFATUR <= (SYSDATE - 1)
            `.replace(/\s+/g, ' ').trim(),
            },
            parameter: [
              { $: 'A', type: 'S' },
            ],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'NUNOTA,CODTIPOPER,DTNEG,CODPARC,STATUSNFE,VLRNOTA,CODVEND,CODVENDTEC,AD_INFIDELIMAX',
              },
            },
            {
              // JOIN no Vendedor via CODVEND
              path: 'Vendedor',
              fieldset: {
                // traga ao menos AD_TIPOTECNICO; pode adicionar outros (APELIDO, etc.)
                list: 'AD_TIPOTECNICO',
              },
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

    // trata {} como null e extrai $ quando existir
    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };
    const toNumOrNull = (v: any) => (v === null || v === '' ? null : Number(v));

    // nomes dos campos na ordem de f0..fN
    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    // converte {f0..fN} -> {NOME_CAMPO: valor}
    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };

    const rowsNamed = rawRows.map(rowToNamed);

    // mapeia para o formato final (com AD_TIPOTECNICO do vendedor)
    const parsed = rowsNamed.map(r => ({
      NUNOTA: toNumOrNull(r.NUNOTA) ?? 0,
      CODTIPOPER: toNumOrNull(r.CODTIPOPER) ?? 0,
      DTNEG: r.DTNEG ?? null,
      CODPARC: toNumOrNull(r.CODPARC) ?? 0,
      STATUSNFE: r.STATUSNFE ?? null,
      VLRNOTA: toNumOrNull(r.VLRNOTA) ?? 0,
      CODVEND: toNumOrNull(r.CODVEND),
      CODVENDTEC: toNumOrNull(r.CODVENDTEC),

      // campo trazido pelo join em Vendedor:
      VENDEDOR_AD_TIPOTECNICO: toNumOrNull(r['Vendedor_AD_TIPOTECNICO']),
    }));

    return parsed;
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

  async incluirNotaInfiniti(produto: string, qtdNeg: string, codParc: string, authToken: string) {
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
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data; // traz status, statusMessage, transactionId
  }


  async confirmarNota(nunota: number, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.confirmarNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'CACSP.confirmarNota',
      requestBody: {
        nota: {
          NUNOTA: { $: nunota },              // número, não string
          confirmacaoCentralNota: true,
          ehPedidoWeb: false,
          atualizaPrecoItemPedCompra: false
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    console.log('Nota confirmada: ', nunota)
    return resp.data; // status, statusMessage, transactionId...
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


  async emSeparacao(nunota:number, dtneg: string, hrneg: string, authToken: string){
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
        fields: ['NUNOTA', 'AD_EMSEPARACAO','DTNEG', 'HRNEG'],
        records: [
          {
            // normalmente CODBARRA é a PK
            pk: { NUNOTA: nunota },
            // valores na mesma ordem de "fields"
            values: {
              1: 'S',
              2: dtneg,
              3: hrneg,
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

  async deseparacao(nunota:number, authToken: string){
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
    params: {
      groupId?: number;
      manufacturerId?: number;
      search?: string;
      limit: number;
      offset: number;
    },
    token: string
  ): Promise<{ items: any[]; total: number }> {

    const { groupId, manufacturerId, search, limit, offset } = params;

    // ---------- Monta criteria (expression + parameters) ----------
    const exprParts: string[] = [];
    const parameter: { $: string; type: string }[] = [];

    // Grupo
    if (Number.isFinite(groupId)) {
      exprParts.push('this.CODGRUPOPROD = ?');
      parameter.push({ $: String(groupId), type: 'I' });
    }

    // Fabricante
    if (Number.isFinite(manufacturerId)) {
      exprParts.push('this.CODFAB = ?');
      parameter.push({ $: String(manufacturerId), type: 'I' });
    }

    // Search: tenta interpretar como número (CODPROD) ou código de barras (EAN),
    // senão faz LIKE na descrição
    const s = (search ?? '').trim();
    if (s) {
      const onlyDigits = /^[0-9]+$/.test(s);

      if (onlyDigits) {
        // Se for número, prioriza CODPROD = ?
        // (se quiser também procurar por EAN em paralelo, dá pra usar OR)
        exprParts.push('(this.CODPROD = ? OR this.CODBARRA = ? OR this.DESCRPROD LIKE ?)');
        parameter.push({ $: s, type: 'I' });     // CODPROD
        parameter.push({ $: s, type: 'S' });     // CODBARRA
        parameter.push({ $: `%${s}%`, type: 'S' }); // DESCRPROD LIKE
      } else {
        exprParts.push('this.DESCRPROD LIKE ?');
        parameter.push({ $: `%${s}%`, type: 'S' });
      }
    }

    // Se não tiver filtro nenhum, você pode:
    // 1) bloquear (recomendado pra não puxar o mundo)
    // 2) permitir com limite baixo
    // Aqui vou permitir, mas com limite capado por segurança:
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const expression = exprParts.length > 0 ? exprParts.join(' AND ') : '1=1';

    // ---------- 1) Chamada paginada (items) ----------
    const payloadItems = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Produto',
          includePresentationFields: 'N',
          tryJoinedFields: 'true',
          offsetPage: String(safeOffset),
          // Alguns ambientes aceitam "limit" / "pageSize".
          // Se no seu Sankhya não aceitar, eu te ajusto conforme o retorno/versão.
          // Vou enviar "limit" porque é o mais comum.
          limit: String(safeLimit),

          criteria: {
            expression: { $: expression },
            ...(parameter.length ? { parameter } : {}),
          },

          entity: [
            {
              path: '',
              fieldset: {
                // Campos principais (ajuste se quiser mais)
                list: 'CODPROD,DESCRPROD,CODBARRA,CODGRUPOPROD,CODFAB,ATIVO',
              },
            },
          ],
        },
      },
    };

    const dataItems = await this.callSankhya(payloadItems, token);

    const entitiesItems = dataItems?.responseBody?.entities?.entity;
    const listItems: any[] = Array.isArray(entitiesItems)
      ? entitiesItems
      : entitiesItems
        ? [entitiesItems]
        : [];

    const items = listItems.map((e) => ({
      codprod: Number(e.f0?.$ ?? e.f0 ?? 0),
      descrprod: e.f1?.$ ?? e.f1 ?? null,
      codbarras: e.f2?.$ ?? e.f2 ?? null,
      codgrupo: Number(e.f3?.$ ?? e.f3 ?? 0) || null,
      codfab: Number(e.f4?.$ ?? e.f4 ?? 0) || null,
      ativo: (() => {
        const v = e.f5?.$ ?? e.f5 ?? null;
        // depende do seu dicionário (S/N, 1/0, true/false)
        if (v == null) return null;
        if (typeof v === 'string') return v === 'S' || v === '1' || v.toUpperCase() === 'TRUE';
        if (typeof v === 'number') return v === 1;
        return Boolean(v);
      })(),
    }));

    // ---------- 2) Total (segunda chamada, sem paginação) ----------
    // Estratégia: pedir somente CODPROD e contar.
    // Se isso ficar pesado, a gente troca por um endpoint/consulta mais eficiente.
    const payloadTotal = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Produto',
          includePresentationFields: 'N',
          tryJoinedFields: 'true',
          offsetPage: '0',
          // tenta elevar o limite para pegar tudo (capado)
          // Se você tiver muitos produtos, depois a gente muda a estratégia do total.
          limit: '10000',

          criteria: {
            expression: { $: expression },
            ...(parameter.length ? { parameter } : {}),
          },

          entity: [
            {
              path: '',
              fieldset: { list: 'CODPROD' },
            },
          ],
        },
      },
    };

    const dataTotal = await this.callSankhya(payloadTotal, token);
    const entitiesTotal = dataTotal?.responseBody?.entities?.entity;
    const listTotal: any[] = Array.isArray(entitiesTotal)
      ? entitiesTotal
      : entitiesTotal
        ? [entitiesTotal]
        : [];

    const total = listTotal.length;

    return { items, total };
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

  //lista todas as notas de conferencia 601 não faturadas | Metodo utilizado para exibir na TV da separação
  async listarNotasTV(authToken: string): Promise<NotaConferenciaRow[]> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };


    const sql = `
WITH BASE AS ( 
  SELECT
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODTIPOPER,
    TOP.DESCROPER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL AS PARCEIRO,
    CAB.VLRNOTA,

    TRUNC(CAB.DTALTER) AS DTALTER,
    TO_CHAR(CAB.DTALTER, 'HH24:MI:SS') AS HRALTER,

    CAB.CODVEND,
    VEN.APELIDO AS VENDEDOR,

    CAB.AD_TIPODEENTREGA AS AD_TIPODEENTREGA,
    CAB.AD_EMSEPARACAO   AS AD_EMSEPARACAO,

    CAB.CODPROJ AS CODPROJ,
    PRJ.IDENTIFICACAO AS IDENTIFICACAO,  -- << AQUI

    CASE CAB.AD_TIPODEENTREGA
      WHEN 'EI' THEN 'Em Loja'
      WHEN 'RL' THEN 'Vem Pegar'
      WHEN 'EC' THEN 'Entregar'
      ELSE 'Não informado'
    END AS TIPO_ENTREGA,

    CAB.STATUSNOTA AS STATUS_NOTA,
    CASE CAB.STATUSNOTA
      WHEN 'A' THEN 'Atendimento'
      WHEN 'L' THEN 'Liberada'
      WHEN 'P' THEN 'Pendente'
      ELSE 'N/I'
    END AS STATUS_NOTA_DESC,

    CAB.LIBCONF AS LIBCONF,
    MAX(CON.STATUS) AS STATUS_CONFERENCIA_COD,

    COALESCE(
      MAX(
        CASE CON.STATUS
          WHEN 'A'  THEN 'Em andamento'
          WHEN 'AC' THEN 'Aguardando conferência'
          WHEN 'AL' THEN 'Aguardando liberação p/ conferência'
          WHEN 'C'  THEN 'Aguardando liberação de corte'
          WHEN 'D'  THEN 'Finalizada divergente'
          WHEN 'Z'  THEN 'Aguardando finalização'
          WHEN 'R'  THEN 'Aguardando recontagem'
          WHEN 'RA' THEN 'Recontagem em andamento'
          WHEN 'RD' THEN 'Recontagem finalizada divergente'
          WHEN 'RF' THEN 'Recontagem finalizada OK'
          WHEN 'F'  THEN 'Finalizada OK'
          ELSE NULL
        END
      ),
      CASE
        WHEN CAB.AD_EMSEPARACAO = 'S' THEN 'Em separação'
        ELSE NULL
      END
    ) AS STATUS_CONFERENCIA_DESC,

    COUNT(CON.STATUS) AS QTD_REG_CONFERENCIA
  FROM TGFCAB CAB
  INNER JOIN TGFTOP TOP
    ON TOP.CODTIPOPER = CAB.CODTIPOPER
   AND TOP.DHALTER   = CAB.DHTIPOPER
  LEFT JOIN TGFPAR PAR
    ON PAR.CODPARC = CAB.CODPARC
  LEFT JOIN TGFVEN VEN
    ON VEN.CODVEND = CAB.CODVEND
  LEFT JOIN TGFCON2 CON
    ON CON.NUNOTAORIG = CAB.NUNOTA

  LEFT JOIN TCSPRJ PRJ              -- << AQUI
    ON PRJ.CODPROJ = CAB.CODPROJ    -- << AQUI

  
  WHERE (
          (CAB.CODTIPOPER IN (601,326) AND CAB.CODTIPVENDA not IN (238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160) and (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S'))
		    OR (CAB.CODTIPOPER IN (601,326) AND CAB.CODTIPVENDA IN (238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160))
          OR CAB.CODTIPOPER = 322
        )
    AND CAB.PENDENTE = 'S'
    AND CAB.CODEMP = 1
    AND CAB.STATUSNOTA IN ('L')
  GROUP BY
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODTIPOPER,
    TOP.DESCROPER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL,
    CAB.VLRNOTA,
    CAB.DTALTER,
    CAB.CODVEND,
    VEN.APELIDO,
    CAB.AD_TIPODEENTREGA,
    CAB.AD_EMSEPARACAO,
    CAB.CODPROJ,           -- << AQUI
    PRJ.IDENTIFICACAO,     -- << AQUI
    CAB.STATUSNOTA,
    CAB.LIBCONF
)
SELECT
  CASE
    WHEN CODTIPOPER = 322 THEN '#1976D2'
    WHEN AD_TIPODEENTREGA = 'EI' THEN '#2E7D32'
    WHEN AD_TIPODEENTREGA = 'RL' THEN '#F9A825'
    WHEN AD_TIPODEENTREGA = 'EC' THEN '#C62828'
    ELSE '#9E9E9E'
  END AS BKCOLOR,
  CASE
    WHEN CODTIPOPER = 322 THEN '#FFFFFF'
    WHEN AD_TIPODEENTREGA = 'RL' THEN '#000000'
    ELSE '#FFFFFF'
  END AS FGCOLOR,
  CASE AD_TIPODEENTREGA
    WHEN 'EI' THEN 1
    WHEN 'RL' THEN 2
    WHEN 'EC' THEN 3
    ELSE 9
  END AS ORDEM_TIPO_PRI,
  ROW_NUMBER() OVER (
    PARTITION BY AD_TIPODEENTREGA
    ORDER BY DTALTER DESC, NUNOTA DESC
  ) AS ORDEM_TIPO,
  ROW_NUMBER() OVER (
    ORDER BY
      CASE AD_TIPODEENTREGA
        WHEN 'EI' THEN 1
        WHEN 'RL' THEN 2
        WHEN 'EC' THEN 3
        ELSE 9
      END,
      DTALTER DESC,
      NUNOTA DESC
  ) AS ORDEM_GERAL,
  NUNOTA,
  NUMNOTA,
  CODTIPOPER,
  DESCROPER,
  DTALTER,
  HRALTER,
  CODPARC,
  PARCEIRO,
  VLRNOTA,
  CODVEND,
  VENDEDOR,
  AD_TIPODEENTREGA,
  TIPO_ENTREGA,
  STATUS_NOTA,
  STATUS_NOTA_DESC,
  LIBCONF,
  STATUS_CONFERENCIA_COD,
  STATUS_CONFERENCIA_DESC,
  QTD_REG_CONFERENCIA,
  AD_EMSEPARACAO,
  CODPROJ,
  IDENTIFICACAO
FROM BASE
ORDER BY
  ORDEM_TIPO_PRI,
  DTALTER DESC,
  NUNOTA DESC
  `.trim();

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql },
    };

    try {
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

      // DbExplorer normalmente retorna linhas como array de colunas (por posição)
      // Mapeando exatamente na ordem do SELECT acima:
      const mapped: NotaConferenciaRow[] = (rows ?? []).map((r: any[]) => ({
        ordemLinha: Number(r?.[4] ?? 0),
        bkcolor: String(r?.[0] ?? ''),
        fgcolor: String(r?.[1] ?? ''),

        nunota: Number(r?.[5] ?? 0),
        numnota: Number(r?.[6] ?? 0),
        codtipoper: Number(r?.[7] ?? 0),
        descroper: String(r?.[8] ?? ''),

        dtneg: String((r?.[9] ?? '') + " " + (r?.[11] ?? '')),
        hrneg: String(r?.[10] ?? ''),
        codparc: Number(r?.[11] ?? 0),
        parceiro: String(r?.[12] ?? ''),
        vlrnota: Number(r?.[13] ?? 0),

        codvend: Number(r?.[14] ?? 0),
        vendedor: String(r?.[15] ?? ''),

        adTipoDeEntrega: r?.[16] != null ? String(r?.[16]) : null,
        tipoEntrega: String(r?.[17] ?? ''),

        statusNota: String(r?.[18] ?? ''),
        statusNotaDesc: String(r?.[19] ?? ''),
        adSeparacao: String(r?.[24] ?? ''),

        libconf: r?.[20] != null ? String(r?.[20]) : null,

        statusConferenciaCod: r?.[21] != null ? String(r?.[21]) : null,
        statusConferenciaDesc: r?.[22] != null ? String(r?.[22]) : null,

        qtdRegConferencia: Number(r?.[23] ?? 0),
        codProj: Number(r?.[25] ?? 0),
        descProj: r?.[26] != null ? String(r?.[26]) : null,
      }));

      return mapped;
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

  //#region Listar cabos e imprimir etiquetas

  async listarFilaCabos(authToken: string): Promise<FilaCabosRow[]> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const sql = `
SELECT
  /* CORES */
  CASE
    WHEN CAB.CODTIPOPER = 322 THEN '#1565C0'
    WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN '#2E7D32'
    WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN '#F9A825'
    WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN '#C62828'
    ELSE '#9E9E9E'
  END AS BKCOLOR,

  CASE
    WHEN CAB.CODTIPOPER = 322 THEN '#FFFFFF'
    WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN '#000000'
    ELSE '#FFFFFF'
  END AS FGCOLOR,

  /* PRIORIDADE */
  CASE
    WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN 1
    WHEN CAB.CODTIPOPER = 322 THEN 2
    WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN 3
    WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN 4
    ELSE 9
  END AS ORDEM_TIPO_PRI,

  ROW_NUMBER() OVER (
    PARTITION BY
      CASE
        WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN 'EI'
        WHEN CAB.CODTIPOPER = 322 THEN 'TOP322'
        WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN 'RL'
        WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN 'EC'
        ELSE 'OUT'
      END
    ORDER BY TRUNC(CAB.DTALTER) DESC, CAB.NUNOTA DESC, ITE.SEQUENCIA ASC
  ) AS ORDEM_TIPO,

  ROW_NUMBER() OVER (
    ORDER BY
      CASE
        WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN 1
        WHEN CAB.CODTIPOPER = 322 THEN 2
        WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN 3
        WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN 4
        ELSE 9
      END,
      TRUNC(CAB.DTALTER) DESC,
      CAB.NUNOTA DESC,
      ITE.SEQUENCIA ASC
  ) AS ORDEM_GERAL,

  CAB.NUNOTA,
  CAB.NUMNOTA,
  CAB.CODTIPOPER,
  TOP.DESCROPER,

  TRUNC(CAB.DTALTER) AS DTALTER,
  TO_CHAR(CAB.DTALTER, 'HH24:MI:SS') AS HRALTER,

  CAB.CODPARC,
  PAR.RAZAOSOCIAL AS PARCEIRO,

  CAB.VLRNOTA,

  CAB.CODVEND,
  VEN.APELIDO AS VENDEDOR,

  CAB.AD_TIPODEENTREGA,
  CASE CAB.AD_TIPODEENTREGA
    WHEN 'EI' THEN 'Em Loja'
    WHEN 'RL' THEN 'Vem Pegar'
    WHEN 'EC' THEN 'Entregar'
    ELSE 'Não informado'
  END AS TIPO_ENTREGA,

  CAB.STATUSNOTA AS STATUS_NOTA,
  CASE CAB.STATUSNOTA
    WHEN 'A' THEN 'Atendimento'
    WHEN 'L' THEN 'Liberada'
    WHEN 'P' THEN 'Pendente'
    ELSE 'N/I'
  END AS STATUS_NOTA_DESC,

  CAB.LIBCONF,

  /* CONFERÊNCIA (por pedido) */
  NVL(
    NULLIF(
      TRIM(
        MAX(
          CASE CON.STATUS
            WHEN 'A'  THEN 'Em andamento'
            WHEN 'AC' THEN 'Aguardando conferência'
            WHEN 'AL' THEN 'Aguardando liberação p/ conferência'
            WHEN 'C'  THEN 'Aguardando liberação de corte'
            WHEN 'D'  THEN 'Finalizada divergente'
            WHEN 'Z'  THEN 'Aguardando finalização'
            WHEN 'R'  THEN 'Aguardando recontagem'
            WHEN 'RA' THEN 'Recontagem em andamento'
            WHEN 'RD' THEN 'Recontagem finalizada divergente'
            WHEN 'RF' THEN 'Recontagem finalizada OK'
            WHEN 'F'  THEN 'Finalizada OK'
            ELSE NULL
          END
        )
      ),
      ''
    ),
    CASE
      WHEN TRIM(UPPER(CAB.AD_EMSEPARACAO)) = 'S' THEN 'Em separação'
      ELSE NULL
    END
  ) AS STATUS_CONFERENCIA_DESC,

  COUNT(CON.STATUS) AS QTD_REG_CONFERENCIA,

  /* ITENS */
  ITE.SEQUENCIA,
  ITE.CODPROD,
  PRO.DESCRPROD,
  PRO.CODGRUPOPROD,
  ITE.CODVOL,
  ITE.QTDNEG,
  ITE.VLRUNIT,
  ITE.VLRTOT,

  /* ✅ NOVO: impresso por item */
  ITE.AD_IMPRESSO AS IMPRESSO

FROM TGFCAB CAB
JOIN TGFTOP TOP
  ON TOP.CODTIPOPER = CAB.CODTIPOPER
 AND TOP.DHALTER   = CAB.DHTIPOPER
LEFT JOIN TGFPAR PAR
  ON PAR.CODPARC = CAB.CODPARC
LEFT JOIN TGFVEN VEN
  ON VEN.CODVEND = CAB.CODVEND
LEFT JOIN TGFCON2 CON
  ON CON.NUNOTAORIG = CAB.NUNOTA
LEFT JOIN TGFITE ITE
  ON ITE.NUNOTA = CAB.NUNOTA
LEFT JOIN TGFPRO PRO
  ON PRO.CODPROD = ITE.CODPROD

  WHERE (
          (CAB.CODTIPOPER IN (601,326) AND CAB.CODTIPVENDA not IN (238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160) and (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S'))
		    OR (CAB.CODTIPOPER IN (601,326) AND CAB.CODTIPVENDA IN (238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160))
          OR CAB.CODTIPOPER = 322
        )
  AND CAB.CODEMP = 1
  AND CAB.STATUSNOTA = 'L'
  AND CAB.PENDENTE = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM TGFVAR VAR WHERE VAR.NUNOTAORIG = CAB.NUNOTA
  )
  AND NOT EXISTS (
    SELECT 1 FROM TGFCON2 C2
     WHERE C2.NUNOTAORIG = CAB.NUNOTA
       AND C2.STATUS = 'F'
  )
  AND PRO.CODGRUPOPROD IN (7101104, 7101115, 7101113, 7101103, 7101102, 7101106)

GROUP BY
  CAB.NUNOTA,
  CAB.NUMNOTA,
  CAB.CODTIPOPER,
  TOP.DESCROPER,
  CAB.CODPARC,
  PAR.RAZAOSOCIAL,
  CAB.VLRNOTA,
  CAB.DTALTER,
  CAB.CODVEND,
  VEN.APELIDO,
  CAB.AD_TIPODEENTREGA,
  CAB.STATUSNOTA,
  CAB.LIBCONF,
  CAB.AD_EMSEPARACAO,
  ITE.SEQUENCIA,
  ITE.CODPROD,
  PRO.DESCRPROD,
  PRO.CODGRUPOPROD,
  ITE.CODVOL,
  ITE.QTDNEG,
  ITE.VLRUNIT,
  ITE.VLRTOT,
  ITE.AD_IMPRESSO

ORDER BY
  ORDEM_TIPO_PRI,
  DTALTER DESC,
  CAB.NUNOTA DESC,
  ITE.SEQUENCIA ASC

  `.trim();

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql },
    };

    try {
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

      // Ordem do SELECT (índices):
      // 0 BKCOLOR
      // 1 FGCOLOR
      // 2 ORDEM_TIPO_PRI
      // 3 ORDEM_TIPO
      // 4 ORDEM_GERAL
      // 5 NUNOTA
      // 6 NUMNOTA
      // 7 CODTIPOPER
      // 8 DESCROPER
      // 9 DTALTER
      // 10 HRALTER
      // 11 CODPARC
      // 12 PARCEIRO
      // 13 VLRNOTA
      // 14 CODVEND
      // 15 VENDEDOR
      // 16 AD_TIPODEENTREGA
      // 17 TIPO_ENTREGA
      // 18 STATUS_NOTA
      // 19 STATUS_NOTA_DESC
      // 20 LIBCONF
      // 21 STATUS_CONFERENCIA_COD
      // 22 STATUS_CONFERENCIA_DESC
      // 23 QTD_REG_CONFERENCIA
      // 24 SEQUENCIA
      // 25 CODPROD
      // 26 DESCRPROD
      // 27 CODGRUPOPROD
      // 28 CODVOL
      // 29 QTDNEG
      // 30 VLRUNIT
      // 31 VLRTOT
      // 32 AD_IMPRESSO



      const mapped: FilaCabosRow[] = (rows ?? []).map((r: any[]) => ({
        // ordem/cores
        ordemLinha: Number(r?.[4] ?? 0),        // ORDEM_GERAL
        bkcolor: String(r?.[0] ?? ''),
        fgcolor: String(r?.[1] ?? ''),
        ordemTipoPri: Number(r?.[2] ?? 0),      // ✅
        ordemTipo: Number(r?.[3] ?? 0),         // ✅

        // cabeçalho/pedido
        nunota: Number(r?.[5] ?? 0),
        numnota: Number(r?.[6] ?? 0),
        codtipoper: Number(r?.[7] ?? 0),
        descroper: String(r?.[8] ?? ''),

        dtalter: String(r?.[9] ?? ''),          // ✅
        hralter: String(r?.[10] ?? ''),         // ✅

        codparc: Number(r?.[11] ?? 0),
        parceiro: String(r?.[12] ?? ''),
        vlrnota: Number(r?.[13] ?? 0),

        codvend: Number(r?.[14] ?? 0),
        vendedor: String(r?.[15] ?? ''),

        adTipoDeEntrega: r?.[16] != null ? String(r?.[16]) : null,
        tipoEntrega: String(r?.[17] ?? ''),

        statusNota: String(r?.[18] ?? ''),
        statusNotaDesc: String(r?.[21] ?? ''),

        libconf: r?.[20] != null ? String(r?.[20]) : null,

        statusConferenciaCod: r?.[21] != null ? String(r?.[21]) : null,
        statusConferenciaDesc: r?.[22] != null ? String(r?.[19]) : null,
        qtdRegConferencia: Number(r?.[23] ?? 0),

        // itens
        sequencia: Number(r?.[23] ?? 0),
        codprod: Number(r?.[24] ?? 0),
        descrprod: String(r?.[25] ?? ''),
        codgrupoprod: Number(r?.[26] ?? 0),
        codvol: String(r?.[27] ?? ''),
        qtdneg: Number(r?.[28] ?? 0),
        vlrunit: Number(r?.[29] ?? 0),
        vlrtot: Number(r?.[30] ?? 0),
        impresso: String(r?.[31] ?? ''),
      }));
      //console.log(mapped)
      return mapped;
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
    //#endregion
  }

   //#endregion

}