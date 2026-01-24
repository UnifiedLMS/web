import { z } from 'zod';
import { loginRequestSchema, authResponseSchema, tokenCheckSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  serverError: z.object({
    message: z.string(),
  })
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/proxy/auth/login',
      input: loginRequestSchema,
      responses: {
        200: authResponseSchema,
        401: errorSchemas.unauthorized,
        500: errorSchemas.serverError
      },
    },
    loginGoogle: {
      method: 'GET' as const,
      path: '/api/proxy/api/v1/auth/login/google',
      responses: {
        500: errorSchemas.serverError
      }
    },
    checkToken: {
      method: 'POST' as const,
      path: '/api/proxy/auth/token',
      input: tokenCheckSchema,
      responses: {
        200: authResponseSchema,
        401: errorSchemas.unauthorized,
        500: errorSchemas.serverError
      }
    },
    googleExchange: {
      method: 'POST' as const,
      path: '/api/proxy/api/v1/auth/google',
      input: tokenCheckSchema,
      responses: {
        200: authResponseSchema,
        401: errorSchemas.unauthorized,
        500: errorSchemas.serverError
      }
    }
  }
};
