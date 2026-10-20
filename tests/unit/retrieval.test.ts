import { expect,it,vi } from "vitest";
const query = vi.hoisted(()=>vi.fn().mockResolvedValue([]));
vi.mock("@/server/database/client",()=>({getDatabase:()=>({$queryRaw:query})}));
vi.mock("@/server/ai",()=>({ embeddings:()=>({id:"ollama",model:"local",dimensions:2,embed:async()=>[[1,0]]}), vectorLiteral:()=>"[1,0]" }));
import { retrieve } from "../../src/server/retrieval";
it("binds owner at every join boundary and filters model before distance",async()=>{ await retrieve("synthetic-owner","query"); const [strings,...values]=query.mock.calls[0]; const sql=strings.join("?"); expect(values.filter((v:unknown)=>v==="synthetic-owner")).toHaveLength(3); expect(sql).toContain("MATERIALIZED"); expect(sql).toContain("d.status='READY'"); expect(sql).toContain("LIMIT 6"); expect(values).toContain("local"); expect(sql).not.toContain("synthetic-owner"); });
