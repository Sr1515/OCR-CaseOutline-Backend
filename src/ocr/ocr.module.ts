import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';

@Module({
  providers: [OcrService],
  controllers: [],
  exports: [OcrService],
})
export class OcrModule {}