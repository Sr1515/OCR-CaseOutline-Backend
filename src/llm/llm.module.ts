import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmController } from './llm.controller';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/document.service';
import { OcrModule } from '../ocr/ocr.module';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [S3Module, OcrModule],
  controllers: [LlmController],
  providers: [LlmService, PrismaService, DocumentsService],
})
export class LlmModule {}
