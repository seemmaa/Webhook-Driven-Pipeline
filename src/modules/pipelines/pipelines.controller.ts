import { Request, Response } from "express";
import crypto from "crypto";
import { db } from "../../db";
import { pipelines } from "../../db/schema";
import { eq } from "drizzle-orm";

export const createPipeline = async (req: Request, res: Response) => {
  try {
    const { name, actionType, options } = req.body;

    if (!name || !actionType) {
      return res.status(400).json({
        message: "name and actionType are required"
      });
    }

    const webhookKey = crypto.randomUUID().slice(0, 8);

    const result = await db.insert(pipelines).values({
      name,
      actionType,
      webhookKey,
      options: options || {}
    }).returning();

    const pipeline = result[0];

    const webhookUrl = `http://localhost:3000/webhooks/${webhookKey}`;

    res.status(201).json({
      pipeline,
      webhookUrl
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "failed to create pipeline"
    });
  }
};

export const getPipelines = async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(pipelines);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "failed to get pipelines" });
  }
};

export const getPipelineById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const result = await db.select().from(pipelines).where(eq(pipelines.id, idStr));
    
    if (result.length === 0) {
      return res.status(404).json({ message: "pipeline not found" });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "failed to get pipeline" });
  }
};

export const deletePipeline = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    
    const result = await db.delete(pipelines).where(eq(pipelines.id, idStr)).returning();
    
    if (result.length === 0) {
      return res.status(404).json({ message: "pipeline not found" });
    }
    
    res.json({ message: "pipeline deleted", pipeline: result[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "failed to delete pipeline" });
  }
};
