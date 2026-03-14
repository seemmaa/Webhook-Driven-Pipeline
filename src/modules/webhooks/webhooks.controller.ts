import { Request, Response } from "express";
import { db } from "../../db";
import { pipelines, jobs } from "../../db/schema";
import { jobQueue } from "../../config/queue";
import { eq } from "drizzle-orm";

export const receiveWebhook = async (req: Request, res: Response) => {

  const { key } = req.params;

  if (Array.isArray(key)) {
    return res.status(400).json({ message: "Invalid webhook key" });
  }

  const pipeline = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.webhookKey, key));

  if (!pipeline.length) {
    return res.status(404).json({ message: "pipeline not found" });
  }

  const jobResult = await db.insert(jobs).values({
    pipelineId: pipeline[0].id,
    payload: req.body,
    status: "pending"
  }).returning();

  const job = jobResult[0];

  await jobQueue.add("processWebhook", {
    pipelineId: pipeline[0].id,
    payload: req.body,
    jobId: job.id
  });

  res.json({ 
    status: "queued",
    jobId: job.id,
    message: "Webhook received and queued for processing"
  });
};
