import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";
const parser = new PDFParse({ data: await readFile(process.argv[2]) });
try {
 const result = await parser.getText();
 const pages = result.pages.map(p => ({ text: p.text, page: p.num }));
 const output = JSON.stringify(pages);
 if (output.length > 3000000) throw new Error("ExtractionLimit");
 process.stdout.write(output);
} finally { await parser.destroy(); }
