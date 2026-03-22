import { Request, Response, NextFunction } from "express";
import { getUserRoleScopes } from "../services/governance";

/**
 * Middleware that restricts access to admin users only.
 * Must be used after authMiddleware, which attaches req.isAdmin.
 */
export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void | Promise<void> {
  const run = async (): Promise<void> => {
    if ((req as any).isAdmin) {
      next();
      return;
    }

    const userId = (req as any).userId as string | undefined;
    if (!userId) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const scopes = await getUserRoleScopes(userId);
    (req as any).adminScopes = scopes;
    if (scopes.length === 0) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    next();
  };

  void run().catch((error) => {
    console.error("Error validating admin role:", error);
    res.status(500).json({ error: "Failed to validate admin role" });
  });
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if ((req as any).isAdmin) {
      next();
      return;
    }

    const scopes = ((req as any).adminScopes as string[] | undefined) || [];
    if (!scopes.includes(scope)) {
      res.status(403).json({ error: `Admin scope required: ${scope}` });
      return;
    }

    next();
  };
}
