import { beforeEach, expect, it, vi } from "vitest";
const database = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  user: { count: vi.fn() }, account: { count: vi.fn() }, session: { count: vi.fn() },
  document: { count: vi.fn() }, documentChunk: { count: vi.fn() },
  embedding: { count: vi.fn() }, processingJob: { count: vi.fn() },
}));
vi.mock("../../src/server/database/client", () => ({ getDatabase: () => database }));
import { GET as live } from "../../src/app/api/health/route";
import { GET as ready } from "../../src/app/api/health/ready/route";
beforeEach(() => {
  vi.resetAllMocks();
  database.$queryRaw.mockResolvedValue([{ extversion: "0.8.2" }]);
});
it("liveness returns uncached success", async () => {
  const response = live();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
});
it("readiness requires database and vector", async () => {
  const response = await ready();
  expect(response.status).toBe(200);
  expect(database.embedding.count).toHaveBeenCalledOnce();
  expect(await response.json()).toEqual({ status: "ready" });
});
it("missing vector returns unavailable", async () => {
  database.$queryRaw.mockResolvedValue([]);
  const response = await ready();
  expect(response.status).toBe(503);
});
it("missing migrated tables returns a sanitized unavailable response", async () => {
  database.document.count.mockRejectedValue(new Error("private-database-detail"));
  const response = await ready();
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ status: "unavailable" });
});
it("connection failures do not leak details", async () => {
  database.$queryRaw.mockRejectedValue(new Error("private-connection-detail"));
  const response = await ready();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "unavailable" });
});
