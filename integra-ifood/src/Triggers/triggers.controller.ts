import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { z } from 'zod';
import { TriggersService } from './triggers.service';

import { TriggerConfig, TriggerKey } from './triggers.templates';

const TriggerConfigSchema = z.object({
  name: z.string(),
  codTipOper: z.number().int().positive(),
  codParcDiff: z.number().int().optional(),
  codParcDestIsZero: z.boolean().optional(),

  setCodEmp: z.number().int().optional(),
  setSerieNota: z.number().int().optional(),
  setCodParc: z.number().int().optional(),
  setCodParcDestFromCodParc: z.boolean().optional(),
  setCodModDocNota: z.number().int().optional(),
  setCodTipVenda: z.number().int().optional(),
});

@Controller('triggers')
export class TriggersController {
  constructor(private readonly svc: TriggersService) {}

  @Get()
  list() {
    return this.svc.listDefaults();
  }

  @Get(':name/preview')
  preview(@Param('name') name: TriggerKey) {
    const cfg = this.svc.getDefault(name);
    return { name, sql: this.svc.previewSql(cfg) };
  }

  @Put(':name/apply')
  async apply(@Param('name') name: TriggerKey, @Body() body: any) {
    const parsed = TriggerConfigSchema.parse({ ...body, name });
    return this.svc.apply(parsed as TriggerConfig);
  }
}
