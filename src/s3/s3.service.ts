import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>('MINIO_BUCKET_NAME') ?? 'posts';
    this.publicUrl =
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      'http://localhost:9000';

    this.s3 = new S3Client({
      region: 'us-east-1', // qualquer valor dummy para MinIO
      endpoint:
        this.configService.get<string>('MINIO_ENDPOINT') ??
        'http://localhost:9000',
      credentials: {
        accessKeyId:
          this.configService.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
        secretAccessKey:
          this.configService.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
      },
      forcePathStyle: true,
    });

    this.logger.log('S3Client criado com config:', {
      endpoint: this.s3.config.endpoint,
      region: this.s3.config.region,
      bucket: this.bucketName,
    });
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      pdf: 'application/pdf',
      txt: 'text/plain',
    };
    return types[ext!] ?? 'application/octet-stream';
  }

  private async createBucketIfNotExists(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucketName }));
    } catch {
      this.logger.warn(
        `Bucket "${this.bucketName}" não encontrado. Criando...`,
      );
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucketName }));
      await this.setPublicBucketPolicy();
      this.logger.log(
        `Bucket "${this.bucketName}" criado com política pública.`,
      );
    }
  }

  private async setPublicBucketPolicy(): Promise<void> {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`],
        },
      ],
    };

    await this.s3.send(
      new PutBucketPolicyCommand({
        Bucket: this.bucketName,
        Policy: JSON.stringify(policy),
      }),
    );
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    await this.createBucketIfNotExists();

    const key = `${randomUUID()}-${file.originalname}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: this.getContentType(file.originalname),
        }),
      );

      return `${this.publicUrl}/${this.bucketName}/${key}`;
    } catch (error) {
      this.logger.error('Erro ao subir arquivo para MinIO:', error);
      throw new Error('Falha no upload para o MinIO');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Erro ao deletar arquivo "${key}" do bucket "${this.bucketName}"`,
        error,
      );
      throw new Error('Falha ao deletar arquivo do MinIO');
    }
  }
}
