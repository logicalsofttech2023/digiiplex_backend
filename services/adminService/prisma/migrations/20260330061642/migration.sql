/*
  Warnings:

  - You are about to drop the column `trailerUrl` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `videoUrl` on the `Movie` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('MOVIE', 'TRAILER');

-- DropForeignKey
ALTER TABLE "Cast" DROP CONSTRAINT "Cast_movieId_fkey";

-- AlterTable
ALTER TABLE "Movie" DROP COLUMN "trailerUrl",
DROP COLUMN "videoUrl";

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "type" "VideoType" NOT NULL,
    "masterUrl" TEXT,
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoQuality" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "bitrate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoQuality_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoQuality" ADD CONSTRAINT "VideoQuality_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cast" ADD CONSTRAINT "Cast_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
