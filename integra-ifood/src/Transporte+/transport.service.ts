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


  async buscarEntregas(
    data = format(new Date(), 'dd/MM/yyyy')
  ): Promise<Array<{
    id: string;
    numero: number;
    tipo?: string;
    situacao: string;
    ocorrenciaCodigo: string;
    ocorrenciaSituacao: string;
    dataAtualizacao: string;
  }>> {
    const url = `https://api.transportemais.com.br/v1/entregas?data=${encodeURIComponent(data)}`;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` };

    const resp = await firstValueFrom(this.http.get(url, { headers }));
    const lista: any[] = Array.isArray(resp.data?.data) ? resp.data.data : [];

    const resultado = lista.map((item) => {
      // pega o último evento QUE TEM ocorrencia
      const eventos = Array.isArray(item.eventos) ? item.eventos : [];
      const eventoComOcorrencia =
        [...eventos].reverse().find(ev => ev?.ocorrencia && (ev.ocorrencia.codigo || ev.ocorrencia.situacao)) || null;

      return {
        id: String(item.id),
        numero: Number(item.numero),
        tipo: item.tipo,
        situacao: item.situacao,
        ocorrenciaCodigo: String(eventoComOcorrencia?.ocorrencia?.codigo ?? ''),     // <- normaliza p/ string
        ocorrenciaSituacao: String(eventoComOcorrencia?.ocorrencia?.situacao ?? ''), // <- normaliza p/ string
        dataAtualizacao: item.data_atualizacao,
      };
    });

    return resultado
      .map(r => ({ ...r, __ts: Date.parse(r.dataAtualizacao || '') || 0 }))
      .sort((a, b) => b.__ts - a.__ts)
      .map(({ __ts, ...r }) => r);
  }

  async buscarEntregas2(
    data = format(new Date(), 'dd/MM/yyyy')
  ): Promise<Array<{
    id: string;
    numero: number | null;   // <- permite null
    tipo?: string;
    situacao: string;
    ocorrenciaCodigo: string;
    ocorrenciaSituacao: string;
    dataAtualizacao: string;
    ocorrenciaId: string;
    ocorrenciaDescricao: string;
    ocorrenciaPrioridade: string;
    motoristaId: string;
    motoristaNome: string;
  }>> {
    const url = `https://api.transportemais.com.br/v1/entregas?data=${encodeURIComponent(data)}`;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` };

    const resp: any = await firstValueFrom(this.http.get(url, { headers }));

    // TENTE os dois formatos comuns (Angular HttpClient vs Axios)
    const payload = resp?.data ?? resp;
    const lista: any[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];

    const resultado = lista.map((item) => {
      const eventos = Array.isArray(item?.eventos) ? item.eventos : [];
      const eventoComOcorrencia =
        [...eventos].reverse().find(ev => ev?.ocorrencia && (ev.ocorrencia.codigo || ev.ocorrencia.situacao)) || null;

      // Parse defensivo do numero
      const rawNumero = item?.numero;
      const numeroParsed =
        typeof rawNumero === 'number'
          ? rawNumero
          : (rawNumero != null && Number.isFinite(Number(rawNumero)))
            ? Number(rawNumero)
            : null;

      const motoristaId = String(
        eventoComOcorrencia?.motorista_id ??
        eventoComOcorrencia?.id_responsavel ??
        (Array.isArray(item?.id_motoristas) ? item.id_motoristas[0] : '') ??
        ''
      );

      const motoristaNome = String(eventoComOcorrencia?.responsavel ?? '');

      return {
        id: String(item?.id ?? ''),
        numero: numeroParsed,                         // <- agora nunca vira NaN
        tipo: item?.tipo,
        situacao: String(item?.situacao ?? ''),
        ocorrenciaCodigo: String(eventoComOcorrencia?.ocorrencia?.codigo ?? ''),
        ocorrenciaSituacao: String(eventoComOcorrencia?.ocorrencia?.situacao ?? ''),
        dataAtualizacao: String(item?.data_atualizacao ?? ''),

        ocorrenciaId: String(eventoComOcorrencia?.ocorrencia?.id_ocorrencia ?? ''),
        ocorrenciaDescricao: String(eventoComOcorrencia?.ocorrencia?.descricao ?? ''),
        ocorrenciaPrioridade: String(eventoComOcorrencia?.ocorrencia?.prioridade ?? ''),
        motoristaId,
        motoristaNome,
      };
    });

    return resultado
      .map(r => ({ ...r, __ts: Date.parse(r.dataAtualizacao || '') || 0 }))
      .sort((a, b) => b.__ts - a.__ts)
      .map(({ __ts, ...r }) => r);
  }





}