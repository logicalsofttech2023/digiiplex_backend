/*
  Warnings:

  - You are about to drop the column `image` on the `Cast` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Cast` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cast" DROP COLUMN "image",
DROP COLUMN "role";
