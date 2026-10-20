import { describe, it, expect } from "vitest";
import { chunkText, MAX_BYTES, validateUpload } from "../../src/server/documents/content";
describe("upload validation", () => {
 it("accepts only matching extension, MIME and content", () => {
 expect(validateUpload("note.txt", "text/plain", Buffer.from("Private synthetic text"))).toBe("text/plain");
 expect(validateUpload("note.pdf", "application/pdf", Buffer.from("%PDF-1.7 synthetic"))).toBe("application/pdf");
 });
 it.each([["a.txt","application/pdf",Buffer.from("hello")],["a.pdf","application/pdf",Buffer.from("executable")],["a.txt","text/plain",Buffer.from([255])],["a.txt","text/plain",Buffer.from([0])],["a.exe","text/plain",Buffer.from("x")],["a.txt","text/plain",Buffer.alloc(0)],["a.txt","text/plain",Buffer.alloc(MAX_BYTES+1)]])("rejects invalid upload %s", (name,type,bytes) => expect(() => validateUpload(name,type,bytes)).toThrow());
});
describe("chunking", () => {
 it("preserves overlap and complete coverage", () => { const text = "abcdef".repeat(100); const chunks = chunkText(text, 250, 50); expect(chunks).toHaveLength(3); expect(chunks[0].slice(-50)).toBe(chunks[1].slice(0,50)); expect(chunks[0]+chunks.slice(1).map(c=>c.slice(50)).join("")).toBe(text); });
 it("handles empty and normalizes lines", () => { expect(chunkText("   ")).toEqual([]); expect(chunkText(" a\r\nb ")).toEqual(["a\nb"]); });
 it.each([[0,0],[200,200],[200,-1],[9000,20]])("rejects invalid bounds", (size,overlap) => expect(() => chunkText("x",size,overlap)).toThrow());
});
