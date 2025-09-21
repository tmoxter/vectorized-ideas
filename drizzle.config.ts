import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./packages/db/src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // used only by drizzle-kit generate (we'll apply SQL via Supabase)
    url: process.env.DATABASE_URL as string
  },
  strict: true,
  verbose: true
});