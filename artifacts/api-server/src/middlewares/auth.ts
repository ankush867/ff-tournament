import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET ?? "freefire_secret_key_2024";

export interface AuthRequest extends Request {
  player?: {
    id: number;
    username: string;
    email: string;
    isAdmin: boolean;
  };
}

export function createToken(playerId: number): string {
  return jwt.sign({ playerId }, JWT_SECRET, { expiresIn: "30d" });
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { playerId: number };
    const [player] = await db
      .select({
        id: playersTable.id,
        username: playersTable.username,
        email: playersTable.email,
        isAdmin: playersTable.isAdmin,
      })
      .from(playersTable)
      .where(eq(playersTable.id, payload.playerId));

    if (!player) {
      res.status(401).json({ error: "Player not found" });
      return;
    }

    req.player = player;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    if (!req.player?.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
