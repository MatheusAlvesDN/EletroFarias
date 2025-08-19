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
    data = format(new Date(), 'dd/MM/yyyy'),
    situacao = '2',
  ): Promise<Array<{ id: string; numero: number }>> {
    const url = `https://api.transportemais.com.br/v1/entregas?data=${encodeURIComponent(
      data,
    )}&situacao=${situacao}`;

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

    // retorna somente os campos usados
    return unicas.map((item) => ({
      id: String(item.id),
      numero: item.numero as number,
    }));
  }

  async buscarEntregas(data: string) {
    const url = `https://api.transportemais.com.br/v1/entregas?data=${data}&situacao=2`;

    const headers = {
      Authorization: `Bearer ${this.token}`, // substitua pelo token real
    };

    // no curl original tem "--data ''", mas é um GET, então corpo vazio não é necessário
    const resp = await firstValueFrom(
      this.http.get(url, { headers }),
    );

    return resp.data;
  }
}
