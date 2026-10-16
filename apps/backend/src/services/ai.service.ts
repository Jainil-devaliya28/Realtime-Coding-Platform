// ============================================================
// AI SERVICE - OpenAI integration for debugging assistant
// ============================================================

import OpenAI from 'openai';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { logger } from '../utils/logger';
import { aiRequestDuration, aiRequestTotal } from '../config/metrics';
import { AIMessage } from '@code-platform/shared';
import { AppError } from '../middleware/error.middleware';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!config.OPENAI_API_KEY) {
    throw new AppError('OpenAI API key not configured', 503, 'AI_UNAVAILABLE');
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are an expert programming assistant embedded in a collaborative code editor platform. Your role is to:

1. **Debug code errors**: Analyze error messages and provide clear explanations and fixes
2. **Explain code**: Break down complex code into understandable explanations  
3. **Optimize code**: Suggest performance improvements and best practices
4. **Generate test cases**: Create comprehensive test cases for functions
5. **Analyze complexity**: Provide time and space complexity analysis

Be concise, precise, and educational. Format code blocks with proper markdown. When suggesting fixes, explain WHY the fix works.

Supported languages: Python, JavaScript, C++, Java, Verilog.`;

export type AIRequestType = 'debug' | 'explain' | 'optimize' | 'test' | 'ask';

export class AIService {
  async createConversation(roomId: string, userId: string): Promise<string> {
    const conversation = await prisma.aIConversation.create({
      data: {
        roomId,
        userId,
        messages: [],
      },
    });
    return conversation.id;
  }

  async ask(
    userId: string,
    roomId: string,
    options: {
      message: string;
      code?: string;
      error?: string;
      conversationId?: string;
    },
    onChunk: (chunk: string) => void
  ): Promise<{ conversationId: string; response: string }> {
    const openai = getOpenAI();
    const timer = aiRequestDuration.startTimer({ type: 'ask' });

    try {
      // Get or create conversation
      let conversationId = options.conversationId;
      let existingMessages: AIMessage[] = [];

      if (conversationId) {
        const conv = await prisma.aIConversation.findFirst({
          where: { id: conversationId, userId, roomId },
        });
        if (conv) {
          existingMessages = (conv.messages as unknown as AIMessage[]) || [];
        } else {
          conversationId = undefined;
        }
      }

      if (!conversationId) {
        conversationId = await this.createConversation(roomId, userId);
      }

      // Build context message
      let userMessage = options.message;
      if (options.code) {
        userMessage += `\n\n**Code:**\n\`\`\`\n${options.code}\n\`\`\``;
      }
      if (options.error) {
        userMessage += `\n\n**Error:**\n\`\`\`\n${options.error}\n\`\`\``;
      }

      // Build messages array for API
      const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...existingMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      // Stream response
      const stream = await openai.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages: apiMessages,
        stream: true,
        max_tokens: 2000,
        temperature: 0.7,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullResponse += delta;
          onChunk(delta);
        }
      }

      // Save conversation
      const updatedMessages: AIMessage[] = [
        ...existingMessages,
        { role: 'user', content: userMessage, timestamp: new Date() },
        { role: 'assistant', content: fullResponse, timestamp: new Date() },
      ];

      // Keep last 20 messages to avoid token limits
      const trimmedMessages = updatedMessages.slice(-20);

      await prisma.aIConversation.update({
        where: { id: conversationId },
        data: {
          messages: trimmedMessages as any,
          updatedAt: new Date(),
        },
      });

      aiRequestTotal.inc({ type: 'ask', status: 'success' });
      timer({ type: 'ask' });

      return { conversationId, response: fullResponse };
    } catch (error) {
      aiRequestTotal.inc({ type: 'ask', status: 'error' });
      logger.error('AI request failed', { error, userId });
      throw error;
    }
  }

  async explainCode(code: string, language: string): Promise<string> {
    const openai = getOpenAI();
    const timer = aiRequestDuration.startTimer({ type: 'explain' });

    try {
      const response = await openai.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Please explain this ${language} code step by step:\n\n\`\`\`${language}\n${code}\n\`\`\``,
          },
        ],
        max_tokens: 1500,
      });

      aiRequestTotal.inc({ type: 'explain', status: 'success' });
      timer({ type: 'explain' });

      return response.choices[0]?.message?.content || 'Unable to generate explanation';
    } catch (error) {
      aiRequestTotal.inc({ type: 'explain', status: 'error' });
      throw error;
    }
  }

  async analyzeError(code: string, error: string, language: string): Promise<string> {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `I have this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nAnd I'm getting this error:\n\`\`\`\n${error}\n\`\`\`\n\nPlease explain the error and provide a fix.`,
        },
      ],
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content || 'Unable to analyze error';
  }

  async generateTests(code: string, language: string): Promise<string> {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Generate comprehensive test cases for this ${language} code. Include edge cases, boundary conditions, and normal cases:\n\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      ],
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || 'Unable to generate tests';
  }

  async optimizeCode(code: string, language: string): Promise<string> {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze and optimize this ${language} code. Explain time/space complexity and suggest improvements:\n\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      ],
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || 'Unable to optimize code';
  }

  async getConversationHistory(conversationId: string, userId: string) {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) throw new AppError('Conversation not found', 404);

    return conversation;
  }

  async getUserConversations(userId: string, roomId: string) {
    return prisma.aIConversation.findMany({
      where: { userId, roomId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }
}

export const aiService = new AIService();
