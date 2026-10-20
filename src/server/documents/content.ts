export const MAX_BYTES = 10 * 1024 * 1024;
export function validateUpload(name: string, type: string, bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error("File must be between 1 byte and 10 MiB");
  if (name.toLowerCase().endsWith(".pdf") && type === "application/pdf" && bytes.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (name.toLowerCase().endsWith(".txt") && type === "text/plain") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) throw new Error("Invalid text content");
    return "text/plain";
  }
  throw new Error("Only UTF-8 TXT and PDF files are supported");
}
export function chunkText(text: string, size = 1400, overlap = 200) {
  if (!Number.isInteger(size) || size < 200 || size > 8000 || overlap < 0 || overlap >= size) throw new Error("Invalid chunk configuration");
  const clean = text.replace(/\r\n/g, "\n").trim();
  const chunks: string[] = [];
  for (let offset = 0; offset < clean.length; offset += size - overlap) { chunks.push(clean.slice(offset, offset + size)); if (offset + size >= clean.length) break; }
  return chunks;
}
