-- Add PhotoAsset model for user photo gallery

-- Create PhotoAsset table
CREATE TABLE IF NOT EXISTS "PhotoAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoAsset_pkey" PRIMARY KEY ("id")
);

-- Add foreign key
ALTER TABLE "PhotoAsset" ADD CONSTRAINT "PhotoAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index for user photos query
CREATE INDEX IF NOT EXISTS "PhotoAsset_userId_createdAt_idx" ON "PhotoAsset"("userId", "createdAt" DESC);


