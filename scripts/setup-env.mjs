import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

// One credential source produces both Compose values and the host Prisma URL.
const password = randomBytes(32).toString("hex");
const content = `# Generated for local development only. Never commit this file.
NODE_ENV=development
POSTGRES_USER=retrivra
POSTGRES_PASSWORD=${password}
POSTGRES_DB=retrivra
DATABASE_URL=postgresql://retrivra:${password}@127.0.0.1:5432/retrivra?connect_timeout=3
TEST_DATABASE_ADMIN_URL=postgresql://retrivra:${password}@127.0.0.1:5432/postgres
STORAGE_ROOT=./var/storage
AI_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
AUTH_SECRET=${randomBytes(32).toString("hex")}
AUTH_URL=http://localhost:3000
`;
try {
  writeFileSync(new URL("../.env", import.meta.url), content, { flag: "wx", mode: 0o600 });
  console.log("Created private .env with random local development credentials.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Existing .env preserved. See docs/database.md for required variables.");
}
