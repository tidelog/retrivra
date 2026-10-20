import { allow } from "@/server/rate-limit";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/server/database/client";
import { endpoint, owner, sameOrigin, HttpError } from "@/server/http";
import { MAX_BYTES, validateUpload } from "@/server/documents/content";
import { store, remove } from "@/server/documents/storage";
export const runtime = "nodejs";
export const GET = endpoint(async () => {
 const ownerId = await owner();
 const documents = await getDatabase().document.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 200, include: { jobs: { select: { status: true, attempts: true, errorCode: true } } } });
 return NextResponse.json(documents.map(d => ({ id: d.id, filename: d.filename, mediaType: d.mediaType, sizeBytes: Number(d.sizeBytes), status: d.status, createdAt: d.createdAt, jobs: d.jobs })));
});
export const POST = endpoint(async request => {
 const ownerId = await owner(); sameOrigin(request);
 if (!await allow("upload:" + ownerId, 20, 3600)) throw new HttpError(429, "Upload rate limit exceeded");
 if (await getDatabase().document.count({ where: { ownerId } }) >= 200) throw new HttpError(409, "Library limit of 200 documents reached");
 // Stream with a hard cap even when Content-Length is absent or forged.
 const reader = request.body?.getReader(); if (!reader) throw new HttpError(400, "Missing upload");
 const parts: Uint8Array[] = []; let size = 0;
 while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > MAX_BYTES + 65536) { await reader.cancel(); throw new HttpError(413, "Upload too large"); } parts.push(value); }
 const form = await new Response(Buffer.concat(parts), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
 const file = form.get("file"); if (!(file instanceof File)) throw new HttpError(400, "Select a file");
 const bytes = Buffer.from(await file.arrayBuffer()); let mediaType: string;
 try { mediaType = validateUpload(file.name, file.type, bytes); } catch { throw new HttpError(400, "Upload must be a valid PDF or UTF-8 TXT, at most 10 MiB"); }
 const storageKey = randomUUID(); await store(storageKey, bytes);
 try { const doc = await getDatabase().document.create({ data: { ownerId, storageKey, filename: file.name.replace(/[\x00-\x1f/\\]/g, "_").slice(0, 200), mediaType, sizeBytes: bytes.length, jobs: { create: { pipelineVersion: "v1" } } } }); return NextResponse.json({ id: doc.id }, { status: 201 }); }
 catch (e) { await remove(storageKey); throw e; }
});
