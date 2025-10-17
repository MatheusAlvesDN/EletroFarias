import { Global, Module } from '@nestjs/common';
import { UsersService } from './prisma.service';

@Global()
@Module({
  providers: [UsersService]
})
export class UsersModule {}
