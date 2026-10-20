import { expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/server/password";
it("salts passwords and verifies without accepting wrong values", async () => { const password = "synthetic-password-123"; const hash = await hashPassword(password); expect(hash).not.toContain(password); expect(await hashPassword(password)).not.toBe(hash); expect(await verifyPassword(password,hash)).toBe(true); expect(await verifyPassword("incorrect",hash)).toBe(false); expect(await verifyPassword(password,"!disabled")).toBe(false); });
