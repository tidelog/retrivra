import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { execFileSync } from "node:child_process";
import { testAdminUrl } from "./database-target.mjs";

const adminUrl = testAdminUrl(process.env);
// The only database eligible for cleanup is one successfully created by this run.
const databaseName = "retrivra_test_" + randomUUID().replaceAll("-", "");
const databaseUrl = new URL(adminUrl);
databaseUrl.pathname = "/" + databaseName;

test("migrations enforce ownership, vector dimensions and cascading deletion", async () => {
  const admin = new pg.Client({ connectionString: adminUrl.href, connectionTimeoutMillis: 3000, query_timeout: 10000 });
  const db = new pg.Client({ connectionString: databaseUrl.href, connectionTimeoutMillis: 3000, query_timeout: 10000 });
  let created = false;
  let connected = false;
  await admin.connect();
  try {
    assert.equal((await admin.query("SELECT current_database() AS name")).rows[0].name, "postgres");
    await admin.query(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    created = true;
    // Suppress CLI connection output: failures must not disclose credentials.
    try {
      execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
        env: { ...process.env, DATABASE_URL: databaseUrl.href }, stdio: "pipe", timeout: 60000,
      });
    } catch { throw new Error("Prisma migrate deploy failed on the newly created test database."); }
    await db.connect();
    connected = true;
    assert.equal((await db.query("SELECT current_database() AS name")).rows[0].name, databaseName);
    const version = (await db.query("SHOW server_version")).rows[0].server_version;
    const vector = (await db.query("SELECT extversion FROM pg_extension WHERE extname = 'vector'")).rows[0]?.extversion;
    assert.ok(vector, "pgvector must be installed by migrations");
    const migrations = await db.query('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
    assert.ok(migrations.rows.some(row => row.migration_name === "20261018000100_foundation"));
    console.log(`PostgreSQL ${version}; pgvector ${vector}; Prisma migrations applied`);
    await db.query("BEGIN");
    const owner = randomUUID(), other = randomUUID(), document = randomUUID(), chunk = randomUUID();
    await db.query('INSERT INTO "User" ("id", "email") VALUES ($1, $2), ($3, $4)', [owner, owner + "@synthetic.invalid", other, other + "@synthetic.invalid"]);
    await db.query('INSERT INTO "Document" ("id", "ownerId", "storageKey", "filename", "mediaType", "sizeBytes", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,now())', [document, owner, document, "synthetic.txt", "text/plain", 20]);
    // Ranking test must see committed users from its independent connection.
    await db.query("COMMIT");
    try {
      execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "tests/retrieval-integration.ts"], {
        env: { ...process.env, DATABASE_URL: databaseUrl.href, NODE_ENV: "test", SYNTHETIC_OWNER: owner, SYNTHETIC_OTHER: other }, stdio: "pipe", timeout: 60000,
      });
    } catch { throw new Error("Actual retrieval integration test failed in disposable database"); }
    // Synthetic retrieval documents are independent from the constraint fixture.
    await db.query('DELETE FROM "Document" WHERE "filename" = $1', ["synthetic-ranking.txt"]);
    await db.query("BEGIN");
    await db.query("SAVEPOINT ownership");
    await assert.rejects(db.query('INSERT INTO "DocumentChunk" ("id","documentId","ownerId","pipelineVersion","ordinal","text") VALUES ($1,$2,$3,$4,0,$5)', [randomUUID(), document, other, "v1", "synthetic"]), { code: "23503" });
    await db.query("ROLLBACK TO SAVEPOINT ownership");
    await db.query('INSERT INTO "DocumentChunk" ("id","documentId","ownerId","pipelineVersion","ordinal","text") VALUES ($1,$2,$3,$4,0,$5)', [chunk, document, owner, "v1", "synthetic"]);
    await db.query("SAVEPOINT dimensions");
    await assert.rejects(db.query('INSERT INTO "Embedding" ("id","chunkId","ownerId","provider","model","dimensions","vector") VALUES ($1,$2,$3,$4,$5,3,$6::vector)', [randomUUID(), chunk, owner, "synthetic", "synthetic", "[1,2]"]), { code: "23514" });
    await db.query("ROLLBACK TO SAVEPOINT dimensions");
    await db.query('INSERT INTO "Embedding" ("id","chunkId","ownerId","provider","model","dimensions","vector") VALUES ($1,$2,$3,$4,$5,2,$6::vector)', [randomUUID(), chunk, owner, "synthetic", "synthetic", "[1,2]"]);
    await db.query('INSERT INTO "ProcessingJob" ("id","documentId","ownerId","pipelineVersion","updatedAt") VALUES ($1,$2,$3,$4,now())', [randomUUID(), document, owner, "v1"]);
    async function rejects(sql, values, code) {
      await db.query("SAVEPOINT rejected_write");
      await assert.rejects(db.query(sql, values), { code });
      await db.query("ROLLBACK TO SAVEPOINT rejected_write");
    }
    await rejects('INSERT INTO "User" ("id","email") VALUES ($1,$2)', [randomUUID(), owner + "@synthetic.invalid"], "23505");
    await rejects('INSERT INTO "Document" ("id","ownerId","storageKey","filename","mediaType","sizeBytes","updatedAt") VALUES ($1,$2,$3,\'x\',\'text/plain\',0,now())', [randomUUID(), randomUUID(), randomUUID()], "23503");
    await rejects('UPDATE "Document" SET "sizeBytes" = -1 WHERE "id" = $1', [document], "23514");
    await rejects('INSERT INTO "Document" ("id","ownerId","storageKey","filename","mediaType","sizeBytes","updatedAt") VALUES ($1,$2,$3,\'x\',\'text/plain\',0,now())', [randomUUID(), owner, document], "23505");
    await rejects('INSERT INTO "DocumentChunk" ("id","documentId","ownerId","pipelineVersion","ordinal","text") VALUES ($1,$2,$3,\'v1\',0,\'x\')', [randomUUID(), document, owner], "23505");
    await rejects('UPDATE "DocumentChunk" SET "ordinal" = -1 WHERE "id" = $1', [chunk], "23514");
    await rejects('UPDATE "DocumentChunk" SET "pageNumber" = 0 WHERE "id" = $1', [chunk], "23514");
    await rejects('UPDATE "Embedding" SET "ownerId" = $1 WHERE "chunkId" = $2', [other, chunk], "23503");
    await rejects('UPDATE "Embedding" SET "dimensions" = 0 WHERE "chunkId" = $1', [chunk], "23514");
    await rejects('UPDATE "Embedding" SET "vector" = NULL WHERE "chunkId" = $1', [chunk], "23502");
    await rejects('INSERT INTO "Embedding" ("id","chunkId","ownerId","provider","model","dimensions","vector") VALUES ($1,$2,$3,\'synthetic\',\'synthetic\',2,\'[1,2]\'::vector)', [randomUUID(), chunk, owner], "23505");
    assert.equal((await db.query('SELECT vector_dims("vector") AS dims FROM "Embedding" WHERE "chunkId" = $1', [chunk])).rows[0].dims, 2);
    await rejects('UPDATE "ProcessingJob" SET "ownerId" = $1 WHERE "documentId" = $2', [other, document], "23503");
    await rejects('UPDATE "ProcessingJob" SET "attempts" = -1 WHERE "documentId" = $1', [document], "23514");
    await rejects('INSERT INTO "ProcessingJob" ("id","documentId","ownerId","pipelineVersion","updatedAt") VALUES ($1,$2,$3,\'v1\',now())', [randomUUID(), document, owner], "23505");
    const account = randomUUID(), session = randomUUID();
    await db.query('INSERT INTO "Account" ("id","userId","provider","providerAccountId") VALUES ($1,$2,$3,$4)', [account, owner, "synthetic", owner]);
    await rejects('INSERT INTO "Account" ("id","userId","provider","providerAccountId") VALUES ($1,$2,$3,$4)', [randomUUID(), other, "synthetic", owner], "23505");
    await rejects('UPDATE "Account" SET "userId" = $1 WHERE "id" = $2', [randomUUID(), account], "23503");
    await db.query('INSERT INTO "Session" ("id","userId","tokenHash","expiresAt") VALUES ($1,$2,$3,now())', [session, owner, session]);
    await rejects('INSERT INTO "Session" ("id","userId","tokenHash","expiresAt") VALUES ($1,$2,$3,now())', [randomUUID(), other, session], "23505");
    await rejects('UPDATE "Session" SET "userId" = $1 WHERE "id" = $2', [randomUUID(), session], "23503");
    await db.query('DELETE FROM "Document" WHERE "id" = $1', [document]);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM "User" WHERE "id" = $1', [other])).rows[0].count, 1);
    await db.query('DELETE FROM "User" WHERE "id" = $1', [owner]);
    for (const table of ["Account", "Session"]) {
      assert.equal((await db.query(`SELECT count(*)::int AS count FROM "${table}" WHERE "userId" = $1`, [owner])).rows[0].count, 0);
    }
    for (const query of [
      'SELECT count(*)::int AS count FROM "DocumentChunk" WHERE "ownerId" = $1',
      'SELECT count(*)::int AS count FROM "Embedding" WHERE "ownerId" = $1',
      'SELECT count(*)::int AS count FROM "ProcessingJob" WHERE "ownerId" = $1',
    ]) assert.equal((await db.query(query, [owner])).rows[0].count, 0);
  } finally {
    try {
      try { if (connected) await db.query("ROLLBACK"); } finally { await db.end(); }
    } finally {
      try {
        if (created) await admin.query(`DROP DATABASE "${databaseName}"`);
      } finally { await admin.end(); }
    }
  }
});
