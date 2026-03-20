import { Router } from "express";
import { getJobs, getJobById, getJobsByPipeline } from "./jobs.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/",authMiddleware, getJobs);
router.get("/:id", authMiddleware, getJobById);
router.get("/pipeline/:pipelineId",authMiddleware, getJobsByPipeline);

export default router;
