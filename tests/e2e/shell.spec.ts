import { test, expect } from "@playwright/test";
test("application shell and liveness render", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your documents, with context." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your private knowledge workspace" })).toBeVisible();
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("protected dashboard redirects to sign in and APIs reject anonymous requests", async ({ page, request }) => {
 await page.goto("/dashboard");
 await expect(page).toHaveURL(/\/login/);
 await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
 expect((await request.get("/api/documents")).status()).toBe(401);
 expect((await request.post("/api/search", { data: { query: "synthetic" } })).status()).toBe(401);
});
