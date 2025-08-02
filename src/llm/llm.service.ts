// llm.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import fetch from 'node-fetch';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
      role?: string;
    };
    finishReason?: string;
    index?: number;
    safetyRatings?: Array<{ category: string; probability: string }>;
  }>;
  promptFeedback?: {
    safetyRatings?: Array<{ category: string; probability: string }>;
  };
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  constructor(private readonly prisma: PrismaService) {}

  private async callGemini(text: string, question: string): Promise<string> {
    const body = {
      contents: [
        {
          parts: [
            {
              text: `Texto: ${text}\nPergunta: ${question}`,
            },
          ],
        },
      ],
    };

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        this.logger.warn(`Gemini API retornou status ${res.status}`);
        return 'Não foi possível gerar uma resposta.';
      }

      const data = (await res.json()) as GeminiResponse;
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        this.logger.warn('Resposta vazia da Gemini API');
        return 'Não foi possível gerar uma resposta.';
      }

      return content;
    } catch (error) {
      this.logger.error('Erro ao chamar Gemini API:', error);
      throw new Error('Falha na comunicação com a API Gemini');
    }
  }

  async explainText(text: string, question: string): Promise<string> {
    return this.callGemini(text, question);
  }

  async createInteraction(
    documentId: string,
    question: string,
    answer: string,
  ) {
    try {
      return await this.prisma.interaction.create({
        data: {
          documentId,
          question,
          answer,
        },
      });
    } catch (error) {
      console.error('Erro ao criar interação:', error);
      throw error;
    }
  }
}
