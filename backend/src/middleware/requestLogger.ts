import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

function resolveIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "unknown";
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = randomUUID();
  const ip = resolveIp(req);

  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    console.log(
      JSON.stringify({
        type: "http_request",
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip,
        userAgent: req.headers["user-agent"] || "unknown",
        timestamp: new Date().toISOString(),
      })
    );
  });

  next();
}
