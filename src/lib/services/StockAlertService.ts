/**
 * Stock Alert Service
 * 
 * Monitors inventory levels and triggers notifications when stock falls below threshold.
 * Integrates with notification system for push notifications and in-app alerts.
 * 
 * NOTE: New schema fields (stockAlertEnabled, defaultLowStockThreshold, lowStockThreshold)
 * require `prisma db push` before full functionality is available.
 */

import prisma from '@/lib/db/client';
import UserNotificationService from '@/lib/services/UserNotificationService';

interface LowStockItem {
    menuId: bigint;
    menuName: string;
    stockQty: number;
    threshold: number;
}

interface CheckStockResult {
    hasLowStock: boolean;
    lowStockItems: LowStockItem[];
}

// Default threshold if merchant setting not available
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export class StockAlertService {
    /**
     * Check for low stock items after an order is completed
     * @param merchantId - Merchant ID
     * @param menuIds - Array of menu IDs from the order
     */
    static async checkAfterOrder(
        merchantId: bigint,
        menuIds: bigint[]
    ): Promise<CheckStockResult> {
        try {
            // Get merchant settings (use type assertion for new fields)
            const merchant = await prisma.merchant.findUnique({
                where: { id: merchantId },
            }) as { stockAlertEnabled?: boolean; defaultLowStockThreshold?: number } | null;

            // Default to enabled if field doesn't exist yet
            const alertEnabled = merchant?.stockAlertEnabled !== false;
            if (!alertEnabled) {
                return { hasLowStock: false, lowStockItems: [] };
            }

            const defaultThreshold = merchant?.defaultLowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;

            // Get menu items with stock tracking enabled
            const menus = await prisma.menu.findMany({
                where: {
                    id: { in: menuIds },
                    merchantId,
                    trackStock: true,
                    isActive: true,
                    deletedAt: null,
                },
                select: {
                    id: true,
                    name: true,
                    stockQty: true,
                }
            }) as Array<{ id: bigint; name: string; stockQty: number | null; lowStockThreshold?: number | null }>;

            const lowStockItems: LowStockItem[] = [];

            for (const menu of menus) {
                if (menu.stockQty === null) continue;

                // Use per-menu threshold if available, else merchant default
                const threshold = menu.lowStockThreshold ?? defaultThreshold;

                if (menu.stockQty <= threshold && menu.stockQty > 0) {
                    lowStockItems.push({
                        menuId: menu.id,
                        menuName: menu.name,
                        stockQty: menu.stockQty,
                        threshold,
                    });
                }
            }

            // If there are low stock items, send notifications
            if (lowStockItems.length > 0) {
                await this.sendLowStockNotifications(merchantId, lowStockItems);
            }

            return {
                hasLowStock: lowStockItems.length > 0,
                lowStockItems,
            };
        } catch (error) {
            console.error('[StockAlertService] Error checking stock:', error);
            return { hasLowStock: false, lowStockItems: [] };
        }
    }

    /**
     * Send low stock notifications to merchant staff
     */
    private static async sendLowStockNotifications(
        merchantId: bigint,
        items: LowStockItem[]
    ): Promise<void> {
        try {
            const itemNames = items.map(i => `${i.menuName} (${i.stockQty} left)`).join(', ');

            const title = items.length === 1
                ? `Low Stock: ${items[0].menuName}`
                : `Low Stock Alert: ${items.length} items`;

            const body = items.length === 1
                ? `Only ${items[0].stockQty} left in stock`
                : `Items running low: ${itemNames}`;

            // Create in-app notification for merchant staff
            await UserNotificationService.createForMerchant(
                merchantId,
                'STOCK',
                title,
                body,
                {
                    actionUrl: '/admin/dashboard/menu/stock-overview',
                    metadata: {
                        type: 'LOW_STOCK',
                        items: items.map(i => ({
                            menuId: String(i.menuId),
                            menuName: i.menuName,
                            stockQty: i.stockQty,
                            threshold: i.threshold,
                        })),
                    },
                }
            );

            console.log(`[StockAlertService] Sent low stock notification for ${items.length} items`);
        } catch (error) {
            console.error('[StockAlertService] Error sending notifications:', error);
        }
    }

    /**
     * Get all low stock items for a merchant
     */
    static async getLowStockItems(merchantId: bigint): Promise<LowStockItem[]> {
        try {
            // Get merchant default threshold (use type assertion for new field)
            const merchant = await prisma.merchant.findUnique({
                where: { id: merchantId },
            }) as { defaultLowStockThreshold?: number } | null;

            const defaultThreshold = merchant?.defaultLowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;

            const menus = await prisma.menu.findMany({
                where: {
                    merchantId,
                    trackStock: true,
                    isActive: true,
                    deletedAt: null,
                    stockQty: { not: null },
                },
                select: {
                    id: true,
                    name: true,
                    stockQty: true,
                }
            }) as Array<{ id: bigint; name: string; stockQty: number | null; lowStockThreshold?: number | null }>;

            return menus
                .filter(menu => {
                    if (menu.stockQty === null) return false;
                    const threshold = menu.lowStockThreshold ?? defaultThreshold;
                    return menu.stockQty <= threshold && menu.stockQty > 0;
                })
                .map(menu => ({
                    menuId: menu.id,
                    menuName: menu.name,
                    stockQty: menu.stockQty!,
                    threshold: menu.lowStockThreshold ?? defaultThreshold,
                }));
        } catch (error) {
            console.error('[StockAlertService] Error getting low stock items:', error);
            return [];
        }
    }
}

export default StockAlertService;
