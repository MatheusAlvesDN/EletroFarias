import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { format } from 'date-fns';

@Injectable()
export class TransporteMais {
  private readonly token: string;
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.token = this.config.get<string>('TOKEN_TRANSPORTEMAIS')!;
  }

  // retorna um array [{ id, numero }] apenas de tipo 55 e sem duplicados por numero
  async buscarEntregasPorTipo(
    tipo: string, // exemplo: '55' ou '500'
    data = format(new Date(), 'dd/MM/yyyy')
  ): Promise<Array<{
    id: string;
    numero: number;
    situacao: string;
    ocorrenciaCodigo?: string;
    ocorrenciaSituacao?: string;
    dataAtualizacao: string;
  }>> {
    const url = `https://api.transportemais.com.br/v1/entregas?data=${encodeURIComponent(data)}`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };

    const resp = await firstValueFrom(this.http.get(url, { headers }));
    const lista: any[] = Array.isArray(resp.data?.data) ? resp.data.data : [];

    // filtra só pelo tipo informado
    const apenasTipo = lista.filter((item) => item?.tipo === tipo);

    // dedup por numero
    const seen = new Set<number>();
    const unicas = apenasTipo.filter((item) => {
      if (typeof item?.numero !== 'number') return false;
      if (seen.has(item.numero)) return false;
      seen.add(item.numero);
      return true;
    });

    // transforma no formato desejado
    const resultado = unicas.map((item) => {
      // pega o último evento (se houver)
      const ultimoEvento = Array.isArray(item.eventos) && item.eventos.length > 0
        ? item.eventos[item.eventos.length - 1]
        : null;

      return {
        id: String(item.id),
        numero: item.numero as number,
        situacao: item.situacao,
        ocorrenciaCodigo: ultimoEvento?.ocorrencia?.codigo,
        ocorrenciaSituacao: ultimoEvento?.ocorrencia?.situacao,
        dataAtualizacao: item.data_atualizacao, // ISO string
      };
    });

    // ordena por dataAtualizacao desc
    return resultado.sort(
      (a, b) => new Date(b.dataAtualizacao).getTime() - new Date(a.dataAtualizacao).getTime()
    );
  }



  async buscarEntregas(
    data = format(new Date(), 'dd/MM/yyyy')
  ): Promise<Array<{
    id: string;
    numero: number;
    tipo?: string; // <— incluir
    situacao: string;
    ocorrenciaCodigo?: string;
    ocorrenciaSituacao?: string;
    dataAtualizacao: string;
  }>> {
    const url = `https://api.transportemais.com.br/v1/entregas?data=${encodeURIComponent(data)}`;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` };

    const resp = await firstValueFrom(this.http.get(url, { headers }));
    const lista: any[] = Array.isArray(resp.data?.data) ? resp.data.data : [];

    // dedup por numero
    const seen = new Set<number>();
    const unicas = lista.filter((item) => {
      if (typeof item?.numero !== 'number') return false;
      if (seen.has(item.numero)) return false;
      seen.add(item.numero);
      return true;
    });

    const resultado = unicas.map((item) => {
      const ultimoEvento = Array.isArray(item.eventos) && item.eventos.length > 0
        ? item.eventos[item.eventos.length - 1]
        : null;

      return {
        id: String(item.id),
        numero: item.numero as number,
        tipo: item.tipo, // <— manter para o sync
        situacao: item.situacao,
        ocorrenciaCodigo: ultimoEvento?.ocorrencia?.codigo,
        ocorrenciaSituacao: ultimoEvento?.ocorrencia?.situacao,
        dataAtualizacao: item.data_atualizacao,
      };
    });

    return resultado.sort(
      (a, b) => new Date(b.dataAtualizacao).getTime() - new Date(a.dataAtualizacao).getTime()
    );
  }



}
