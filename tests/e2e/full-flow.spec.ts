import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../../src/server/password";

test.skip(process.env.RUN_FULL_E2E !== "true", "Requires PostgreSQL, local models and browser system libraries");

test("authenticated upload, processing, answers and cross-user isolation", async ({ browser }) => {
 test.setTimeout(240000);
 if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required for full E2E");
 const target = new URL(process.env.DATABASE_URL);
 if (!["localhost","127.0.0.1","[::1]"].includes(target.hostname) || !target.pathname.startsWith("/retrivra_e2e_")) throw new Error("Use an explicitly disposable local retrivra_e2e_* database");
 const db = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
 const password="synthetic-full-flow-password";
 const emails=[`owner-${randomUUID()}@synthetic.invalid`,`other-${randomUUID()}@synthetic.invalid`];
 const contexts = await Promise.all([browser.newContext({baseURL:"http://127.0.0.1:3000"}),browser.newContext({baseURL:"http://127.0.0.1:3000"})]);
 let documentId: string | undefined;
 try {
  for (let i=0;i<2;i++) {
   await db.user.create({data:{email:emails[i],passwordHash:await hashPassword(password)}});
   const page=await contexts[i].newPage(); await page.goto("/login");
   await page.getByLabel("Email",{exact:true}).fill(emails[i]); await page.getByLabel("Password",{exact:true}).fill(password);
   await page.getByRole("button",{name:"Sign in",exact:true}).click(); await expect(page).toHaveURL(/\/dashboard/);
  }
  const owner = contexts[0]; const other = contexts[1];
  const upload=await owner.request.post("/api/documents",{multipart:{file:{name:"synthetic-falcon.txt",mimeType:"text/plain",buffer:Buffer.from("The synthetic FALCON project retention period is 42 days. The FALCON policy requires deleting temporary records after 42 days.")}} ,headers:{origin:"http://127.0.0.1:3000"}});
  expect(upload.status()).toBe(201); documentId=(await upload.json()).id;
  await expect.poll(async()=>{const docs=await (await owner.request.get("/api/documents")).json();return docs.find((d:{id:string})=>d.id===documentId)?.status;},{timeout:180000,intervals:[1000,3000]}).toBe("READY");
  expect((await other.request.get(`/api/documents/${documentId}`)).status()).toBe(404);
  expect((await other.request.delete(`/api/documents/${documentId}`,{headers:{origin:"http://127.0.0.1:3000"}})).status()).toBe(404);
  const answer=await owner.request.post("/api/search",{headers:{origin:"http://127.0.0.1:3000"},data:{query:"What is the FALCON retention period?",answer:true}});
  expect(answer.status()).toBe(200); const result=await answer.json(); expect(result.sources.length).toBeGreaterThan(0);
  const allowed=new Set(result.sources.map((s:{chunkId:string})=>s.chunkId));
  expect(result.answer.citedChunkIds.length).toBeGreaterThan(0); for(const id of result.answer.citedChunkIds) expect(allowed.has(id)).toBe(true);
  const isolated=await other.request.post("/api/search",{headers:{origin:"http://127.0.0.1:3000"},data:{query:"FALCON retention",answer:false}});
  expect(isolated.status()).toBe(200); expect((await isolated.json()).sources).toEqual([]);
  expect((await owner.request.delete(`/api/documents/${documentId}`,{headers:{origin:"http://127.0.0.1:3000"}})).status()).toBe(200); documentId=undefined;
 } finally {
  if(documentId) await contexts[0].request.delete(`/api/documents/${documentId}`,{headers:{origin:"http://127.0.0.1:3000"}});
  for(const context of contexts) await context.close();
  await db.user.deleteMany({where:{email:{in:emails}}}); await db.$disconnect();
 }
});
