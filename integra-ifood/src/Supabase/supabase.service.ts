import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    let supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (supabaseUrl && supabaseKey) {
      // Remove trailing slash and /rest/v1/ if present
      supabaseUrl = supabaseUrl.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
      
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('Supabase initialized successfully at:', supabaseUrl);
    } else {
      console.warn('Supabase credentials missing. Supabase service will not be available.');
    }
  }

  async uploadFile(file: any, bucketName: string): Promise<string> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}-${file.originalname}`;
    
    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Retorna a URL pública do arquivo
    const { data: publicUrlData } = this.supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);

    return publicUrlData.publicUrl;
  }

  async deleteFile(url: string, bucketName: string): Promise<void> {
    if (!this.supabase) return;

    try {
      // Extrair o nome do arquivo da URL pública
      const filename = url.split('/').pop();
      if (filename) {
        await this.supabase.storage.from(bucketName).remove([filename]);
      }
    } catch (error) {
      console.error('Erro ao deletar arquivo no Supabase:', error);
    }
  }
}
