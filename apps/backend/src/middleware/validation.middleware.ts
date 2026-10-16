// ============================================================
// VALIDATION MIDDLEWARE - Request validation using Zod
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validate(schema: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params) as typeof req.params;
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query) as typeof req.query;
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
        });
        return;
      }
      next(error);
    }
  };
}

// Common validation schemas
export const schemas = {
  auth: {
    signup: z.object({
      email: z.string().email('Invalid email format'),
      username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username too long')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password too long'),
    }),

    login: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required'),
    }),

    refreshToken: z.object({
      refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
  },

  room: {
    create: z.object({
      name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name too long'),
      description: z.string().max(500, 'Description too long').optional(),
      language: z.enum(['python', 'javascript', 'cpp', 'java', 'verilog']),
      isPublic: z.boolean().default(true),
    }),

    update: z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      language: z.enum(['python', 'javascript', 'cpp', 'java', 'verilog']).optional(),
      isPublic: z.boolean().optional(),
    }),

    id: z.object({
      id: z.string().uuid('Invalid room ID'),
    }),
  },

  execution: {
    run: z.object({
      code: z.string().min(1, 'Code is required').max(100000, 'Code too long'),
      language: z.enum(['python', 'javascript', 'cpp', 'java', 'verilog']),
      stdin: z.string().max(10000, 'Stdin too long').optional(),
    }),
  },

  ai: {
    ask: z.object({
      message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
      code: z.string().max(50000).optional(),
      error: z.string().max(5000).optional(),
      conversationId: z.string().uuid().optional(),
    }),
  },

  pagination: z.object({
    page: z.string().default('1').transform(Number),
    limit: z.string().default('10').transform(Number),
    search: z.string().optional(),
  }),
};
