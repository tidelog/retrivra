import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
 claim: vi.fn(), execute: vi.fn(), transaction: vi.fn(), list: vi.fn(), find: vi.fn(), documentUpdate: vi.fn(), jobUpdate: vi.fn(), chunksDelete: vi.fn(), chunkCreate: vi.fn(), lock: vi.fn(), publish: vi.fn(), embed: vi.fn(), read: vi.fn(), remove: vi.fn(),
}));
vi.mock("@/server/database/client", () => ({ getDatabase: () => ({
 $queryRaw: m.claim, $executeRaw: m.execute, $transaction: m.transaction,
 document: { findMany:m.list, findFirstOrThrow:m.find, updateMany:m.documentUpdate, deleteMany:vi.fn() },
}) }));
vi.mock("@/server/documents/storage", () => ({ read:m.read, remove:m.remove, storagePath:()=>"unused" }));
vi.mock("@/server/ai", () => ({ embeddings:()=>({id:"ollama",model:"synthetic",dimensions:2,embed:m.embed}),vectorLiteral:()=>"[1,0]" }));
import { processOne } from "../../src/server/worker";
const job = { id:"job",documentId:"document",ownerId:"owner",attempts:1,leaseUntil:new Date(Date.now()+900000) };
beforeEach(() => {
 vi.resetAllMocks(); m.list.mockResolvedValue([]); m.claim.mockResolvedValue([job]); m.find.mockResolvedValue({id:"document",storageKey:"key",mediaType:"text/plain"}); m.read.mockResolvedValue(Buffer.from("Synthetic evidence")); m.embed.mockResolvedValue([[1,0]]); m.lock.mockResolvedValue([{status:"PROCESSING"}]); m.jobUpdate.mockResolvedValue({count:1});
 m.transaction.mockImplementation(async fn => fn({ $queryRaw:m.lock,$executeRaw:m.execute,processingJob:{updateMany:m.jobUpdate},documentChunk:{deleteMany:m.chunksDelete,create:m.chunkCreate},document:{update:m.publish,updateMany:m.documentUpdate} }));
});
it("publishes complete chunks and embeddings in a transaction",async()=>{ expect(await processOne()).toBe(true); expect(m.chunkCreate).toHaveBeenCalledOnce(); expect(m.chunkCreate.mock.calls[0][0].data).toMatchObject({ownerId:"owner",documentId:"document",text:"Synthetic evidence",ordinal:0}); expect(m.publish.mock.calls[0][0].data.status).toBe("READY"); expect(m.jobUpdate.mock.calls[0][0].where).toMatchObject({id:"job",attempts:1,status:"RUNNING"}); });
it("backs off model failures and fails after three attempts",async()=>{ m.embed.mockRejectedValue(new Error("local model offline")); await processOne(); expect(m.jobUpdate.mock.calls[0][0].data).toMatchObject({status:"PENDING",errorCode:"PROCESSING_FAILED"}); expect(m.publish).not.toHaveBeenCalled(); m.claim.mockResolvedValue([{...job,attempts:3}]); await processOne(); expect(m.jobUpdate.mock.calls[1][0].data.status).toBe("FAILED"); });
it("does not publish after losing a lease",async()=>{ m.jobUpdate.mockResolvedValue({count:0}); await processOne(); expect(m.chunksDelete).not.toHaveBeenCalled(); expect(m.publish).not.toHaveBeenCalled(); });
it("does not publish a deleting document",async()=>{ m.lock.mockResolvedValue([{status:"DELETING"}]); await processOne(); expect(m.chunksDelete).not.toHaveBeenCalled(); expect(m.publish).not.toHaveBeenCalled(); });
it("returns idle without a job",async()=>{ m.claim.mockResolvedValue([]); expect(await processOne()).toBe(false); expect(m.read).not.toHaveBeenCalled(); });
