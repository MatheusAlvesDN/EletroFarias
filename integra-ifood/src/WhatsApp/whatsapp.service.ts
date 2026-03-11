import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(WhatsappService.name);
  public isReady = false;

  onModuleInit() {
    this.logger.log('Inicializando cliente do WhatsApp...');

    // LocalAuth salva a sessão numa pasta local. Assim você não precisa ler o QR Code toda vez que reiniciar o servidor.
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // <-- ESSENCIAL para não estourar a memória do Render
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // <-- Faz o Chrome usar menos processos e memória
          '--disable-gpu'
        ],
      },
    });

    // Quando precisar ler o QR Code, ele aparece no terminal
    this.client.on('qr', (qr) => {
      this.logger.warn('⚠️ ATENÇÃO: Leia o QR Code abaixo com o WhatsApp da Loja:');
      qrcode.generate(qr, { small: true });
    });

    // Quando conectar com sucesso
    this.client.on('ready', () => {
      this.logger.log('✅ WhatsApp conectado com sucesso! Pronto para disparar mensagens.');
      this.isReady = true;
    });

    this.client.on('disconnected', (reason) => {
      this.logger.error(`❌ WhatsApp desconectado: ${reason}`);
      this.isReady = false;
    });

    this.client.initialize();
  }

  async enviarMensagem(numero: string, mensagem: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('O WhatsApp da loja ainda não está conectado. Verifique o terminal do servidor.');
    }

    try {
      // 1. Limpa tudo que não for número
      let numeroLimpo = numero.replace(/\D/g, '');

      // 2. Adiciona o DDI do Brasil (55) se não existir
      if (!numeroLimpo.startsWith('55')) {
        numeroLimpo = `55${numeroLimpo}`;
      }

      // 3. (CORREÇÃO AQUI) Busca o ID correto do usuário nos servidores do WhatsApp
      // Isso evita o erro "No LID for user" e resolve a bagunça do 9º dígito no Brasil.
      const chatIdObject = await this.client.getNumberId(numeroLimpo);

      if (!chatIdObject) {
        this.logger.error(`O número ${numeroLimpo} não possui conta no WhatsApp ativa.`);
        throw new Error('Este número de telefone não possui conta no WhatsApp.');
      }

      // O _serialized contém o ID exato que o WhatsApp espera (ex: 558399999999@c.us)
      const chatId = chatIdObject._serialized;

      // 4. Envia a mensagem
      await this.client.sendMessage(chatId, mensagem);
      this.logger.log(`Mensagem enviada com sucesso para ${chatId}`);

    } catch (error: any) {
      this.logger.error(`Falha ao enviar mensagem para ${numero}:`, error);
      // Repassa a mensagem de erro para o controller, para que o front-end mostre no Toast
      throw new Error(error.message || 'Falha ao enviar a mensagem pelo WhatsApp.');
    }
  }

  // Atualizamos os parâmetros para receber os detalhes do pedido e formatar o texto aqui
  async enviarNotificacaoRastreio(numero: string, cliente: string, numnota: number, linkRastreio: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('O WhatsApp da loja ainda não está conectado. Verifique o terminal do servidor.');
    }

    try {
      let numeroLimpo = numero.replace(/\D/g, '');

      if (!numeroLimpo.startsWith('55')) {
        numeroLimpo = `55${numeroLimpo}`;
      }

      const chatIdObject = await this.client.getNumberId(numeroLimpo);

      if (!chatIdObject) {
        this.logger.error(`O número ${numeroLimpo} não possui conta no WhatsApp ativa.`);
        throw new Error('Este número de telefone não possui conta no WhatsApp.');
      }

      const chatId = chatIdObject._serialized;

      // Monta a mensagem personalizada com o link
      const mensagemFormatada =
        `Olá, *${cliente}*! 👋\n\n` +
        `Seu pedido (Nota: *${numnota}*) entrou na nossa fila de atendimento.\n\n` +
        `📍 Você pode acompanhar o status da separação e entrega em tempo real através deste link:\n` +
        `🔗 ${linkRastreio}\n\n` +
        `Qualquer dúvida, estamos por aqui!`;

      await this.client.sendMessage(chatId, mensagemFormatada);
      this.logger.log(`Mensagem de rastreio enviada com sucesso para ${chatId}`);

    } catch (error: any) {
      this.logger.error(`Falha ao enviar mensagem para ${numero}:`, error);
      throw new Error(error.message || 'Falha ao enviar a mensagem pelo WhatsApp.');
    }
  }

}