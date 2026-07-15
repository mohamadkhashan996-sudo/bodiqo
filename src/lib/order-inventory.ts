import { prisma } from "@/lib/prisma";

type OrderItemRow = {
  productId: string | null;
  variantId: string | null;
  quantity: number;
};

/** Hold stock while payment is pending (PayPal, Stripe, Crypto). */
export async function reserveAwaitingPayment(items: OrderItemRow[]) {
  for (const item of items) {
    if (item.variantId) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { inventory: { decrement: item.quantity } },
      });
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
      });
      if (variant && variant.inventory <= 0) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { inStock: false, inventory: 0 },
        });
      }
      continue;
    }
    if (!item.productId) continue;
    await prisma.product.update({
      where: { id: item.productId },
      data: { reserved: { increment: item.quantity } },
    });
  }
}

/** Finalize inventory after successful payment. */
export async function fulfillPaidOrder(items: OrderItemRow[]) {
  for (const item of items) {
    if (item.variantId) {
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { soldCount: { increment: item.quantity } },
        });
      }
      continue;
    }
    if (!item.productId) continue;
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    if (!product) continue;

    const newInventory = Math.max(0, product.inventory - item.quantity);
    const newReserved = Math.max(0, product.reserved - item.quantity);
    await prisma.product.update({
      where: { id: product.id },
      data: {
        inventory: newInventory,
        reserved: newReserved,
        soldCount: { increment: item.quantity },
        inStock: newInventory - newReserved > 0,
      },
    });
  }
}

/** Immediate fulfillment for manual / no-payment orders. */
export async function fulfillManualOrder(items: OrderItemRow[]) {
  for (const item of items) {
    if (item.variantId) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { inventory: { decrement: item.quantity } },
      });
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
      });
      if (variant && variant.inventory <= 0) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { inStock: false, inventory: 0 },
        });
      }
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { soldCount: { increment: item.quantity } },
        });
      }
      continue;
    }
    if (!item.productId) continue;
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        inventory: { decrement: item.quantity },
        soldCount: { increment: item.quantity },
      },
    });
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    if (product && product.inventory <= 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: { inStock: false, inventory: 0 },
      });
    }
  }
}

/** Restore stock on refund or cancelled awaiting-payment order. */
export async function restoreOrderStock(items: OrderItemRow[], wasPaid: boolean) {
  for (const item of items) {
    if (item.variantId) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: {
          inventory: { increment: item.quantity },
          inStock: true,
        },
      });
      if (wasPaid && item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            soldCount: { decrement: item.quantity },
          },
        });
      }
      continue;
    }
    if (!item.productId) continue;
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    if (!product) continue;

    if (wasPaid) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          inventory: { increment: item.quantity },
          soldCount: { decrement: Math.min(item.quantity, product.soldCount) },
          inStock: true,
        },
      });
    } else {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          reserved: { decrement: Math.min(item.quantity, product.reserved) },
        },
      });
    }
  }
}

export async function markOrderPaid(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.status === "PAID" || order.paidAt) return order;

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID", paidAt: new Date() },
  });

  await fulfillPaidOrder(order.items);

  if (order.couponCode) {
    await prisma.coupon.updateMany({
      where: { code: order.couponCode },
      data: { usedCount: { increment: 1 } },
    });
  }

  return order;
}
