-- AlterTable
ALTER TABLE "DmThread" ADD COLUMN     "aReadAt" TIMESTAMP(3),
ADD COLUMN     "aTypingAt" TIMESTAMP(3),
ADD COLUMN     "bReadAt" TIMESTAMP(3),
ADD COLUMN     "bTypingAt" TIMESTAMP(3);

