import { getDatabase } from "./database/client";
export async function allow(key: string, limit: number, seconds = 900) {
 const rows = await getDatabase().$queryRaw<{ count: number }[]>`
 INSERT INTO "RateBucket" (key,count,"expiresAt") VALUES (${key},1,NOW()+${seconds}*INTERVAL '1 second')
 ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "RateBucket"."expiresAt"<NOW() THEN 1 ELSE "RateBucket".count+1 END,
 "expiresAt"=CASE WHEN "RateBucket"."expiresAt"<NOW() THEN NOW()+${seconds}*INTERVAL '1 second' ELSE "RateBucket"."expiresAt" END
 RETURNING count`;
 return rows[0].count <= limit;
}
