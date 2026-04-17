import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../Prisma/prisma.service';
import { SankhyaService } from '../Sankhya/sankhya.service';

export interface ProdutoML {
    CODPROD: number;
    DESCRPROD: string | null;
    CODBARRA?: string | null;
    CODGRUPOPROD?: number | null;
    DESCRGRUPOPROD?: string | null;
    MARCA?: string | null;
    ATIVO?: any;
    CODBARRAS?: string[];

    PRECO?: number | string | null;
    ESTOQUE?: number | string | null;

    // compatibilidade com payloads do front
    price?: number | string | null;
    estoque?: number | string | null;
    stock?: number | string | null;
    available_quantity?: number | string | null;
    title?: string | null;
}

export interface ProdutoMlCadastrado {
    id: string;
    title: string;
    status: string;
    price: number;
    available_quantity: number;
    listing_type_id: string | null;
    category_id: string | null;
    thumbnail: string | null;
    permalink: string | null;
}

@Injectable()
export class MercadoLivreService {
    constructor(
        private readonly httpService: HttpService,
        private readonly prisma: PrismaService,
        private readonly sankhyaService: SankhyaService,
    ) { }

    async solicitarToken(code: string) {
        const clientId = process.env.ML_CLIENT_ID;
        const clientSecret = process.env.ML_CLIENT_SECRET;
        const redirectUri = process.env.ML_REDIRECT_URI;

        if (!clientId || !clientSecret || !redirectUri) {
            throw new HttpException(
                'ML_CLIENT_ID, ML_CLIENT_SECRET ou ML_REDIRECT_URI não configurados',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        try {
            const body = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
            });

            const response = await firstValueFrom(
                this.httpService.post(
                    'https://api.mercadolibre.com/oauth/token',
                    body.toString(),
                    {
                        headers: {
                            accept: 'application/json',
                            'content-type': 'application/x-www-form-urlencoded',
                        },
                    },
                ),
            );

            const data = response.data;

            if (!data?.access_token || !data?.refresh_token || !data?.expires_in) {
                throw new HttpException(
                    'Resposta do Mercado Livre sem access_token, refresh_token ou expires_in',
                    HttpStatus.BAD_GATEWAY,
                );
            }

            const tokenSalvo = await this.prisma.salvarMercadoLivreToken(
                data.access_token,
                data.refresh_token,
                Number(data.expires_in),
            );

            await this.prisma.limparTokensMercadoLivreAntigos(tokenSalvo.id);

            return {
                message: 'Token do Mercado Livre salvo com sucesso.',
                expires_in: data.expires_in,
                user_id: data.user_id,
            };
        } catch (error: any) {
            throw new HttpException(
                {
                    message: 'Erro ao solicitar token do Mercado Livre',
                    detalhes: error?.response?.data || error.message,
                },
                error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async renovarToken() {
        const clientId = process.env.ML_CLIENT_ID;
        const clientSecret = process.env.ML_CLIENT_SECRET;
        const tokenAtual = await this.prisma.getUltimoMercadoLivreToken();

        if (!clientId || !clientSecret || !tokenAtual?.refreshToken) {
            throw new HttpException(
                'ML_CLIENT_ID, ML_CLIENT_SECRET ou refresh token não configurados',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        try {
            const body = new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: tokenAtual.refreshToken,
            });

            const response = await firstValueFrom(
                this.httpService.post(
                    'https://api.mercadolibre.com/oauth/token',
                    body.toString(),
                    {
                        headers: {
                            accept: 'application/json',
                            'content-type': 'application/x-www-form-urlencoded',
                        },
                    },
                ),
            );

            const data = response.data;

            if (!data?.access_token || !data?.refresh_token || !data?.expires_in) {
                throw new HttpException(
                    'Resposta do Mercado Livre sem access_token, refresh_token ou expires_in',
                    HttpStatus.BAD_GATEWAY,
                );
            }

            const tokenSalvo = await this.prisma.salvarMercadoLivreToken(
                data.access_token,
                data.refresh_token,
                Number(data.expires_in),
            );

            await this.prisma.limparTokensMercadoLivreAntigos(tokenSalvo.id);

            return {
                message: 'Token renovado com sucesso.',
                expires_in: data.expires_in,
                user_id: data.user_id,
            };
        } catch (error: any) {
            throw new HttpException(
                {
                    message: 'Erro ao renovar token do Mercado Livre',
                    detalhes: error?.response?.data || error.message,
                },
                error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    private tokenExpirado(createdAt: Date, expiresIn: number): boolean {
        const expiraEm = createdAt.getTime() + expiresIn * 1000;
        return Date.now() >= expiraEm - 60_000;
    }

    async getAccessTokenValido(): Promise<string> {
        const token = await this.prisma.getUltimoMercadoLivreToken();

        if (!token) {
            throw new HttpException(
                'Nenhum token do Mercado Livre encontrado',
                HttpStatus.NOT_FOUND,
            );
        }

        if (this.tokenExpirado(token.createdAt, token.expiresIn)) {
            await this.renovarToken();
            const novoToken = await this.prisma.getUltimoMercadoLivreToken();

            if (!novoToken?.accessToken) {
                throw new HttpException(
                    'Falha ao obter novo token do Mercado Livre',
                    HttpStatus.UNAUTHORIZED,
                );
            }

            return novoToken.accessToken;
        }

        return token.accessToken;
    }

    async requestComAutoRefresh<T = any>(config: AxiosRequestConfig): Promise<T> {
        let accessToken = await this.getAccessTokenValido();

        try {
            const response = await firstValueFrom(
                this.httpService.request<T>({
                    ...config,
                    headers: {
                        ...(config.headers ?? {}),
                        Authorization: `Bearer ${accessToken}`,
                    },
                }),
            );

            return response.data;
        } catch (error: any) {
            const status = error?.response?.status;
            const mlError = error?.response?.data;

            const precisaRenovar =
                status === 400 ||
                status === 401 ||
                status === 403 ||
                mlError?.message === 'invalid_token' ||
                mlError?.error === 'invalid_token';

            if (!precisaRenovar) {
                throw error;
            }

            await this.renovarToken();
            accessToken = await this.getAccessTokenValido();

            const retryResponse = await firstValueFrom(
                this.httpService.request<T>({
                    ...config,
                    headers: {
                        ...(config.headers ?? {}),
                        Authorization: `Bearer ${accessToken}`,
                    },
                }),
            );

            return retryResponse.data;
        }
    }

    async buscarUsuarioMl() {
        return this.requestComAutoRefresh({
            method: 'GET',
            url: 'https://api.mercadolibre.com/users/me',
        });
    }

    async buscarProdutosParaMeli() {
        const token = await this.sankhyaService.login();

        try {
            const produtos = await this.sankhyaService.getAllProdutosTGFPRO(token);

            const codigos = produtos
                .map((p: any) => Number(p.CODPROD))
                .filter((n: number) => Number.isFinite(n) && n > 0);

            const precos = await this.sankhyaService.getPrecosProdutosTabelaBatch(
                codigos,
                1,
                token,
            );

            const precoMap = new Map(
                precos.map((p: any) => [String(p.codProd), Number(p.valor || 0)]),
            );

            const produtosBase = produtos.map((p: any) => ({
                barcode: p.CODBARRA ?? '',
                name: p.DESCRPROD ?? '',
                plu: String(p.CODPROD),
                active: String(p.ATIVO) === 'S',
                inventory: { stock: 0 },
                details: {
                    categorization: {
                        department: p.DESCRGRUPOPROD ?? null,
                        category: p.MARCA ?? null,
                        subCategory: null,
                    },
                    brand: p.MARCA ?? null,
                    unit: null,
                    volume: null,
                    imageUrl: null,
                    description: p.DESCRPROD ?? null,
                    nearExpiration: false,
                    family: null,
                },
                prices: {
                    price: precoMap.get(String(p.CODPROD)) ?? 0,
                    promotionPrice: null,
                },
                scalePrices: null,
                multiple: null,
                channels: null,
                serving: null,
            }));

            const produtosComEstoque = await this.sankhyaService.getStockInLot(
                produtosBase,
                1100,
                token,
            );

            const estoqueMap = new Map(
                produtosComEstoque.map((p: any) => [
                    String(p.plu),
                    Number(p.inventory?.stock || 0),
                ]),
            );

            return produtos.map((p: any) => ({
                CODPROD: Number(p.CODPROD),
                DESCRPROD: p.DESCRPROD ?? null,
                CODBARRA: p.CODBARRA ?? null,
                CODBARRAS: Array.isArray(p.CODBARRAS) ? p.CODBARRAS : [],
                CODGRUPOPROD: p.CODGRUPOPROD ? Number(p.CODGRUPOPROD) : null,
                DESCRGRUPOPROD: p.DESCRGRUPOPROD ?? null,
                MARCA: p.MARCA ?? null,
                ATIVO: p.ATIVO ?? 'S',
                PRECO: precoMap.get(String(p.CODPROD)) ?? 0,
                ESTOQUE: estoqueMap.get(String(p.CODPROD)) ?? 0,
            }));
        } finally {
            await this.sankhyaService.logout(token, 'mercadolivre/produtos');
        }
    }

    async buscarProdutosCadastrados(params: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
    }) {
        const page = Math.max(Number(params.page || 1), 1);
        const limit = Math.min(Math.max(Number(params.limit || 50), 1), 100);
        const offset = (page - 1) * limit;

        const me = await this.buscarUsuarioMl();
        const userId = me?.id;

        if (!userId) {
            throw new HttpException(
                'Não foi possível identificar o usuário do Mercado Livre.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const query = new URLSearchParams();
        query.set('limit', String(limit));
        query.set('offset', String(offset));

        if (params.search?.trim()) {
            query.set('q', params.search.trim());
        }

        if (params.status && params.status !== 'ALL') {
            query.set('status', params.status);
        }

        const busca = await this.requestComAutoRefresh<any>({
            method: 'GET',
            url: `https://api.mercadolibre.com/users/${userId}/items/search?${query.toString()}`,
        });

        const ids: string[] = busca?.results ?? [];

        if (ids.length === 0) {
            return {
                items: [],
                paging: {
                    total: busca?.paging?.total ?? 0,
                    page,
                    limit,
                },
            };
        }

        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += 20) {
            chunks.push(ids.slice(i, i + 20));
        }

        const detalhesAgrupados: any[] = [];

        for (const chunk of chunks) {
            const resposta = await this.requestComAutoRefresh<any[]>({
                method: 'GET',
                url: 'https://api.mercadolibre.com/items',
                params: { ids: chunk.join(',') },
            });

            if (Array.isArray(resposta)) {
                detalhesAgrupados.push(...resposta);
            }
        }

        const items = detalhesAgrupados
            .map((item: any) => item?.body)
            .filter(Boolean)
            .map((item: any) => ({
                id: item.id,
                title: item.title,
                status: item.status,
                price: item.price,
                available_quantity: item.available_quantity,
                listing_type_id: item.listing_type_id ?? null,
                category_id: item.category_id ?? null,
                thumbnail: item.thumbnail ?? null,
                permalink: item.permalink ?? null,
            }));

        return {
            items,
            paging: {
                total: busca?.paging?.total ?? items.length,
                page,
                limit,
            },
        };
    }

    private toNumber(value: any, fallback = 0): number {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    private limparTitulo(title: string): string {
        return title.replace(/\s+/g, ' ').trim().slice(0, 60);
    }

    private gerarFamilyName(produto: ProdutoML): string {
        const base =
            produto.DESCRPROD?.trim() ||
            produto.title?.trim() ||
            `Produto ${produto.CODPROD}`;

        return this.limparTitulo(base);
    }

    private normalizarErroMl(error: any) {
        const mlError = error?.response?.data;

        if (mlError) {
            return {
                ...mlError,
                status: error?.response?.status ?? null,
            };
        }

        return {
            message: error?.message || 'Erro não informado',
            status: error?.response?.status ?? null,
        };
    }

    private getListingTypeId(): string {
        return process.env.ML_LISTING_TYPE_ID?.trim() || 'gold_special';
    }

    private getCategoryId(_produto: ProdutoML): string {
        return process.env.ML_CATEGORY_ID?.trim() || 'MLB1055';
    }

    private normalizarProduto(produto: ProdutoML) {
        const price = this.toNumber(produto.PRECO ?? produto.price, 0);

        const stock = this.toNumber(
            produto.ESTOQUE ??
            produto.estoque ??
            produto.stock ??
            produto.available_quantity,
            0,
        );

        const titleBase =
            produto.title?.trim() ||
            produto.DESCRPROD?.trim() ||
            `Produto ${produto.CODPROD}`;

        const title = this.limparTitulo(titleBase);
        const familyName = this.gerarFamilyName(produto);

        const barcode =
            produto.CODBARRA?.trim() ||
            (Array.isArray(produto.CODBARRAS) && produto.CODBARRAS.length > 0
                ? String(produto.CODBARRAS[0]).trim()
                : '');

        return {
            ...produto,
            title,
            familyName,
            price,
            stock,
            barcode,
        };
    }

    private async enriquecerProdutosParaEnvio(produtos: ProdutoML[]) {
        const token = await this.sankhyaService.login();

        try {
            const codigos = Array.from(
                new Set(
                    produtos
                        .map((p) => Number(p.CODPROD))
                        .filter((n) => Number.isFinite(n) && n > 0),
                ),
            );

            const precos = codigos.length
                ? await this.sankhyaService.getPrecosProdutosTabelaBatch(codigos, 1, token)
                : [];

            const precoMap = new Map(
                precos.map((p: any) => [String(p.codProd), Number(p.valor || 0)]),
            );

            const produtosBase = produtos.map((p: any) => ({
                barcode: p.CODBARRA ?? '',
                name: p.DESCRPROD ?? '',
                plu: String(p.CODPROD),
                active: String(p.ATIVO) === 'S',
                inventory: { stock: 0 },
                details: {
                    categorization: {
                        department: p.DESCRGRUPOPROD ?? null,
                        category: p.MARCA ?? null,
                        subCategory: null,
                    },
                    brand: p.MARCA ?? null,
                    unit: null,
                    volume: null,
                    imageUrl: null,
                    description: p.DESCRPROD ?? null,
                    nearExpiration: false,
                    family: null,
                },
                prices: {
                    price: precoMap.get(String(p.CODPROD)) ?? 0,
                    promotionPrice: null,
                },
                scalePrices: null,
                multiple: null,
                channels: null,
                serving: null,
            }));

            const produtosComEstoque = produtosBase.length
                ? await this.sankhyaService.getStockInLot(produtosBase, 1100, token)
                : [];

            const estoqueMap = new Map(
                produtosComEstoque.map((p: any) => [
                    String(p.plu),
                    Number(p.inventory?.stock || 0),
                ]),
            );

            return produtos.map((produto) => ({
                ...produto,
                PRECO:
                    precoMap.get(String(produto.CODPROD)) ??
                    produto.PRECO ??
                    produto.price ??
                    0,
                ESTOQUE:
                    estoqueMap.get(String(produto.CODPROD)) ??
                    produto.ESTOQUE ??
                    produto.estoque ??
                    produto.stock ??
                    produto.available_quantity ??
                    0,
            }));
        } finally {
            await this.sankhyaService.logout(token, 'mercadolivre/cadastrarProdutos');
        }
    }

    async cadastrarProdutos(produtos: ProdutoML[]) {
        if (!Array.isArray(produtos) || produtos.length === 0) {
            throw new HttpException(
                'Lista de produtos vazia.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const produtosEnriquecidos = await this.enriquecerProdutosParaEnvio(produtos);

        const resultados: Array<
            | {
                ok: true;
                codProd: number;
                produto: string;
                response: any;
            }
            | {
                ok: false;
                codProd: number;
                produto: string;
                erro: any;
                payload?: any;
            }
        > = [];

        for (const item of produtosEnriquecidos) {
            const produto = this.normalizarProduto(item);

            try {
                if (!produto.CODPROD) {
                    throw new Error('CODPROD não informado.');
                }

                if (!produto.familyName) {
                    throw new Error('family_name não informado.');
                }

                if (produto.price <= 0) {
                    throw new Error('Preço inválido para envio ao Mercado Livre.');
                }

                if (produto.stock < 0) {
                    throw new Error('Estoque inválido para envio ao Mercado Livre.');
                }

                const payload = {
                    family_name: produto.familyName,
                    price: produto.price,
                    buying_mode: 'buy_it_now',
                    condition: 'new',
                    listing_type_id: this.getListingTypeId(),
                    currency_id: 'BRL',
                    category_id: this.getCategoryId(produto),
                };

                const result = await this.requestComAutoRefresh({
                    method: 'POST',
                    url: 'https://api.mercadolibre.com/items',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: payload,
                });

                resultados.push({
                    ok: true,
                    codProd: produto.CODPROD,
                    produto: produto.title,
                    response: result,
                });
            } catch (error: any) {
                resultados.push({
                    ok: false,
                    codProd: Number(produto.CODPROD || 0),
                    produto: produto.title ?? String(produto.CODPROD ?? ''),
                    erro: this.normalizarErroMl(error),
                    payload: {
                        family_name: produto.familyName,
                        price: produto.price,
                        listing_type_id: this.getListingTypeId(),
                        category_id: this.getCategoryId(produto),
                    },
                });
            }
        }

        const sucesso = resultados.filter((r) => r.ok).length;
        const erro = resultados.filter((r) => !r.ok).length;

        let message = 'Processamento finalizado.';
        if (sucesso > 0 && erro === 0) {
            message = 'Todos os produtos foram cadastrados com sucesso.';
        } else if (sucesso > 0 && erro > 0) {
            message = 'Processamento finalizado com sucesso parcial.';
        } else if (sucesso === 0 && erro > 0) {
            message = 'Nenhum produto foi cadastrado.';
        }

        return {
            message,
            total: produtos.length,
            sucesso,
            erro,
            resultados,
        };
    }
}
