import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET_NAME');

    this.s3 = new S3Client({
      region: 'us-east-1', // pode ser qualquer região
      endpoint: this.configService.get<string>('MINIO_ENDPOINT'), // ex: http://bucket-production-ec22.up.railway.app
      credentials: {
        accessKeyId: this.configService.get<string>('MINIO_ACCESS_KEY'),
        secretAccessKey: this.configService.get<string>('MINIO_SECRET_KEY'),
      },
      forcePathStyle: true, // ESSENCIAL para funcionar com MinIO
    });

    this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      this.logger.warn(`Bucket "${this.bucket}" não encontrado. Criando...`);
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" criado com sucesso.`);
      } catch (createError) {
        this.logger.error(`Erro ao criar o bucket: ${createError}`);
      }
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const key = `${randomUUID()}-${file.originalname}`;
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      return key;
    } catch (error) {
      this.logger.error(`Erro ao fazer upload no S3: ${error}`);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`Erro ao deletar arquivo no S3: ${error}`);
      throw error;
    }
  }
}
