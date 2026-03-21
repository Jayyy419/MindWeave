import { Request, Response, NextFunction } from "express";

/**
 * Middleware that restricts access to admin users only.
 * Must be used after authMiddleware, which attaches req.isAdmin.
 */
export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!(req as any).isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
