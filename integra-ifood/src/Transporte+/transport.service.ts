import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

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
  async buscarEntregas(): Promise<Array<{ id: string; numero: number }>> {
    const url =
      'https://api.transportemais.com.br/v1/entregas?data=14%2F08%2F2025&situacao=2';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };

    const resp = await firstValueFrom(this.http.get(url, { headers }));
    const lista: any[] = Array.isArray(resp.data?.data) ? resp.data.data : [];

    // filtra só tipo 55
    const apenasTipo55 = lista.filter((item) => item?.tipo === '55');

    // dedup por numero
    const seen = new Set<number>();
    const unicas = apenasTipo55.filter((item) => {
      if (typeof item?.numero !== 'number') return false;
      if (seen.has(item.numero)) return false;
      seen.add(item.numero);
      return true;
    });

    // retorna somente os campos usados no SyncService
    return unicas.map((item) => ({
      id: String(item.id),
      numero: item.numero as number,
    }));
  }
}
