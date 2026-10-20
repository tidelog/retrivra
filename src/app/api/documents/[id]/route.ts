import { z } from "zod";
import { NextResponse } from "next/server";
import { getDatabase } from "@/server/database/client";
import { endpoint, owner, sameOrigin, HttpError } from "@/server/http";
import { remove, read } from "@/server/documents/storage";
function id(request: Request) { return z.string().uuid().parse(new URL(request.url).pathname.split("/").pop()); }
export const GET = endpoint(async request => {
 const ownerId = await owner(); const document = await getDatabase().document.findFirst({ where: { id: id(request), ownerId, status: { not: "DELETING" } } });
 if (!document) throw new HttpError(404, "Document not found");
 return new Response(new Uint8Array(await read(document.storageKey)), { headers: { "Content-Type": document.mediaType, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
});
export const DELETE = endpoint(async request => {
 const ownerId = await owner(); sameOrigin(request); const db = getDatabase();
 const document = await db.document.findFirst({ where: { id: id(request), ownerId } });
 if (!document) throw new HttpError(404, "Document not found");
 await db.document.update({ where: { id_ownerId: { id: document.id, ownerId } }, data: { status: "DELETING" } });
 await remove(document.storageKey);
 await db.document.deleteMany({ where: { id: document.id, ownerId } });
 return NextResponse.json({ deleted: true });
});
export const POST = endpoint(async request => {
 const ownerId = await owner(); sameOrigin(request); const db = getDatabase(); const documentId = id(request);
 await db.$transaction(async tx => {
 const result = await tx.document.updateMany({ where: { id: documentId, ownerId, status: "FAILED" }, data: { status: "PENDING" } });
 if (!result.count) throw new HttpError(409, "Only failed documents can be retried");
 await tx.processingJob.updateMany({ where: { documentId, ownerId, status: "FAILED" }, data: { status: "PENDING", attempts: 0, availableAt: new Date(), errorCode: null } });
 }); return NextResponse.json({ queued: true });
});
