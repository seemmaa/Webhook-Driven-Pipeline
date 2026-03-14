import { Router } from "express";
import { getJobs, getJobById, getJobsByPipeline } from "./jobs.controller";

const router = Router();

router.get("/", getJobs);
router.get("/:id", getJobById);
router.get("/pipeline/:pipelineId", getJobsByPipeline);

export default router;
