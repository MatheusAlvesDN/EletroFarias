-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'MANAGER', 'USER');

-- CreateTable
CREATE TABLE "public"."DebitInvalidLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cpf" TEXT NOT NULL,
    "debitoReais" DECIMAL(12,2) NOT NULL,
    "descricaoEstorno" TEXT,
    "dataMov" TIMESTAMP(3) NOT NULL,
    "nome" TEXT,
    "documento" TEXT,
    "codigoResposta" INTEGER,
    "nunota" TEXT,
    "rawResponse" JSONB,

    CONSTRAINT "DebitInvalidLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RewardsFidelimax" (
    "idVoucher" TEXT NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() - '03:00:00'::interval),

    CONSTRAINT "RewardsFidelimax_pkey" PRIMARY KEY ("idVoucher")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebitInvalidLog_codigoResposta_idx" ON "public"."DebitInvalidLog"("codigoResposta" ASC);

-- CreateIndex
CREATE INDEX "DebitInvalidLog_cpf_idx" ON "public"."DebitInvalidLog"("cpf" ASC);

-- CreateIndex
CREATE INDEX "DebitInvalidLog_dataMov_idx" ON "public"."DebitInvalidLog"("dataMov" ASC);

-- CreateIndex
CREATE INDEX "RewardsFidelimax_cpf_idx" ON "public"."RewardsFidelimax"("cpf" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);
