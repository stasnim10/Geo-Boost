import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geoboostRouter from "./geoboost";
import stripeRouter from "./stripe";
import auditsRouter from "./audits";
import monitorRouter from "./monitor";
import citationRouter from "./citation";
import eventsRouter from "./events";

const router: IRouter = Router();

router.use(healthRouter);
router.use(geoboostRouter);
router.use(stripeRouter);
router.use(auditsRouter);
router.use(monitorRouter);
router.use(citationRouter);
router.use(eventsRouter);

export default router;
