import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v21.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
  }

  /**
   * Verifica se as credenciais mínimas estão presentes no .env.
   * Diferente da versão antiga, não há necessidade de "esperar" conexão (QR Code),
   * a API REST está sempre disponível se o token for válido.
   */
  public get isReady(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  /**
   * Envia uma mensagem de texto livre.
   * Obs: Na API Oficial, mensagens livres podem falhar se a janela de 24h estiver fechada.
   */
  async enviarMensagem(numero: string, mensagem: string): Promise<void> {
    if (!this.isReady) {
      this.logger.error('WhatsApp Cloud API não configurada. Verifique as chaves no arquivo .env');
      throw new Error('As credenciais do WhatsApp Cloud API não foram configuradas.');
    }

    try {
      const numeroLimpo = this.formatarNumero(numero);

      await axios.post(
        this.baseUrl,
        {
          messaging_product: 'whatsapp',
          to: numeroLimpo,
          type: 'text',
          text: { body: mensagem },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Mensagem enviada com sucesso para ${numeroLimpo}`);
    } catch (error: any) {
      this.tratarErro(error, numero);
    }
  }

  /**
   * Envia a notificação de rastreio.
   * Atualmente envia como texto, mas recomenda-se migrar para templates oficiais do WhatsApp.
   */
  async enviarNotificacaoRastreio(
    numero: string, 
    cliente: string, 
    numnota: number, 
    linkRastreio: string
  ): Promise<void> {
    if (!this.isReady) {
      throw new Error('As credenciais do WhatsApp Cloud API não foram configuradas.');
    }

    try {
      const numeroLimpo = this.formatarNumero(numero);

      // Monta a mensagem personalizada (Texto livre)
      const mensagemFormatada =
        `Olá, *${cliente}*! 👋\n\n` +
        `Seu pedido (Nota: *${numnota}*) entrou na nossa fila de atendimento.\n\n` +
        `📍 Você pode acompanhar o status da separação e entrega em tempo real através deste link:\n` +
        `🔗 ${linkRastreio}\n\n` +
        `Qualquer dúvida, estamos por aqui!`;

      await axios.post(
        this.baseUrl,
        {
          messaging_product: 'whatsapp',
          to: numeroLimpo,
          type: 'text',
          text: { body: mensagemFormatada },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Mensagem de rastreio enviada com sucesso para ${numeroLimpo}`);
    } catch (error: any) {
      this.tratarErro(error, numero);
    }
  }

  /**
   * Formata o número para o padrão internacional (DDI + DDD + Número)
   */
  private formatarNumero(numero: string): string {
    let numeroLimpo = numero.replace(/\D/g, '');
    
    // Se não começar com 55 (Brasil), assume que precisa adicionar
    if (!numeroLimpo.startsWith('55')) {
      numeroLimpo = `55${numeroLimpo}`;
    }
    
    return numeroLimpo;
  }

  /**
   * Centraliza o tratamento de erro da API do WhatsApp
   */
  private tratarErro(error: any, numero: string): void {
    const errorData = error.response?.data?.error;
    const mensagemErro = errorData?.message || error.message || 'Falha ao enviar a mensagem pelo WhatsApp.';
    
    this.logger.error(`Erro ao disparar mensagem para ${numero}: ${mensagemErro}`, errorData);
    
    throw new Error(`[WhatsApp API] ${mensagemErro}`);
  }
}