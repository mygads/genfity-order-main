import * as dotenv from "dotenv";
import path from "path";
import { defineConfig } from "prisma/config";

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrate: {
    async url() {
      return process.env.DATABASE_URL || "";
    },
  },
});
