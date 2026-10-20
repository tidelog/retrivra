import { getDatabase } from "@/server/database/client";
import { embeddings, vectorLiteral } from "@/server/ai";
export type Source = { chunkId: string; documentId: string; filename: string; text: string; pageNumber: number | null; ordinal: number; score: number };
export async function retrieve(ownerId: string, query: string): Promise<Source[]> {
 const provider = embeddings(); const [vector] = await provider.embed([query]); const literal = vectorLiteral(vector, provider.dimensions);
 return getDatabase().$queryRaw<Source[]>`
 WITH candidates AS MATERIALIZED (SELECT c.id AS "chunkId", c."documentId", d.filename, c.text, c."pageNumber", c.ordinal,
 e.vector
 FROM "Embedding" e JOIN "DocumentChunk" c ON c.id=e."chunkId" AND c."ownerId"=e."ownerId"
 JOIN "Document" d ON d.id=c."documentId" AND d."ownerId"=c."ownerId"
 WHERE e."ownerId"=${ownerId}::uuid AND c."ownerId"=${ownerId}::uuid AND d."ownerId"=${ownerId}::uuid
 AND d.status='READY' AND e.provider=${provider.id} AND e.model=${provider.model} AND e.dimensions=${provider.dimensions}
 ) SELECT "chunkId", "documentId", filename, text, "pageNumber", ordinal, 1 - (vector <=> ${literal}::vector) AS score
 FROM candidates WHERE 1 - (vector <=> ${literal}::vector) >= 0.35
 ORDER BY vector <=> ${literal}::vector, "chunkId" LIMIT 6`;
}
