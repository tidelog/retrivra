import { test, expect } from "@playwright/test";
test("production HTTP serves landing and liveness", async ({ request }) => {
 const page = await request.get("/"); expect(page.status()).toBe(200); expect(await page.text()).toContain("Your documents, with context.");
 const health = await request.get("/api/health"); expect(health.status()).toBe(200); expect(await health.json()).toEqual({status:"ok"});
});
test("production HTTP protects document and search APIs", async ({ request }) => {
 expect((await request.get("/api/documents")).status()).toBe(401);
 expect((await request.get("/api/documents/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).status()).toBe(401);
 expect((await request.post("/api/search",{data:{query:"synthetic"}})).status()).toBe(401);
});
test("production HTTP redirects dashboard and serves sign in", async ({ request }) => {
 const dashboard=await request.get("/dashboard",{maxRedirects:0}); expect(dashboard.status()).toBe(307); expect(dashboard.headers().location).toContain("/login");
 const login=await request.get("/login"); expect(login.status()).toBe(200); expect(await login.text()).toContain("Welcome back.");
});
