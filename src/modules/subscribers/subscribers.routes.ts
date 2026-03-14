import { Router } from "express";
import { addSubscriber } from "./subscribers.controller";

const router = Router();

router.post("/:pipelineId", addSubscriber);

export default router;
