import { describe, it, expect } from "vitest";
import { parseEnv } from "../../src/config/env";
const base = { DATABASE_URL: "postgresql://synthetic:synthetic@localhost:5432/test" };
describe("server configuration", () => {
  it("defaults to local storage and local providers", () => {
    expect(parseEnv(base)).toMatchObject({ NODE_ENV: "development", STORAGE_ROOT: "./var/storage", AI_PROVIDER: "ollama" });
  });
  it("accepts explicit test environment", () => expect(parseEnv({ ...base, NODE_ENV: "test" }).NODE_ENV).toBe("test"));
  it.each([{}, { DATABASE_URL: "https://example.com" }, { ...base, AI_PROVIDER: "external" }, { ...base, NODE_ENV: "invalid" }, { DATABASE_URL: "postgresql://localhost/test" }])("rejects invalid configuration", input => expect(() => parseEnv(input)).toThrow("Invalid server environment"));
  it("redacts invalid secret values", () => {
    expect(() => parseEnv({ DATABASE_URL: "private-secret" })).toThrow(/^Invalid server environment: DATABASE_URL$/);
  });
  it("rejects production defaults", () => expect(() => parseEnv({ ...base, NODE_ENV: "production" })).toThrow());
  it("requires verified TLS and absolute storage in production", () => {
    expect(parseEnv({ NODE_ENV: "production", DATABASE_URL: base.DATABASE_URL + "?sslmode=verify-full", STORAGE_ROOT: "/srv/retrivra" }).NODE_ENV).toBe("production");
    expect(() => parseEnv({ NODE_ENV: "production", DATABASE_URL: "postgresql://x:local-development-only@localhost/test?sslmode=verify-full", STORAGE_ROOT: "/srv/retrivra" })).toThrow();
  });
});
