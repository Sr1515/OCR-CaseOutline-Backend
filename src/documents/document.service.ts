import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { Document, Interaction } from 'generated/prisma';
import { OcrService } from 'src/ocr/ocr.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly ocrService: OcrService,
  ) {}

  async create(data: {
    image: Express.Multer.File;
    userId: string;
  }): Promise<Document | null> {
    try {
      let documentUrl: string | undefined;

      if (data.image) {
        documentUrl = await this.s3.uploadFile(data.image);
      }

      const ocrResult = await this.ocrService.runOcr(data.image.buffer);

      return await this.prisma.document.create({
        data: {
          userId: data.userId,
          documentUrl,
          text: ocrResult.text,
        },
      });
    } catch (error) {
      this.logger.error('Erro ao criar documento', error.stack);
      throw new InternalServerErrorException('Erro ao criar documento');
    }
  }

  async findAllByUser(userId: string): Promise<Document[] | null> {
    try {
      return this.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao buscar documentos do usuário ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Erro ao buscar documentos');
    }
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<{ document: Document; interactions: Interaction[] }> {
    try {
      const docWithInteractions = await this.prisma.document.findFirst({
        where: { id, userId },
        include: {
          interactions: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!docWithInteractions) {
        throw new NotFoundException('Documento não encontrado');
      }

      return {
        document: {
          id: docWithInteractions.id,
          userId: docWithInteractions.userId,
          documentUrl: docWithInteractions.documentUrl,
          text: docWithInteractions.text,
          createdAt: docWithInteractions.createdAt,
        },
        interactions: docWithInteractions.interactions,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar documento ${id} do usuário ${userId}`,
        error.stack,
      );
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao buscar documento');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const existingDocument = await this.prisma.document.findUnique({
        where: { id },
      });

      if (!existingDocument) {
        throw new NotFoundException('Documento não encontrado');
      }

      if (existingDocument.documentUrl) {
        const key = existingDocument.documentUrl.split('/').pop();
        if (key) {
          await this.s3.deleteFile(key);
        }
      }

      await this.prisma.document.delete({ where: { id } });
    } catch (error) {
      console.error('Error ao deletar documento:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Error ao deletar documento');
    }
  }

  async download(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id, userId },
    });

    if (!document) {
      throw new Error('Documento não encontrado ou sem permissão');
    }

    const interactions = await this.prisma.interaction.findMany({
      where: { documentId: id },
      orderBy: { createdAt: 'asc' },
    });

    const pdfDoc = await PDFDocument.create();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 12;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const maxTextWidth = pageWidth - margin * 2;

    const pageImage = pdfDoc.addPage([pageWidth, pageHeight]);

    if (document.documentUrl) {
      try {
        const imgBytes = await fetch(document.documentUrl).then((res) =>
          res.arrayBuffer(),
        );

        let img;

        if (document.documentUrl.endsWith('.png')) {
          img = await pdfDoc.embedPng(imgBytes);
        } else {
          img = await pdfDoc.embedJpg(imgBytes);
        }

        const scale = Math.min(
          (pageWidth - margin * 2) / img.width,
          (pageHeight - margin * 2) / img.height,
          1,
        );

        const imgDims = img.scale(scale);

        pageImage.drawImage(img, {
          x: (pageWidth - imgDims.width) / 2,
          y: (pageHeight - imgDims.height) / 2,
          width: imgDims.width,
          height: imgDims.height,
        });
      } catch (e) {
        console.warn('Falha ao carregar imagem para o PDF', e);
      }
    }

    const pageText = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    function wrapText(
      text: string,
      font: any,
      fontSize: number,
      maxWidth: number,
    ): string[] {
      const words = text.split(' ');
      const lines = [];
      let line = '';

      for (const word of words) {
        const testLine = line ? line + ' ' + word : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > maxWidth) {
          if (line) lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    pageText.drawText('Texto OCR:', {
      x: margin,
      y: currentY,
      size: fontSize + 2,
      font,
      color: rgb(0, 0, 0),
    });

    currentY -= fontSize + 10;

    const ocrTextClean = (document.text || '').replace(/\r?\n|\r/g, ' ');
    const wrappedLines = wrapText(ocrTextClean, font, fontSize, maxTextWidth);

    for (const line of wrappedLines) {
      if (currentY < margin) {
        break;
      }
      pageText.drawText(line, {
        x: margin,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      currentY -= fontSize + 5;
    }

    let pageQA = pdfDoc.addPage([pageWidth, pageHeight]);
    currentY = pageHeight - margin;

    for (const interaction of interactions) {
      const questionText = `Q: ${interaction.question.replace(/\r?\n|\r/g, ' ')}`;
      const answerText = `A: ${interaction.answer.replace(/\r?\n|\r/g, ' ')}`;

      const questionLines = wrapText(
        questionText,
        fontBold,
        fontSize,
        maxTextWidth,
      );
      const answerLines = wrapText(answerText, font, fontSize, maxTextWidth);

      const neededSpace =
        (questionLines.length + answerLines.length) * (fontSize + 5) + 15;
      if (currentY - neededSpace < margin) {
        pageQA = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }

      for (const qLine of questionLines) {
        pageQA.drawText(qLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
        currentY -= fontSize + 5;
      }

      for (const aLine of answerLines) {
        pageQA.drawText(aLine, {
          x: margin + 10,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
        currentY -= fontSize + 5;
      }

      currentY -= 10;
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }
}
