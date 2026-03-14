import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  const anonymousId = req.headers["x-anonymous-id"] as string | undefined;

  if (!anonymousId) {
    res
      .status(400)
      .json({ error: "Missing x-anonymous-id header" });
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
  next();
}
