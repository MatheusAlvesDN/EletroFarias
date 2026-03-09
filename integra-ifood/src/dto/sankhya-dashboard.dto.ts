import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class DashboardFiltrosDto {
  @IsString()
  P_TIPDATA: string; // 1: Dt Negociação, 2: Dt Movimento, etc.

  @IsDateString()
  P_PERIODO_INI: string;

  @IsDateString()
  P_PERIODO_FIN: string;

  @IsOptional()
  @IsString()
  P_LCTSCOMIMPOSTO?: string;

  @IsOptional()
  @IsNumber()
  P_CODEMP?: number;

  @IsOptional()
  @IsNumber()
  P_CODCFO?: number;

  // Adicione os demais campos (P_TIPMOV, P_STATUSNOTA, P_CODPARC, etc.) conforme a necessidade
}