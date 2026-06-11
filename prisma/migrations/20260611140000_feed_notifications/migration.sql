-- CreateTable
CREATE TABLE "FeedNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "postId" TEXT,
    "text" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedNotification_userId_createdAt_idx" ON "FeedNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedNotification_userId_readAt_idx" ON "FeedNotification"("userId", "readAt");

