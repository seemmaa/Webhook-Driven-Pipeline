import { Worker } from "bullmq";
import axios from "axios";
import { db } from "../db";
import { subscribers, jobs, pipelines } from "../db/schema";
import { eq } from "drizzle-orm";

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

interface ProcessPayload {
  pipelineId: string;
  payload: Record<string, unknown>;
}

const processingActions = {
  transform: async (data: Record<string, unknown>, options?: Record<string, unknown>) => {
    const transformation = (options?.transformation as string) || "uppercase";
    
    if (transformation === "uppercase") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = typeof value === "string" ? value.toUpperCase() : value;
      }
      return result;
    }
    
    if (transformation === "lowercase") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = typeof value === "string" ? value.toLowerCase() : value;
      }
      return result;
    }
    
    if (transformation === "compact") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && value !== "") {
          result[key] = value;
        }
      }
      return result;
    }
    
    return data;
  },

  filter: async (data: Record<string, unknown>, options?: Record<string, unknown>) => {
    const fields = (options?.fields as string[]) || [];
    
    if (fields.length === 0) return data;
    
    const result: Record<string, unknown> = {};
    for (const field of fields) {
      if (field in data) {
        result[field] = data[field];
      }
    }
    return result;
  },

  enrich: async (data: Record<string, unknown>, options?: Record<string, unknown>) => {
    const enrichments = options || {};
    
    return {
      ...data,
      ...enrichments,
      _enriched: true,
      _enrichedAt: new Date().toISOString()
    };
  },

  slack: async (data: Record<string, unknown>, options?: Record<string, unknown>) => {
    const title = (options?.title as string) || "Webhook Received";
    const emoji = (options?.emoji as string) || ":incoming_envelope:";
    const color = (options?.color as string) || "#36a64f";
    
    const fields = Object.entries(data).map(([key, value]) => ({
      type: "mrkdwn" as const,
      text: `*${formatSlackText(key)}:* ${formatSlackText(String(value))}`
    }));
    
    const blocks = [
      {
        type: "header" as const,
        text: {
          type: "plain_text" as const,
          text: `${emoji} ${title}`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: fields.slice(0, 10)
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Processed:* <!date^${Math.floor(Date.now()/1000)}^{date_short_pretty} {time}|now>`
          }
        ]
      }
    ];
    
    return {
      blocks,
      text: `${emoji} ${title}`,
      attachments: [
        {
          color: color,
          blocks: blocks
        }
      ]
    };
  }
};

function formatSlackText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/_/g, "\_")
    .replace(/\*/g, "\\*")
    .replace(/~/g, "\\~");
}

async function updateJobStatus(jobId: string, status: string) {
  await db.update(jobs)
    .set({ status })
    .where(eq(jobs.id, jobId));
}

async function deliverToSubscribers(pipelineId: string, processedData: Record<string, unknown>) {
  const subs = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.pipelineId, pipelineId));

  const results = [];

  for (const sub of subs) {
    let attempts = 0;
    let success = false;

    while (attempts < MAX_RETRIES && !success) {
      try {
        await axios.post(sub.url, processedData, {
          timeout: 10000,
          headers: { "Content-Type": "application/json" }
        });
        success = true;
        results.push({ url: sub.url, status: "success" });
      } catch (err) {
        attempts++;
        if (attempts < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempts));
        }
      }
    }

    if (!success) {
      results.push({ url: sub.url, status: "failed", attempts });
    }
  }

  return results;
}

const worker = new Worker(
  "jobs",
  async (job) => {
    const { pipelineId, payload, jobId } = job.data as ProcessPayload & { jobId: string };

    await updateJobStatus(jobId, "processing");

    const pipeline = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, pipelineId));

    if (!pipeline.length) {
      await updateJobStatus(jobId, "failed");
      throw new Error("Pipeline not found");
    }

    const actionType = pipeline[0].actionType;
    const options = pipeline[0].options as Record<string, unknown> || {};
    const actionFn = processingActions[actionType as keyof typeof processingActions];

    if (!actionFn) {
      await updateJobStatus(jobId, "failed");
      throw new Error(`Unknown action type: ${actionType}`);
    }

    const processedData = await actionFn(payload, options);

    const deliveryResults = await deliverToSubscribers(pipelineId, processedData);

    const hasFailures = deliveryResults.some(r => r.status === "failed");
    await updateJobStatus(jobId, hasFailures ? "partial_failure" : "completed");

    return { processedData, deliveryResults };
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379
    },
    concurrency: 5
  }
);

worker.on("completed", job => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on("error", err => {
  console.error("Worker error:", err);
});

export default worker;
