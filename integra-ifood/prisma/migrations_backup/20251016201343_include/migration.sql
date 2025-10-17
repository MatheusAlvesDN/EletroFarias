/*
  Warnings:

  - The primary key for the `RewardsFidelimax` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `email` on the `RewardsFidelimax` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `RewardsFidelimax` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `RewardsFidelimax` table. All the data in the column will be lost.
  - You are about to drop the `Fidelimax_CodProd` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[idVoucher]` on the table `RewardsFidelimax` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cpf` to the `RewardsFidelimax` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idVoucher` to the `RewardsFidelimax` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `RewardsFidelimax` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."RewardsFidelimax_email_key";

-- AlterTable
ALTER TABLE "public"."RewardsFidelimax" DROP CONSTRAINT "RewardsFidelimax_pkey",
DROP COLUMN "email",
DROP COLUMN "id",
DROP COLUMN "role",
ADD COLUMN     "cpf" BIGINT NOT NULL,
ADD COLUMN     "idVoucher" TEXT NOT NULL,
ADD COLUMN     "value" DECIMAL(14,2) NOT NULL,
ADD CONSTRAINT "RewardsFidelimax_pkey" PRIMARY KEY ("idVoucher");

-- DropTable
DROP TABLE "public"."Fidelimax_CodProd";

-- CreateIndex
CREATE UNIQUE INDEX "RewardsFidelimax_idVoucher_key" ON "public"."RewardsFidelimax"("idVoucher");
