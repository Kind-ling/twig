/**
 * Twig Server — Middleware
 * CORS, body parsing, request logging, error handling.
 */

import type { Request, Response, NextFunction } from 'express';

export interface KindlingError extends Error {
  statusCode?: number;
}

/** CORS — allow all origins */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Kindling-Request-Id');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

/** Request logging to stderr — structured JSON */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = Math.random().toString(36).slice(2, 10);
  res.setHeader('X-Kindling-Request-Id', requestId);

  res.on('finish', () => {
    process.stderr.write(
      JSON.stringify({
        level: 'info',
        event: 'request',
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
      }) + '\n',
    );
  });

  next();
}

/** Error handler — never leaks stack traces */
export function errorHandler(
  err: KindlingError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;

  process.stderr.write(
    JSON.stringify({
      level: 'error',
      event: 'unhandled-error',
      message: err.message,
      statusCode,
    }) + '\n',
  );

  res.status(statusCode).json({
    data: null,
    error: { message: err.message ?? 'Internal server error' },
    meta: {},
  });
}
