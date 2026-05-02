import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geoboostRouter from "./geoboost";

const router: IRouter = Router();

router.use(healthRouter);
router.use(geoboostRouter);

export default router;
