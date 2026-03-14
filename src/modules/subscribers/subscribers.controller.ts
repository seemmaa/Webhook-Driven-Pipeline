import { Request, Response } from "express";
import { db } from "../../db";
import { subscribers } from "../../db/schema";

export const addSubscriber = async (req: Request, res: Response) => {

  const { pipelineId } = req.params;
  const { url } = req.body;

  // Ensure pipelineId is a string
  const pipelineIdStr = Array.isArray(pipelineId) ? pipelineId[0] : pipelineId;

  const result = await db.insert(subscribers).values({
    pipelineId: pipelineIdStr,
    url
  }).returning();

  res.json(result[0]);
};
