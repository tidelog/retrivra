import { expect, it } from "vitest";
// @ts-expect-error Node integration helper intentionally runs without transpilation.
import { testAdminUrl } from "../database-target.mjs";
const valid = "postgresql://synthetic:synthetic@127.0.0.1:5432/postgres";
it("accepts an explicit local maintenance connection", () => {
  expect(testAdminUrl({ TEST_DATABASE_ADMIN_URL: valid }).pathname).toBe("/postgres");
});
it.each([
  {}, { DATABASE_URL: valid },
  { TEST_DATABASE_ADMIN_URL: "private-secret" },
  { TEST_DATABASE_ADMIN_URL: valid, NODE_ENV: "production" },
  ...[
    "postgresql://u:p@remote.example:5432/postgres",
    "postgresql://u:p@127.0.0.1:5432/retrivra",
    "postgresql://u:p@127.0.0.1/postgres",
    "postgresql://127.0.0.1:5432/postgres",
    valid + "?host=remote.example",
    valid + "#fragment",
  ].map(TEST_DATABASE_ADMIN_URL => ({ TEST_DATABASE_ADMIN_URL })),
])("rejects unsafe or implicit targets without exposing values", env => {
  expect(() => testAdminUrl(env)).toThrow(/^Database tests require TEST_DATABASE_ADMIN_URL:/);
  try { testAdminUrl(env); } catch (error) {
    expect(String(error)).not.toContain("private-secret");
  }
});
