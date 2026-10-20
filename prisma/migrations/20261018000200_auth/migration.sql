ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '!disabled';
CREATE TABLE "RateBucket" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "RateBucket_expiresAt_idx" ON "RateBucket"("expiresAt");
