/**
 * Submit Group Order
 * POST /api/public/group-order/[code]/submit
 * 
 * @description
 * Host submits the group order, combining all participant carts into one order.
 * Requirements:
 * - Minimum 2 participants
 * - At least 1 item total
 * - Only host can submit
 * 
 * Flow:
 * 1. Lock the session (status = LOCKED)
 * 2. Merge all carts into OrderItemInput[]
 * 3. Create order via existing order creation logic
 * 4. Update session with orderId (status = SUBMITTED)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { decimalToNumber } from '@/lib/utils/serializer';
import { Decimal } from '@prisma/client/runtime/library';
import userNotificationService from '@/lib/services/UserNotificationService';
import { SpecialPriceService } from '@/lib/services/SpecialPriceService';

interface RouteParams {
    params: Promise<{ code: string }>;
}

interface CartItem {
    cartItemId: string;
    menuId: string;
    menuName: string;
    price: number;
    quantity: number;
    addons?: Array<{
        id: string;
        name: string;
        price: number;
    }>;
    notes?: string;
}

interface AddonData {
    addonItemId: bigint;
    addonName: string;
    addonPrice: Decimal;
    quantity: number;
    subtotal: number;
}

interface OrderItemData {
    menuId: bigint;
    menuName: string;
    menuPrice: number;
    quantity: number;
    subtotal: number;
    notes?: string;
    addons: AddonData[];
    participantName: string; // Track which participant added this
}

export async function POST(req: NextRequest, context: RouteParams) {
    try {
        const { code } = await context.params;
        const sessionCode = code.toUpperCase();
        const body = await req.json();

        const {
            deviceId,
            customerName,
            customerEmail,
            customerPhone,
            paymentMethod: _paymentMethod = 'CASH_ON_COUNTER',
            notes,
        } = body;

        // ========================================
        // VALIDATION
        // ========================================

        if (!deviceId) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Device ID is required',
            }, { status: 400 });
        }

        if (!customerName || !customerEmail) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Customer name and email are required for order submission',
            }, { status: 400 });
        }

        // Find session with full details
        const session = await prisma.groupOrderSession.findFirst({
            where: {
                sessionCode,
                status: 'OPEN',
                expiresAt: { gt: new Date() },
            },
            include: {
                participants: {
                    orderBy: { joinedAt: 'asc' },
                },
                merchant: true,
            },
        });

        if (!session) {
            return NextResponse.json({
                success: false,
                error: 'SESSION_NOT_FOUND',
                message: 'Session not found, expired, or already submitted',
            }, { status: 404 });
        }

        // Verify caller is host
        const host = session.participants.find(p => p.isHost && p.deviceId === deviceId);
        if (!host) {
            return NextResponse.json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'Only the host can submit the order',
            }, { status: 403 });
        }

        // Check minimum participants (at least 2)
        if (session.participants.length < 2) {
            return NextResponse.json({
                success: false,
                error: 'INSUFFICIENT_PARTICIPANTS',
                message: 'Group order requires at least 2 participants',
            }, { status: 400 });
        }

        // ========================================
        // MERGE ALL CARTS
        // ========================================

        const round2 = (num: number): number => Math.round(num * 100) / 100;

        // Collect all menu IDs for batch fetch
        const allMenuIds: bigint[] = [];
        const allAddonIds: bigint[] = [];

        for (const participant of session.participants) {
            const cartItems = participant.cartItems as unknown as CartItem[];
            if (!Array.isArray(cartItems)) continue;

            for (const item of cartItems) {
                allMenuIds.push(BigInt(item.menuId));
                if (item.addons) {
                    for (const addon of item.addons) {
                        allAddonIds.push(BigInt(addon.id));
                    }
                }
            }
        }

        // Check if there are any items
        if (allMenuIds.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'NO_ITEMS',
                message: 'At least one participant must have items in their cart',
            }, { status: 400 });
        }

        // Batch fetch menus and addons
        const menus = await prisma.menu.findMany({
            where: {
                id: { in: allMenuIds },
                merchantId: session.merchant.id,
            },
        });
        const menuMap = new Map(menus.map(m => [m.id.toString(), m]));

        const addons = allAddonIds.length > 0
            ? await prisma.addonItem.findMany({
                where: { id: { in: allAddonIds } },
            })
            : [];
        const addonMap = new Map(addons.map(a => [a.id.toString(), a]));

        // Get promo prices
        const activePromoPrices = await SpecialPriceService.getActivePromoPrices(allMenuIds);

        // Build order items
        let subtotal = 0;
        const orderItemsData: OrderItemData[] = [];

        for (const participant of session.participants) {
            const cartItems = participant.cartItems as unknown as CartItem[];
            if (!Array.isArray(cartItems) || cartItems.length === 0) continue;

            for (const item of cartItems) {
                const menu = menuMap.get(item.menuId);
                if (!menu || !menu.isActive || menu.deletedAt) {
                    console.warn(`[GROUP ORDER] Skipping unavailable menu: ${item.menuId}`);
                    continue;
                }

                // Check stock
                if (menu.trackStock && (menu.stockQty === null || menu.stockQty < item.quantity)) {
                    return NextResponse.json({
                        success: false,
                        error: 'INSUFFICIENT_STOCK',
                        message: `Insufficient stock for "${menu.name}" (ordered by ${participant.name})`,
                    }, { status: 400 });
                }

                // Get effective price (promo or regular)
                const promoPrice = activePromoPrices.get(menu.id.toString());
                const originalPrice = decimalToNumber(menu.price);
                const effectivePrice = promoPrice ?? originalPrice;
                const menuPrice = round2(effectivePrice);
                let itemTotal = round2(menuPrice * item.quantity);

                // Process addons
                const addonData: AddonData[] = [];
                if (item.addons && item.addons.length > 0) {
                    for (const addonItem of item.addons) {
                        const addon = addonMap.get(addonItem.id);
                        if (addon && addon.isActive && !addon.deletedAt) {
                            const addonPrice = round2(decimalToNumber(addon.price));
                            const addonQty = 1; // Addon quantity matches item quantity in cart design
                            const addonSubtotal = round2(addonPrice * addonQty * item.quantity);
                            itemTotal = round2(itemTotal + addonSubtotal);

                            addonData.push({
                                addonItemId: addon.id,
                                addonName: addon.name,
                                addonPrice: addon.price,
                                quantity: addonQty,
                                subtotal: round2(addonPrice * addonQty),
                            });
                        }
                    }
                }

                subtotal = round2(subtotal + itemTotal);

                orderItemsData.push({
                    menuId: menu.id,
                    menuName: menu.name,
                    menuPrice,
                    quantity: item.quantity,
                    subtotal: itemTotal,
                    notes: item.notes || undefined,
                    addons: addonData,
                    participantName: participant.name,
                });
            }
        }

        if (orderItemsData.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'NO_VALID_ITEMS',
                message: 'No valid items found in carts. Some items may be unavailable.',
            }, { status: 400 });
        }

        // ========================================
        // CALCULATE FEES
        // ========================================

        const merchant = session.merchant;

        const taxPercentage = merchant.enableTax && merchant.taxPercentage
            ? Number(merchant.taxPercentage)
            : 0;
        const taxAmount = round2(subtotal * (taxPercentage / 100));

        const serviceChargePercent = merchant.enableServiceCharge && merchant.serviceChargePercent
            ? Number(merchant.serviceChargePercent)
            : 0;
        const serviceChargeAmount = round2(subtotal * (serviceChargePercent / 100));

        const packagingFeeAmount = (session.orderType === 'TAKEAWAY' && merchant.enablePackagingFee && merchant.packagingFeeAmount)
            ? round2(Number(merchant.packagingFeeAmount))
            : 0;

        const totalAmount = round2(subtotal + taxAmount + serviceChargeAmount + packagingFeeAmount);

        // ========================================
        // CREATE ORDER
        // ========================================

        // Find or create customer
        let customer = await prisma.customer.findUnique({
            where: { email: customerEmail.toLowerCase() },
        });

        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    name: customerName,
                    email: customerEmail.toLowerCase(),
                    phone: customerPhone || null,
                    isActive: true,
                },
            });
        }

        // Generate order number
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        const orderCount = await prisma.order.count({
            where: {
                merchantId: merchant.id,
                placedAt: { gte: todayStart, lte: todayEnd },
            },
        });

        const sequenceNumber = String(orderCount + 1).padStart(4, '0');
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const orderNumber = `ORD-${dateStr}-${sequenceNumber}${randomSuffix}`;

        // Create order in transaction
        const order = await prisma.$transaction(async (tx) => {
            // Lock session
            await tx.groupOrderSession.update({
                where: { id: session.id },
                data: { status: 'LOCKED' },
            });

            // Create order
            const createdOrder = await tx.order.create({
                data: {
                    merchantId: merchant.id,
                    customerId: customer!.id,
                    orderNumber,
                    orderType: session.orderType,
                    tableNumber: session.tableNumber || null,
                    status: 'PENDING',
                    subtotal,
                    taxAmount,
                    serviceChargeAmount,
                    packagingFeeAmount,
                    totalAmount,
                    notes: notes || `Group Order: ${session.participants.map(p => p.name).join(', ')}`,
                },
            });

            // Create order items
            for (const itemData of orderItemsData) {
                const orderItem = await tx.orderItem.create({
                    data: {
                        orderId: createdOrder.id,
                        menuId: itemData.menuId,
                        menuName: itemData.menuName,
                        menuPrice: itemData.menuPrice,
                        quantity: itemData.quantity,
                        subtotal: itemData.subtotal,
                        notes: itemData.notes ? `[${itemData.participantName}] ${itemData.notes}` : `[${itemData.participantName}]`,
                    },
                });

                if (itemData.addons.length > 0) {
                    await tx.orderItemAddon.createMany({
                        data: itemData.addons.map(addon => ({
                            orderItemId: orderItem.id,
                            addonItemId: addon.addonItemId,
                            addonName: addon.addonName,
                            addonPrice: addon.addonPrice,
                            quantity: addon.quantity,
                            subtotal: addon.subtotal,
                        })),
                    });
                }
            }

            // Update session with order ID and status
            await tx.groupOrderSession.update({
                where: { id: session.id },
                data: {
                    orderId: createdOrder.id,
                    status: 'SUBMITTED',
                },
            });

            return createdOrder;
        });

        // Decrement stock (non-blocking)
        for (const itemData of orderItemsData) {
            try {
                const menu = await prisma.menu.findUnique({
                    where: { id: itemData.menuId },
                });

                if (menu && menu.trackStock && menu.stockQty !== null) {
                    const newQty = menu.stockQty - itemData.quantity;
                    await prisma.menu.update({
                        where: { id: menu.id },
                        data: {
                            stockQty: newQty,
                            isActive: newQty > 0,
                        },
                    });

                    if (newQty <= 0) {
                        userNotificationService.notifyStockOut(merchant.id, menu.name, menu.id).catch(err => {
                            console.error('⚠️ Stock notification failed:', err);
                        });
                    }
                }
            } catch (stockError) {
                console.error('⚠️ Stock decrement failed (non-critical):', stockError);
            }
        }

        // Update customer stats
        await prisma.customer.update({
            where: { id: customer!.id },
            data: {
                totalOrders: { increment: 1 },
                totalSpent: { increment: totalAmount },
                lastOrderAt: new Date(),
            },
        });

        // Send notification
        userNotificationService.notifyNewOrder(
            merchant.id,
            order.id,
            orderNumber,
            totalAmount
        ).catch(err => {
            console.error('⚠️ Order notification failed:', err);
        });

        console.log(`[GROUP ORDER] Order submitted: ${orderNumber} from session ${sessionCode}`);

        // Calculate split bill data
        const splitBill = session.participants.map(p => {
            const participantSubtotal = decimalToNumber(p.subtotal);
            const shareRatio = subtotal > 0 ? participantSubtotal / subtotal : 0;
            return {
                participantId: p.id.toString(),
                participantName: p.name,
                isHost: p.isHost,
                subtotal: participantSubtotal,
                taxShare: round2(taxAmount * shareRatio),
                serviceChargeShare: round2(serviceChargeAmount * shareRatio),
                packagingFeeShare: round2(packagingFeeAmount * shareRatio),
                total: round2(participantSubtotal + (taxAmount * shareRatio) + (serviceChargeAmount * shareRatio) + (packagingFeeAmount * shareRatio)),
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                order: {
                    id: order.id.toString(),
                    orderNumber,
                    status: order.status,
                    subtotal,
                    taxAmount,
                    serviceChargeAmount,
                    packagingFeeAmount,
                    totalAmount,
                    itemCount: orderItemsData.length,
                },
                sessionCode,
                splitBill,
                merchant: {
                    code: merchant.code,
                    name: merchant.name,
                    currency: merchant.currency,
                },
            },
            message: 'Group order submitted successfully',
        }, { status: 201 });

    } catch (error) {
        console.error('[GROUP ORDER] Submit order error:', error);
        return NextResponse.json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to submit group order',
        }, { status: 500 });
    }
}
