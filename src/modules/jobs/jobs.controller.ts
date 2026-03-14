import { Request, Response } from "express";
import { db } from "../../db";
import { jobs } from "../../db/schema";
import { eq } from "drizzle-orm";

export const getJobs = async (req: Request, res: Response) => {
  const result = await db.select().from(jobs).orderBy(jobs.createdAt);
  res.json(result);
};

export const getJobById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const idStr = Array.isArray(id) ? id[0] : id;
  
  const result = await db.select().from(jobs).where(eq(jobs.id, idStr));
  
  if (result.length === 0) {
    return res.status(404).json({ message: "Job not found" });
  }
  
  res.json(result[0]);
};

export const getJobsByPipeline = async (req: Request, res: Response) => {
  const { pipelineId } = req.params;
  const pipelineIdStr = Array.isArray(pipelineId) ? pipelineId[0] : pipelineId;
  
  const result = await db
    .select()
    .from(jobs)
    .where(eq(jobs.pipelineId, pipelineIdStr))
    .orderBy(jobs.createdAt);
  
  res.json(result);
};
