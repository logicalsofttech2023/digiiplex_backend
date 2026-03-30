-- CreateEnum
CREATE TYPE "MovieStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "slug" TEXT NOT NULL,
    "genres" TEXT[],
    "language" TEXT NOT NULL,
    "releaseYear" INTEGER NOT NULL,
    "ageRating" TEXT NOT NULL DEFAULT 'U/A',
    "thumbnailUrl" TEXT,
    "videoUrl" TEXT,
    "trailerUrl" TEXT,
    "duration" INTEGER NOT NULL,
    "rating" DECIMAL(2,1),
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "status" "MovieStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");
