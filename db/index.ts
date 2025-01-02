import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure postgres with proper connection options
const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: 'require',
  connect_timeout: 10
});

export const db = drizzle(client, { schema });