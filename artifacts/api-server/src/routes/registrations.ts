import { Router, type IRouter } from "express";
import { db, matchesTable, registrationsTable, playersTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import {
  RegisterForMatchParams,
  RegisterForMatchBody,
  GetMatchRegistrationsParams,
  ConfirmRegistrationParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/matches/:id/register", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const params = RegisterForMatchParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const body = RegisterForMatchBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const playerId = req.player!.id;

  const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, params.data.id));
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  if (match.status !== "upcoming") { res.status(400).json({ error: "Registration is closed for this match" }); return; }

  const existing = await db.select({ id: registrationsTable.id }).from(registrationsTable)
    .where(and(eq(registrationsTable.matchId, params.data.id), eq(registrationsTable.playerId, playerId)));
  if (existing.length > 0) { res.status(409).json({ error: "Already registered for this match" }); return; }

  const [{ value: currentCount }] = await db.select({ value: count() }).from(registrationsTable)
    .where(eq(registrationsTable.matchId, params.data.id));
  if (currentCount >= match.maxPlayers) { res.status(400).json({ error: "Match is full" }); return; }

  const [reg] = await db.insert(registrationsTable).values({
    matchId: params.data.id,
    playerId,
    teamName: body.data.teamName ?? null,
  }).returning();

  const [player] = await db.select({ username: playersTable.username, gameId: playersTable.gameId })
    .from(playersTable).where(eq(playersTable.id, playerId));

  res.status(201).json({ ...reg, playerUsername: player.username, playerGameId: player.gameId });
});

router.patch("/registrations/:id/screenshot", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid registration id" }); return; }

  const { screenshot } = req.body as { screenshot: string };
  if (!screenshot || typeof screenshot !== "string") {
    res.status(400).json({ error: "screenshot (base64 data URL) is required" });
    return;
  }

  if (screenshot.length > 5 * 1024 * 1024) {
    res.status(400).json({ error: "Screenshot too large. Max 3MB." });
    return;
  }

  const playerId = req.player!.id;
  const [existing] = await db.select().from(registrationsTable)
    .where(and(eq(registrationsTable.id, id), eq(registrationsTable.playerId, playerId)));
  if (!existing) { res.status(404).json({ error: "Registration not found" }); return; }

  const [reg] = await db.update(registrationsTable)
    .set({ paymentScreenshot: screenshot })
    .where(eq(registrationsTable.id, id))
    .returning();

  res.json({ success: true, id: reg.id });
});

router.get("/matches/:id/registrations", async (req, res): Promise<void> => {
  const params = GetMatchRegistrationsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const regs = await db.select({
    id: registrationsTable.id,
    matchId: registrationsTable.matchId,
    playerId: registrationsTable.playerId,
    teamName: registrationsTable.teamName,
    paymentStatus: registrationsTable.paymentStatus,
    rank: registrationsTable.rank,
    registeredAt: registrationsTable.registeredAt,
    playerUsername: playersTable.username,
    playerGameId: playersTable.gameId,
  }).from(registrationsTable)
    .innerJoin(playersTable, eq(registrationsTable.playerId, playersTable.id))
    .where(eq(registrationsTable.matchId, params.data.id));

  res.json(regs);
});

router.patch("/admin/registrations/:id/rank", requireAdmin as any, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid registration id" }); return; }

  const { rank } = req.body as { rank: number | null };
  if (rank !== null && (typeof rank !== "number" || ![1, 2, 3].includes(rank))) {
    res.status(400).json({ error: "Rank must be 1, 2, or 3 (or null to clear)" });
    return;
  }

  const [reg] = await db.update(registrationsTable).set({ rank: rank ?? null })
    .where(eq(registrationsTable.id, id)).returning();
  if (!reg) { res.status(404).json({ error: "Registration not found" }); return; }

  const [player] = await db.select({ username: playersTable.username, gameId: playersTable.gameId })
    .from(playersTable).where(eq(playersTable.id, reg.playerId));

  res.json({ ...reg, playerUsername: player.username, playerGameId: player.gameId });
});

router.get("/my-registrations", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const playerId = req.player!.id;

  const regs = await db.select({
    id: registrationsTable.id,
    matchId: registrationsTable.matchId,
    playerId: registrationsTable.playerId,
    teamName: registrationsTable.teamName,
    paymentStatus: registrationsTable.paymentStatus,
    registeredAt: registrationsTable.registeredAt,
    playerUsername: playersTable.username,
    playerGameId: playersTable.gameId,
  }).from(registrationsTable)
    .innerJoin(playersTable, eq(registrationsTable.playerId, playersTable.id))
    .where(eq(registrationsTable.playerId, playerId));

  const regsWithMatch = await Promise.all(regs.map(async (reg) => {
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, reg.matchId));
    const [{ value: registeredCount }] = await db.select({ value: count() }).from(registrationsTable)
      .where(eq(registrationsTable.matchId, reg.matchId));
    return { ...reg, match: { ...match, registeredCount } };
  }));

  res.json(regsWithMatch);
});

router.get("/admin/registrations", requireAdmin as any, async (_req: AuthRequest, res): Promise<void> => {
  const regs = await db.select({
    id: registrationsTable.id,
    matchId: registrationsTable.matchId,
    playerId: registrationsTable.playerId,
    teamName: registrationsTable.teamName,
    paymentStatus: registrationsTable.paymentStatus,
    rank: registrationsTable.rank,
    paymentScreenshot: registrationsTable.paymentScreenshot,
    registeredAt: registrationsTable.registeredAt,
    playerUsername: playersTable.username,
    playerGameId: playersTable.gameId,
  }).from(registrationsTable)
    .innerJoin(playersTable, eq(registrationsTable.playerId, playersTable.id))
    .orderBy(registrationsTable.registeredAt);

  const regsWithMatch = await Promise.all(regs.map(async (reg) => {
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, reg.matchId));
    const [{ value: registeredCount }] = await db.select({ value: count() }).from(registrationsTable)
      .where(eq(registrationsTable.matchId, reg.matchId));
    return { ...reg, match: { ...match, registeredCount } };
  }));

  res.json(regsWithMatch);
});

router.patch("/admin/registrations/:id/confirm", requireAdmin as any, async (req: AuthRequest, res): Promise<void> => {
  const params = ConfirmRegistrationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [reg] = await db.update(registrationsTable)
    .set({ paymentStatus: "confirmed" })
    .where(eq(registrationsTable.id, params.data.id))
    .returning();
  if (!reg) { res.status(404).json({ error: "Registration not found" }); return; }

  const [player] = await db.select({ username: playersTable.username, gameId: playersTable.gameId })
    .from(playersTable).where(eq(playersTable.id, reg.playerId));

  res.json({ ...reg, playerUsername: player.username, playerGameId: player.gameId });
});

export default router;
