export function liveness() { return { status: "ok" as const }; }
export async function readiness(check: () => Promise<void>) {
  try { await check(); return { status: "ready" as const }; }
  catch { return { status: "unavailable" as const }; }
}
