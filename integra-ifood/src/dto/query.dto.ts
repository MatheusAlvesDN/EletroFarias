import { IsBooleanString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TgfixnQueryDto {
  @IsOptional()
  @IsBooleanString()
  includeClobs?: string; // "true" | "false"

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(1000)
  pageSize?: number;
}