import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class CloudflareR2Service {
    private s3Client: S3Client;
    private bucketName: string;
    private publicUrl: string;

    constructor(private configService: ConfigService) {
        const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
        const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
        
        this.bucketName = this.configService.get<string>('R2_BUCKET_NAME');
        this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL');

        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }

    async uploadFile(file: any, folder: string): Promise<string> {
        // Remove espaços e caracteres especiais do nome do arquivo
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${folder}/${Date.now()}-${cleanName}`;
        
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
            }),
        );

        // Retorna a URL pública completa para acesso
        return `${this.publicUrl}/${fileName}`;
    }

    async generatePresignedUrl(fileName: string, contentType: string, folder: string): Promise<{ uploadUrl: string, publicUrl: string }> {
        const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `${folder}/${Date.now()}-${cleanName}`;
        
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: contentType,
        });

        // Gera uma URL que expira em 1 hora (3600 segundos)
        const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

        return {
            uploadUrl,
            publicUrl: `${this.publicUrl}/${key}`,
        };
    }

    async deleteFile(url: string, folder: string): Promise<void> {
        // Extrai a chave (Key) da URL
        // Exemplo: url = https://pub-xxx.r2.dev/crm-anexos/file.pdf
        // publicUrl = https://pub-xxx.r2.dev
        
        const key = url.split(`${this.publicUrl}/`)[1];
        if (!key) return;

        await this.s3Client.send(
            new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            }),
        );
    }
}
