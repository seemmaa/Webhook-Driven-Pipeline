import express from "express";

import pipelineRoutes from "./modules/pipelines/pipelines.routes";
import subscriberRoutes from "./modules/subscribers/subscribers.routes";
import webhookRoutes from "./modules/webhooks/webhooks.routes";
import jobRoutes from "./modules/jobs/jobs.routes";

const app = express();

app.use(express.json());

app.use("/pipelines", pipelineRoutes);
app.use("/subscribers", subscriberRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/jobs", jobRoutes);

export default app;
