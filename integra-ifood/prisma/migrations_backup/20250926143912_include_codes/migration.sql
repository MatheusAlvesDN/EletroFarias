-- CreateTable
CREATE TABLE "public"."Fidelimax_CodProd" (
    "codProd" INTEGER NOT NULL,
    "produto" TEXT NOT NULL,

    CONSTRAINT "Fidelimax_CodProd_pkey" PRIMARY KEY ("codProd")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fidelimax_CodProd_produto_key" ON "public"."Fidelimax_CodProd"("produto");
