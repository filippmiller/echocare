-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

