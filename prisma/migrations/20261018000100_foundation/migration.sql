CREATE EXTENSION IF NOT EXISTS vector;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED', 'DELETING');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingJob" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "pipelineVersion" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "pipelineVersion" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Embedding" (
    "id" UUID NOT NULL,
    "chunkId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "vector" vector NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_ownerId_createdAt_idx" ON "Document"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_id_ownerId_key" ON "Document"("id", "ownerId");

-- CreateIndex
CREATE INDEX "ProcessingJob_status_availableAt_idx" ON "ProcessingJob"("status", "availableAt");

-- CreateIndex
CREATE INDEX "ProcessingJob_ownerId_documentId_idx" ON "ProcessingJob"("ownerId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingJob_documentId_pipelineVersion_key" ON "ProcessingJob"("documentId", "pipelineVersion");

-- CreateIndex
CREATE INDEX "DocumentChunk_ownerId_documentId_idx" ON "DocumentChunk"("ownerId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunk_documentId_pipelineVersion_ordinal_key" ON "DocumentChunk"("documentId", "pipelineVersion", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunk_id_ownerId_key" ON "DocumentChunk"("id", "ownerId");

-- CreateIndex
CREATE INDEX "Embedding_ownerId_chunkId_idx" ON "Embedding"("ownerId", "chunkId");

-- CreateIndex
CREATE UNIQUE INDEX "Embedding_chunkId_provider_model_key" ON "Embedding"("chunkId", "provider", "model");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_documentId_ownerId_fkey" FOREIGN KEY ("documentId", "ownerId") REFERENCES "Document"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_ownerId_fkey" FOREIGN KEY ("documentId", "ownerId") REFERENCES "Document"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_chunkId_ownerId_fkey" FOREIGN KEY ("chunkId", "ownerId") REFERENCES "DocumentChunk"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- SQL-only invariants: preserve these when authoring subsequent Prisma migrations.
ALTER TABLE "Document" ADD CONSTRAINT "Document_sizeBytes_nonnegative" CHECK ("sizeBytes" >= 0);
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_ordinal_nonnegative" CHECK ("ordinal" >= 0);
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_pageNumber_positive" CHECK ("pageNumber" IS NULL OR "pageNumber" > 0);
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_attempts_nonnegative" CHECK ("attempts" >= 0);
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_dimensions_valid" CHECK ("dimensions" > 0 AND vector_dims("vector") = "dimensions");
