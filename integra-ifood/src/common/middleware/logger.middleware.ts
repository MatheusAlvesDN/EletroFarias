import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, originalUrl } = request;
    const userAgent = request.get('user-agent') || '';

    // Tenta pegar o IP real se estiver atrás de um proxy (como o Render)
    const realIp = request.headers['x-forwarded-for'] || ip;

    response.on('finish', () => {
      const { statusCode } = response;
      this.logger.log(
        `${method} ${originalUrl} ${statusCode} - IP: ${realIp} - UA: ${userAgent}`,
      );
    });

    next();
  }
}
