import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:  "postgresql://postgres:postgres@localhost:5432/webhook_db",
  },
} satisfies Config;
