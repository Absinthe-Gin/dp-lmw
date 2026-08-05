import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 does not catch rejected promises thrown inside an async route
 * handler — an unhandled DB/network error (e.g. Supabase hiccups) becomes
 * an unhandled promise rejection, which crashes the whole Node process
 * instead of just failing that one request. Wrap every async handler with
 * this so errors reach Express's error middleware (server.ts) as a normal
 * 500 response.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
