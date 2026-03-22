import { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function resolveIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "unknown";
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix } = options;

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const ip = resolveIp(req);
    const now = Date.now();
    const key = `${keyPrefix}:${ip}`;
    const existing = buckets.get(key);

    if (!existing || now >= existing.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("retry-after", retryAfterSeconds.toString());
      res.status(429).json({
        error: "Too many requests. Please try again later.",
      });
      return;
    }

    existing.count += 1;
    buckets.set(key, existing);
    next();
  };
}
