import {
  Controller,
  Post,
  Get,
  Param,
  Delete,
  Req,
  Request,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express'; 
import { AuthGuard } from 'src/auth/auth.guard';
import { DocumentsService } from './document.service';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) {}

  @UseGuards(AuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @UploadedFile() image: Express.Multer.File,
    @Request() req: any,
    ) {
        return await this.documentsService.create({
            image,
            userId: req.user.id,
        });
  }

  @UseGuards(AuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Req() req: any) {
    const userId = req.user.id; 
    return this.documentsService.findAllByUser(userId);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.documentsService.findOne(id, userId);
  }

  @UseGuards(AuthGuard)
  @Get('/download/:id')
  @HttpCode(HttpStatus.OK)
  async downloadDocument(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.id;

    const pdfBuffer = await this.documentsService.download(id, userId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Download-${Date.now()}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    return res.send(Buffer.from(pdfBuffer)); 
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteById(@Param('id') id: string) {
    await this.documentsService.delete(id);
    return;
  }


  
}
