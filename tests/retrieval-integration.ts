// Invoked only inside the disposable database created by database.test.mjs.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../src/server/database/client";
import { retrieve } from "../src/server/retrieval";
const db = getDatabase();
const ownerId = process.env.SYNTHETIC_OWNER!;
const otherId = process.env.SYNTHETIC_OTHER!;
process.env.AI_PROVIDER = "ollama";
process.env.EMBEDDING_DIMENSIONS = "2";
process.env.EMBEDDING_MODEL = "synthetic-retrieval";
globalThis.fetch = async () => Response.json({ embeddings: [[1, 0]] });
try {
 const expected: string[] = [];
 for (const [owner, vector, model] of [
  [ownerId, [1,0], "synthetic-retrieval"],
  [ownerId, [0.8,0.2], "synthetic-retrieval"],
  [ownerId, [0,1], "synthetic-retrieval"],
  [otherId, [1,0], "synthetic-retrieval"],
  [ownerId, [1,0,0], "synthetic-retrieval"],
  [ownerId, [1,0], "different-model"],
 ] as const) {
  const id = randomUUID(), chunkId = randomUUID(), embeddingId = randomUUID();
  await db.document.create({ data: { id, ownerId: owner, storageKey: id, filename: "synthetic-ranking.txt", mediaType: "text/plain", sizeBytes: 20, status: "READY" } });
  await db.documentChunk.create({ data: { id: chunkId, documentId: id, ownerId: owner, pipelineVersion: "v1", ordinal: 0, text: "synthetic" } });
  await db.$executeRaw`INSERT INTO "Embedding" (id,"chunkId","ownerId",provider,model,dimensions,vector) VALUES (${embeddingId}::uuid,${chunkId}::uuid,${owner}::uuid,'ollama',${model},${vector.length},${JSON.stringify(vector)}::vector)`;
  if (expected.length < 2) expected.push(chunkId);
 }
 const sources = await retrieve(ownerId, "synthetic query");
 assert.deepEqual(sources.map(s => s.chunkId), expected);
 assert.equal(sources[0].score, 1);
 assert.ok(sources[0].score > sources[1].score);
 console.log("Actual pgvector ranking, threshold, dimension/model filtering and tenant isolation passed");
} finally { await db.$disconnect(); }
