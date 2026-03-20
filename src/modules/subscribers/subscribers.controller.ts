import { Request, Response } from "express";
import { db } from "../../db";
import { subscribers } from "../../db/schema";
import { eq } from "drizzle-orm";

export const addSubscriber = async (req: Request, res: Response) => {

  const { pipelineId } = req.params;
  const { url } = req.body;

  const pipelineIdStr = Array.isArray(pipelineId) ? pipelineId[0] : pipelineId;

  const result = await db.insert(subscribers).values({
    pipelineId: pipelineIdStr,
    url
  }).returning();

  res.json(result[0]);
};

export const getSubscribersByPipeline = async (req: Request, res: Response) => {
  const { pipelineId } = req.params;
  const pipelineIdStr = Array.isArray(pipelineId) ? pipelineId[0] : pipelineId;

  const result = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.pipelineId, pipelineIdStr));

  res.json(result);
};
