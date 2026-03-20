import { Router } from "express";
import { createPipeline, getPipelines, getPipelineById, deletePipeline } from "./pipelines.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/",authMiddleware, createPipeline);
router.get("/",authMiddleware, getPipelines);
router.get("/:id",authMiddleware, getPipelineById);
router.delete("/:id", authMiddleware, deletePipeline);

export default router;
