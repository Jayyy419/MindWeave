import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "mindweave-dev-secret";

interface TokenPayload {
  userId: string;
}

/**
 * Middleware that extracts the anonymous user ID from the `x-anonymous-id` header.
 * If the user doesn't exist in the database yet, creates a new User record.
 * Attaches the internal user ID to `req.userId` for downstream use.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authorization = req.headers.authorization;

  if (authorization?.startsWith("Bearer ")) {
    try {
      const token = authorization.substring("Bearer ".length);
      const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) {
        res.status(401).json({ error: "Invalid authentication token" });
        return;
      }

      (req as any).userId = user.id;
      (req as any).username = user.username || `User-${user.id.substring(0, 6)}`;
      (req as any).isAdmin = Boolean((user as any).isAdmin);
      next();
      return;
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
  }

  // Backward-compatible anonymous mode for existing clients.
  const anonymousId = req.headers["x-anonymous-id"] as string | undefined;

  if (!anonymousId) {
    res.status(401).json({ error: "Missing authentication token" });
    return;
  }

  // Find or create the user based on anonymous ID
  let user = await prisma.user.findUnique({
    where: { anonymousId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { anonymousId },
    });
  }

  // Attach the internal user ID to the request object
  (req as any).userId = user.id;
  (req as any).username = user.username || `User-${user.id.substring(0, 6)}`;
  (req as any).isAdmin = Boolean((user as any).isAdmin);
  next();
}
