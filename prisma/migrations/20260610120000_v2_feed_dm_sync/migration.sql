-- CreateTable
CREATE TABLE "V2Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "V2Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedReport" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmThread" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "V2Document_userId_key" ON "V2Document"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedProfile_userId_key" ON "FeedProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedProfile_handle_key" ON "FeedProfile"("handle");

-- CreateIndex
CREATE INDEX "FeedProfile_handle_idx" ON "FeedProfile"("handle");

-- CreateIndex
CREATE INDEX "FeedPost_authorId_createdAt_idx" ON "FeedPost"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedPost_createdAt_idx" ON "FeedPost"("createdAt");

-- CreateIndex
CREATE INDEX "FeedLike_userId_idx" ON "FeedLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedLike_postId_userId_key" ON "FeedLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "FeedComment_postId_createdAt_idx" ON "FeedComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedFollow_followingId_idx" ON "FeedFollow"("followingId");

-- CreateIndex
CREATE INDEX "FeedFollow_followerId_idx" ON "FeedFollow"("followerId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedFollow_followerId_followingId_key" ON "FeedFollow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "FeedReport_status_idx" ON "FeedReport"("status");

-- CreateIndex
CREATE INDEX "DmThread_userAId_lastAt_idx" ON "DmThread"("userAId", "lastAt");

-- CreateIndex
CREATE INDEX "DmThread_userBId_lastAt_idx" ON "DmThread"("userBId", "lastAt");

-- CreateIndex
CREATE UNIQUE INDEX "DmThread_userAId_userBId_key" ON "DmThread"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "DmMessage_threadId_createdAt_idx" ON "DmMessage"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "V2Document" ADD CONSTRAINT "V2Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedProfile" ADD CONSTRAINT "FeedProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "FeedProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedLike" ADD CONSTRAINT "FeedLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessage" ADD CONSTRAINT "DmMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DmThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

