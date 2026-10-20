import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function owner() { const session = await auth(); if (!session?.user?.id) throw new HttpError(401, "Sign in required"); return session.user.id; }
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(process.env.AUTH_URL || request.url).origin) throw new HttpError(403, "Invalid request origin");
}
export function endpoint(fn: (request: Request) => Promise<Response>) {
  return async (request: Request) => { try { return await fn(request); } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    console.error("Request failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  } };
}

export async function limitedJson(request: Request, limit = 16000) {
 const reader = request.body?.getReader(); if (!reader) throw new HttpError(400, "Missing request body");
 let length = 0; const parts: Uint8Array[] = [];
 while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > limit) { await reader.cancel(); throw new HttpError(413, "Request too large"); } parts.push(value); }
 try { return JSON.parse(Buffer.concat(parts).toString("utf8")); } catch { throw new HttpError(400, "Invalid JSON"); }
}
