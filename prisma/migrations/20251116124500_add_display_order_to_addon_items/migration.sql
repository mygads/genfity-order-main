-- AlterTable
ALTER TABLE "addon_items" ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "addon_items_display_order_idx" ON "addon_items"("display_order");
