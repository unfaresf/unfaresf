import type { Config } from "drizzle-kit";

export default {
  schema: "./db/gtfs-schema.ts",
  out: "./db/gtfs-migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.GTFS_DB_FILE_PATH!,
  },
} satisfies Config;
