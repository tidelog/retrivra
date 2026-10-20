import { liveness } from "@/server/health/status";
export const dynamic = "force-dynamic";
export function GET() { return Response.json(liveness(), { headers: { "Cache-Control": "no-store" } }); }
