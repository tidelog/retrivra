import { getDatabase } from "@/server/database/client";
import { readiness } from "@/server/health/status";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const result = await readiness(async () => {
    const db = getDatabase();
    const extensions = await db.$queryRaw<{ extversion: string }[]>`SELECT extversion FROM pg_extension WHERE extname = 'vector'`;
    if (extensions.length !== 1) throw new Error("Required extension unavailable");
    await db.user.count();
    await db.document.count();
    await db.documentChunk.count();
    await db.embedding.count();
    await db.processingJob.count();
    await db.account.count();
    await db.session.count();
  });
  return Response.json(result, { status: result.status === "ready" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
