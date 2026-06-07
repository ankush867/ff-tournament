import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import matchesRouter from "./matches";
import registrationsRouter from "./registrations";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(matchesRouter);
router.use(registrationsRouter);
router.use(statsRouter);

export default router;
