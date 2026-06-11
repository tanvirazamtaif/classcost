-- AlterTable
ALTER TABLE "FeedProfile" ADD COLUMN     "institute" TEXT;

-- AlterTable
ALTER TABLE "DmMessage" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "FeedStory" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedStory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedStory_authorId_createdAt_idx" ON "FeedStory"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedStory_createdAt_idx" ON "FeedStory"("createdAt");

