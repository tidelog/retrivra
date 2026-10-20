import { expect, it } from "vitest";
import { liveness, readiness } from "../../src/server/health/status";
it("liveness is independent of dependencies", () => expect(liveness()).toEqual({ status: "ok" }));
it("readiness checks dependencies", async () => expect(await readiness(async () => {})).toEqual({ status: "ready" }));
it("readiness fails closed without exposing internal errors", async () => {
  expect(await readiness(async () => { throw new Error("secret connection details"); })).toEqual({ status: "unavailable" });
});
