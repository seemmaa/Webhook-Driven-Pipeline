import { Router } from "express";
import { receiveWebhook } from "./webhooks.controller";

const router = Router();

router.post("/:key", receiveWebhook);

export default router;
