import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geoboostRouter from "./geoboost";
import stripeRouter from "./stripe";
import auditsRouter from "./audits";
import monitorRouter from "./monitor";
import citationRouter from "./citation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(geoboostRouter);
router.use(stripeRouter);
router.use(auditsRouter);
router.use(monitorRouter);
router.use(citationRouter);

export default router;
