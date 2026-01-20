import { Controller, Post, Query } from '@nestjs/common';
import { IfoodService } from './ifood.service';
import { Cron } from '@nestjs/schedule';


@Controller('ifood')
export class IfoodController {
  constructor(private readonly ifoodService: IfoodService) {}

  @Post('sync-barcodes')
  async syncBarcodes(@Query('merchantId') merchantId?: string) {
    // Token iFood (você já tem)
    const ifoodAccessToken = await this.ifoodService.getValidAccessToken();

    // Token Sankhya: pegue do seu serviço existente de auth (exemplo)
    // Se você já tem outro service que gera token do Sankhya, chame ele aqui.
    // Vou deixar como ENV pra você plugar rápido:
    const sankhyaAuthToken = process.env.SANKHYA_AUTH_TOKEN as string;

    if (!sankhyaAuthToken) {
      throw new Error('SANKHYA_AUTH_TOKEN não configurado.');
    }

    return await this.ifoodService.syncEansFromSankhyaToIfood({
      sankhyaAuthToken,
      ifoodAccessToken,
      merchantId,
    });
  }


@Cron('*/30 * * * *')
  async run() {
    const ifoodAccessToken = await this.ifoodService.getValidAccessToken();
    const sankhyaAuthToken = process.env.SANKHYA_AUTH_TOKEN as string;

    const result = await this.ifoodService.syncEansFromSankhyaToIfood({
      sankhyaAuthToken,
      ifoodAccessToken,
    });

    console.log(`Sync diário concluído: ${JSON.stringify(result)}`);
  }
}
