import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { DfariasOrcamentosService } from './dfarias-orcamentos.service';

@Controller('dfarias/orcamentos')
export class DfariasOrcamentosController {
  constructor(private readonly service: DfariasOrcamentosService) {}

  @Post()
  gravar(@Body() body: any) {
    return this.service.gravar(body);
  }

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarPorId(id);
  }

  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.service.excluir(id);
  }
}
