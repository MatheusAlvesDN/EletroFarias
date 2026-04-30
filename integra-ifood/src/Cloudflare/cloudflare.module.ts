import { Module, Global } from '@nestjs/common';
import { CloudflareR2Service } from './r2.service';

@Global()
@Module({
    providers: [CloudflareR2Service],
    exports: [CloudflareR2Service],
})
export class CloudflareModule { }
