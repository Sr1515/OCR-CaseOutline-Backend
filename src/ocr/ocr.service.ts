import { Injectable, Logger } from '@nestjs/common';
import { createWorker, PSM } from 'tesseract.js';
import * as sharp from 'sharp';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async runOcr(
    input: Buffer,
    opts?: { lang?: string; numericOnly?: boolean }
  ) {
    const lang = opts?.lang ?? 'por';

    const preprocessed = await sharp(input)
      .resize({ width: 1000 }) 
      .grayscale()
      .normalize() 
      .threshold(160) 
      .toFormat('png')
      .median()
      .toBuffer();


    const worker = await createWorker(
      lang,
      undefined,
      { cacheMethod: 'read_write' }
    );

    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        ...(opts?.numericOnly
          ? { tessedit_char_whitelist: '0123456789' }
          : {}),
      });

      const { data } = await worker.recognize(preprocessed);

      const cleanText = data.text
        .replace(/[^\S\r\n]+/g, ' ')        
        .replace(/ ?([.,:;!?])/g, '$1')     
        .replace(/\n{2,}/g, '\n')           
        .replace(/-\s*\n/g, '')             
        .replace(/\n/g, ' ')                
        .replace(/ {2,}/g, ' ')             
        .trim();

      return {
        text: cleanText,
        confidence: data.confidence,
        blocks: data.blocks?.length ?? 0,
      };

    } finally {
      await worker.terminate();
    }
  }
}
