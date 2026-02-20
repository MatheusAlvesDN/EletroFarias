import { Controller, Get, Headers, Query, UnauthorizedException } from '@nestjs/common';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { TgfixnQueryDto } from '../dto/query.dto';

@Controller('nfe')
export class SankhyaController {
  constructor(private readonly sankhyaService: SankhyaService) {}

  /**
   * GET /sankhya/tgfixn
   * Headers:
   *   Authorization: Bearer <TOKEN>
   * Query:
   *   includeClobs=true|false
   *   pageSize=200
   */
  /**
  @Get('tgfixn')
  async getTgfixn(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: TgfixnQueryDto,
  ) {
    if (!authorization?.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Informe Authorization: Bearer <TOKEN>');
    }

    const token = authorization.substring('bearer '.length).trim();
    const includeClobs = (query.includeClobs ?? 'false') === 'true';
    const pageSize = query.pageSize ?? 200;

    const rows = await this.sankhyaService.listarTgfixnTudo({
      token,
      includeClobs,
      pageSize,
    });

    return {
      total: rows.length,
      data: rows,
    };
  }*/
}