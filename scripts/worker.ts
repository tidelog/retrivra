import "dotenv/config";
import { processOne } from "../src/server/worker";
import { getDatabase } from "../src/server/database/client";
const db = getDatabase();
let stopping = false;
process.on("SIGTERM", () => { stopping = true; }); process.on("SIGINT", () => { stopping = true; });
try { while (!stopping) { try { if (!await processOne()) await new Promise(r => setTimeout(r, 2000)); } catch { console.error("Worker database unavailable"); await new Promise(r => setTimeout(r, 5000)); } } }
finally { await db.$disconnect(); }
