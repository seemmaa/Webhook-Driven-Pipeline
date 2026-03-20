import { Router } from "express";
import { addSubscriber, getSubscribersByPipeline } from "./subscribers.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/:pipelineId", authMiddleware, addSubscriber);
router.get("/:pipelineId", authMiddleware, getSubscribersByPipeline);

export default router;
