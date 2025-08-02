/*
  Warnings:

  - Made the column `text` on table `Document` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Document" ALTER COLUMN "text" SET NOT NULL;
