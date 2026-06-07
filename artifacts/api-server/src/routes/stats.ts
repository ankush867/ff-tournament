import { Router, type IRouter } from "express";
import { db, matchesTable, registrationsTable, playersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const [totalMatches] = await db.select({ value: count() }).from(matchesTable);
  const [upcomingMatches] = await db.select({ value: count() }).from(matchesTable).where(eq(matchesTable.status, "upcoming"));
  const [liveMatches] = await db.select({ value: count() }).from(matchesTable).where(eq(matchesTable.status, "live"));
  const [completedMatches] = await db.select({ value: count() }).from(matchesTable).where(eq(matchesTable.status, "completed"));
  const [totalPlayers] = await db.select({ value: count() }).from(playersTable);
  const [totalRegistrations] = await db.select({ value: count() }).from(registrationsTable);
  const [soloMatches] = await db.select({ value: count() }).from(matchesTable).where(eq(matchesTable.type, "solo"));
  const [duoMatches] = await db.select({ value: count() }).from(matchesTable).where(eq(matchesTable.type, "duo"));
  const [squadMatches] = await db.select({ value: count() }).from(matchesTable).where(eq(matchesTable.type, "squad"));

  res.json({
    totalMatches: totalMatches.value,
    upcomingMatches: upcomingMatches.value,
    liveMatches: liveMatches.value,
    completedMatches: completedMatches.value,
    totalPlayers: totalPlayers.value,
    totalRegistrations: totalRegistrations.value,
    soloMatches: soloMatches.value,
    duoMatches: duoMatches.value,
    squadMatches: squadMatches.value,
  });
});

export default router;
