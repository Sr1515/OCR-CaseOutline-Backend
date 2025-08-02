import {
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LlmService } from './llm.service';
import { DocumentsService } from '../documents/document.service';
import { AuthGuard } from 'src/auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('llm')
export class LlmController {
  constructor(
    private readonly llmService: LlmService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Post(':documentId')
  @HttpCode(HttpStatus.CREATED)
  async askQuestion(@Param('documentId') documentId: string, @Req() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    const question = req.body?.question;
    if (!question) {
      throw new NotFoundException('Pergunta não fornecida');
    }

    const doc = await this.documentsService.findOne(documentId, userId);

    if (!doc || !doc.document?.text) {
      throw new NotFoundException('Documento ou texto não encontrado');
    }

    const answer = await this.llmService.explainText(
      doc.document.text,
      question,
    );

    const interaction = await this.llmService.createInteraction(
      documentId,
      question,
      answer,
    );

    return {
      question,
      answer,
      interactionId: interaction.id,
    };
  }
}
