import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: any, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode: string | number = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const response = exception.getResponse() as any;
      message = typeof response === 'string' ? response : response.message || message;
    } else {
      // Handle non-HttpExceptions (like Supabase/PostgREST errors)
      message = exception.message || message;
      errorCode = exception.code || errorCode;

      // Extract status if it's a valid HTTP status number
      const status = exception.status || exception.statusCode;
      if (typeof status === 'number' && status >= 100 && status < 600) {
        httpStatus = status;
      } else if (typeof status === 'string' && /^\d+$/.test(status)) {
        const parsedStatus = parseInt(status, 10);
        if (parsedStatus >= 100 && parsedStatus < 600) {
          httpStatus = parsedStatus;
        }
      }
      
      // Log the error for debugging
      this.logger.error(`Exception caught: ${message}`, exception.stack);
    }

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message: message,
      code: errorCode,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
