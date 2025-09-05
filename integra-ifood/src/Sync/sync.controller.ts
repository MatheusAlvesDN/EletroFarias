// sync.controller.ts
import {
  Controller,
  Post,
  Get,
  Query,
  BadRequestException,
  ParseIntPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);
  constructor(private readonly syncService: SyncService) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  async createCategoryById(@Query('id', ParseIntPipe) productId: number) {
    this.logger.debug(`createCategoryById id=${productId}`);
    return this.syncService.createCategoryByProdId(productId);
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  async deleteCategoryById(@Query('id', ParseIntPipe) productId: number) {
    this.logger.debug(`deleteCategoryById id=${productId}`);
    return this.syncService.deleteCategoryByProdId(productId);
  }

  @Post('updateEAN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateEAN(): Promise<void> {
    await this.syncService.teste();
  }

  @Get('categories')
  async getAllCategories() {
    return this.syncService.getAllCategories();
  }

  @Get('product-location')
  async getProductLocation(@Query('id', ParseIntPipe) id: number) {
    return this.syncService.getProductLocation(id);
  }

  @Post('product-location')
  async updateProductLocation(
    @Query('id', ParseIntPipe) id: number,
    @Query('location') location: string,
  ) {
    if (!location?.trim()) {
      throw new BadRequestException('Parâmetro "location" é obrigatório.');
    }
    return this.syncService.updateProductLocation(id, location);
  }
}

@Controller('login')
export class AuthController {
  constructor(private readonly syncService: SyncService) {}

  // Dica: prefira POST com body (evita log/caches com query sensível)
  @Post('send')
  async sendAuth(@Query('auth', ParseIntPipe) auth: string) {
    return this.syncService.sendAuth(auth);
  }
}
