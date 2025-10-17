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
    "saldoPreEstorno" DECIMAL(14,2),
    "pontosEstornados" INTEGER,
    "codigoResposta" INTEGER NOT NULL,
    "nunota" TEXT,
    "rawResponse" JSONB,

    CONSTRAINT "DebitInvalidLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebitInvalidLog_cpf_idx" ON "public"."DebitInvalidLog"("cpf");

-- CreateIndex
CREATE INDEX "DebitInvalidLog_codigoResposta_idx" ON "public"."DebitInvalidLog"("codigoResposta");

-- CreateIndex
CREATE INDEX "DebitInvalidLog_dataMov_idx" ON "public"."DebitInvalidLog"("dataMov");
