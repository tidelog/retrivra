import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
const exec = promisify(execFile);
import { getDatabase } from "./database/client";
import { storagePath, remove, read } from "./documents/storage";
import { chunkText } from "./documents/content";
import { embeddings, vectorLiteral } from "./ai";
const db = getDatabase();
type Job = { id: string; documentId: string; ownerId: string; attempts: number; leaseUntil: Date };
export async function processOne() {
 // Finish interrupted deletions and terminal lease expiry on startup and every poll.
 for (const d of await db.document.findMany({ where: { status: "DELETING" }, take: 10 })) {
 await remove(d.storageKey); await db.document.deleteMany({ where: { id: d.id, ownerId: d.ownerId, status: "DELETING" } });
 }
 await db.$executeRaw`WITH expired AS (UPDATE "ProcessingJob" SET status='FAILED', "errorCode"='LEASE_EXHAUSTED', "leaseUntil"=NULL, "updatedAt"=NOW() WHERE status='RUNNING' AND attempts>=3 AND "leaseUntil"<NOW() RETURNING "documentId", "ownerId") UPDATE "Document" d SET status='FAILED', "updatedAt"=NOW() FROM expired e WHERE d.id=e."documentId" AND d."ownerId"=e."ownerId" AND d.status!='DELETING'`;
 await db.$executeRaw`DELETE FROM "RateBucket" WHERE "expiresAt" < NOW() - INTERVAL '1 day'`;
 const jobs = await db.$queryRaw<Job[]>`
 UPDATE "ProcessingJob" SET status='RUNNING', attempts=attempts+1, "leaseUntil"=NOW()+INTERVAL '15 minutes', "updatedAt"=NOW()
 WHERE id=(SELECT j.id FROM "ProcessingJob" j JOIN "Document" d ON d.id=j."documentId" AND d."ownerId"=j."ownerId"
 WHERE d.status!='DELETING' AND j.attempts<3 AND ((j.status='PENDING' AND j."availableAt"<=NOW()) OR (j.status='RUNNING' AND j."leaseUntil"<NOW()))
 ORDER BY j."availableAt" FOR UPDATE OF j SKIP LOCKED LIMIT 1)
 RETURNING id, "documentId", "ownerId", attempts, "leaseUntil"`;
 const job = jobs[0]; if (!job) return false;
 try {
 const document = await db.document.findFirstOrThrow({ where: { id: job.documentId, ownerId: job.ownerId, status: { not: "DELETING" } } });
 await db.document.updateMany({ where: { id: document.id, ownerId: job.ownerId, status: { not: "DELETING" } }, data: { status: "PROCESSING" } });
 const bytes = await read(document.storageKey);
 let pages: { text: string; page: number | null }[];
 if (document.mediaType === "application/pdf") {
 const { stdout } = await exec(process.execPath, ["--max-old-space-size=256", resolve("scripts/extract-pdf.mjs"), storagePath(document.storageKey)], { timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
 pages = JSON.parse(stdout);
 } else pages = [{ text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), page: null }];
 const chunks = pages.flatMap(p => chunkText(p.text, Number(process.env.CHUNK_SIZE || 1400), Number(process.env.CHUNK_OVERLAP || 200)).map(text => ({ text, page: p.page })));
 if (!chunks.length || chunks.length > 500) throw new Error("ExtractionLimit");
 const provider = embeddings(); const vectors: (readonly number[])[] = [];
 for (let i=0; i<chunks.length; i+=8) { if (Date.now() > new Date(job.leaseUntil).getTime() - 10000) throw new Error("LeaseDeadline"); vectors.push(...await provider.embed(chunks.slice(i,i+8).map(c => c.text))); }
 await db.$transaction(async tx => {
 // Lock document before replacing chunks; deletion and lease recovery cannot publish stale work.
 const locked = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM "Document" WHERE id=${document.id}::uuid AND "ownerId"=${job.ownerId}::uuid FOR UPDATE`;
 if (!locked.length || locked[0].status === "DELETING") throw new Error("DocumentDeleted");
 const claimed = await tx.processingJob.updateMany({ where: { id: job.id, status: "RUNNING", attempts: job.attempts, leaseUntil: { gt: new Date() } }, data: { status: "SUCCEEDED", leaseUntil: null, errorCode: null } });
 if (!claimed.count) throw new Error("LeaseLost");
 await tx.documentChunk.deleteMany({ where: { documentId: document.id, ownerId: job.ownerId } });
 for (let i=0; i<chunks.length; i++) {
 const chunkId = randomUUID(); const embeddingId = randomUUID(); const literal = vectorLiteral(vectors[i], provider.dimensions);
 await tx.documentChunk.create({ data: { id: chunkId, documentId: document.id, ownerId: job.ownerId, pipelineVersion: "v1", ordinal: i, text: chunks[i].text, pageNumber: chunks[i].page } });
 await tx.$executeRaw`INSERT INTO "Embedding" (id,"chunkId","ownerId",provider,model,dimensions,vector) VALUES (${embeddingId}::uuid,${chunkId}::uuid,${job.ownerId}::uuid,${provider.id},${provider.model},${provider.dimensions},${literal}::vector)`;
 }
 await tx.document.update({ where: { id_ownerId: { id: document.id, ownerId: job.ownerId } }, data: { status: "READY" } });
 }, { timeout: 120000 });
 } catch {
 await db.$transaction(async tx => {
 const changed = await tx.processingJob.updateMany({ where: { id: job.id, status: "RUNNING", attempts: job.attempts }, data: { status: job.attempts >= 3 ? "FAILED" : "PENDING", availableAt: new Date(Date.now()+30000*job.attempts), leaseUntil: null, errorCode: "PROCESSING_FAILED" } });
 if (changed.count) await tx.document.updateMany({ where: { id: job.documentId, ownerId: job.ownerId, status: { not: "DELETING" } }, data: { status: job.attempts >= 3 ? "FAILED" : "PENDING" } });
 });
 }
 return true;
}
