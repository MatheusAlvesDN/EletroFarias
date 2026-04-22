import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { DfariasOrcamentosService } from './dfarias-orcamentos.service';
import { CreateDfariasOrcamentoDto } from './dto/create-dfarias-orcamento.dto';

@Controller('dfarias/orcamentos')
export class DfariasOrcamentosController {
  constructor(private readonly service: DfariasOrcamentosService) {}

  @Post()
  gravar(@Body() dto: CreateDfariasOrcamentoDto) {
    return this.service.gravar(dto);
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