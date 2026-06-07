import { Router, type IRouter } from "express";
import { db, matchesTable, registrationsTable, playersTable } from "@workspace/db";
import { eq, count, and, sql } from "drizzle-orm";
import {
  ListMatchesQueryParams,
  CreateMatchBody,
  GetMatchParams,
  UpdateMatchParams,
  UpdateMatchBody,
  DeleteMatchParams,
} from "@workspace/api-zod";
import { requireAdmin, requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/matches", async (req, res): Promise<void> => {
  const params = ListMatchesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.type) {
    conditions.push(eq(matchesTable.type, params.data.type));
  }
  if (params.data.status) {
    conditions.push(eq(matchesTable.status, params.data.status));
  }

  const matches = await db
    .select()
    .from(matchesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(matchesTable.scheduledAt);

  const matchesWithCount = await Promise.all(
    matches.map(async (match) => {
      const [{ value }] = await db
        .select({ value: count() })
        .from(registrationsTable)
        .where(eq(registrationsTable.matchId, match.id));
      return { ...match, registeredCount: value };
    })
  );

  res.json(matchesWithCount);
});

router.post("/matches", requireAdmin as any, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateMatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, maxPlayers } = parsed.data;

  const entryFee = type === "solo" ? 10 : type === "duo" ? 20 : 40;
  const finalMaxPlayers = maxPlayers ?? 18;

  const [match] = await db
    .insert(matchesTable)
    .values({
      ...parsed.data,
      entryFee,
      maxPlayers: finalMaxPlayers,
      scheduledAt: new Date(parsed.data.scheduledAt),
    })
    .returning();

  res.status(201).json({ ...match, registeredCount: 0 });
});

router.get("/matches/:id", async (req, res): Promise<void> => {
  const params = GetMatchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [match] = await db
    .select()
    .from(matchesTable)
    .where(eq(matchesTable.id, params.data.id));

  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const regs = await db
    .select({
      id: registrationsTable.id,
      matchId: registrationsTable.matchId,
      playerId: registrationsTable.playerId,
      teamName: registrationsTable.teamName,
      paymentStatus: registrationsTable.paymentStatus,
      rank: registrationsTable.rank,
      registeredAt: registrationsTable.registeredAt,
      playerUsername: playersTable.username,
      playerGameId: playersTable.gameId,
    })
    .from(registrationsTable)
    .innerJoin(playersTable, eq(registrationsTable.playerId, playersTable.id))
    .where(eq(registrationsTable.matchId, match.id));

  res.json({ ...match, registeredCount: regs.length, registrations: regs });
});

router.patch("/matches/:id", requireAdmin as any, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateMatchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateMatchBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...body.data };
  if (body.data.scheduledAt) {
    updateData.scheduledAt = new Date(body.data.scheduledAt);
  }

  const [match] = await db
    .update(matchesTable)
    .set(updateData)
    .where(eq(matchesTable.id, params.data.id))
    .returning();

  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const [{ value: registeredCount }] = await db
    .select({ value: count() })
    .from(registrationsTable)
    .where(eq(registrationsTable.matchId, match.id));

  res.json({ ...match, registeredCount });
});

router.delete("/matches/:id", requireAdmin as any, async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteMatchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [match] = await db
    .delete(matchesTable)
    .where(eq(matchesTable.id, params.data.id))
    .returning();

  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
