import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterPlayerBody, LoginPlayerBody } from "@workspace/api-zod";
import { createToken, requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterPlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, email, password, gameId } = parsed.data;

  const existing = await db
    .select({ id: playersTable.id })
    .from(playersTable)
    .where(eq(playersTable.email, email));

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const existingUsername = await db
    .select({ id: playersTable.id })
    .from(playersTable)
    .where(eq(playersTable.username, username));

  if (existingUsername.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [player] = await db
    .insert(playersTable)
    .values({ username, email, passwordHash, gameId })
    .returning();

  const token = createToken(player.id);

  res.status(201).json({
    token,
    player: {
      id: player.id,
      username: player.username,
      email: player.email,
      gameId: player.gameId,
      isAdmin: player.isAdmin,
      createdAt: player.createdAt,
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginPlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.email, email));

  if (!player) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, player.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = createToken(player.id);

  res.json({
    token,
    player: {
      id: player.id,
      username: player.username,
      email: player.email,
      gameId: player.gameId,
      isAdmin: player.isAdmin,
      createdAt: player.createdAt,
    },
  });
});

router.get("/auth/me", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const player = req.player!;
  const [fullPlayer] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, player.id));

  if (!fullPlayer) {
    res.status(401).json({ error: "Player not found" });
    return;
  }

  res.json({
    id: fullPlayer.id,
    username: fullPlayer.username,
    email: fullPlayer.email,
    gameId: fullPlayer.gameId,
    isAdmin: fullPlayer.isAdmin,
    createdAt: fullPlayer.createdAt,
  });
});

export default router;
