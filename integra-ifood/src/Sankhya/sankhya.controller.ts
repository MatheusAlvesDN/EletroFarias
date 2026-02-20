import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SankhyaService } from './sankhya.service';

@Controller('sankhya')
export class SankhyaController {

  constructor(private readonly sankhyaService: SankhyaService) {}

  @Get()
  index() {
    return { ok: true, area: 'sankhya' }
    
  }
 
  @Get('nfe')
  async getAllNotas(
    @Query('dtIni') dtIni?: string,
    @Query('dtFim') dtFim?: string,
  ) {
    if (!dtIni || !dtFim) {
      throw new BadRequestException('Informe dtIni e dtFim (formato YYYY-MM-DD).');
    }

    // validação simples (evita lixo)
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(dtIni) || !re.test(dtFim)) {
      throw new BadRequestException('dtIni/dtFim inválidos. Use YYYY-MM-DD.');
    }

    const token = await this.sankhyaService.login();
    const retorno = await this.sankhyaService.getAllTGFIXN(token, dtIni, dtFim);
   
    /*return (retorno ?? []).map((r: any) => ({
      NUMNOTA: r.NUMNOTA ?? r.numnota ?? r.NUNOTA ?? r.nunota,
      VLRNOTA: r.VLRNOTA ?? r.vlrnota,
      XML: r.XML ?? r.xml,
      CONFIG: r.CONFIG ?? r.config,
    //}));*/
      console.log('primeiro item:', JSON.stringify(retorno?.[0] ?? null));
      return this.sankhyaService.getAllTGFIXN(token, dtIni, dtFim);

  }

}