import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerConfig } from "@/config/server";
const globalDb = globalThis as unknown as { retrivraDb?: PrismaClient };
export function getDatabase() {
  if (!globalDb.retrivraDb) {
    globalDb.retrivraDb = new PrismaClient({
      adapter: new PrismaPg({ connectionString: getServerConfig().DATABASE_URL, connectionTimeoutMillis: 3000, query_timeout: 3000, max: 5 }),
    });
  }
  return globalDb.retrivraDb;
}
