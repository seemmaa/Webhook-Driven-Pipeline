import express from "express";
import path from "path";

import pipelineRoutes from "./modules/pipelines/pipelines.routes";
import subscriberRoutes from "./modules/subscribers/subscribers.routes";
import webhookRoutes from "./modules/webhooks/webhooks.routes";
import jobRoutes from "./modules/jobs/jobs.routes";
import authRoutes from "./modules/auth/auth.routes";
import limiter from "./modules/middleware/limiter.middleware";

const app = express();

app.use(express.json());
app.use(limiter);

app.use(express.static(path.join(__dirname, "../dashboard")));

app.use("/pipelines", pipelineRoutes);
app.use("/subscribers", subscriberRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/jobs", jobRoutes);
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../dashboard/index.html"));
});

export default app;
