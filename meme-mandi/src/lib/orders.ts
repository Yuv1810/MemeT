import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { ApiError } from "./http";
import { getBag } from "./bag";
import { shipping } from "./catalog";
export const addressSchema = z.object({
  first_name: z.string().trim().min(2).max(20),
  last_name: z.string().trim().min(1).max(20),
  address1: z.string().trim().min(5).max(80),
  address2: z.string().trim().max(80).default(""),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
  city: z.string().trim().min(2).max(40),
  zip: z.string().regex(/^[1-9]\d{5}$/, "Enter a valid six-digit PIN code."),
  province: z.string().trim().min(2).max(40),
});
export async function placeOrder(user: { id: string; email: string }, body: unknown) {
  const { address, checkoutKey } = z
    .object({ address: addressSchema, checkoutKey: z.uuid() })
    .parse(body);
  const existing = await db.order.findUnique({ where: { checkoutKey } });
  if (existing) {
    if (existing.userId !== user.id)
      throw new ApiError(409, "Please refresh your bag and try again.");
    return existing;
  }
  const bag = await getBag();
  if (!bag) throw new ApiError(400, "Your bag is empty.");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Bag" WHERE "id" = ${bag.id} FOR UPDATE`;
    const duplicate = await tx.order.findUnique({ where: { checkoutKey } });
    if (duplicate) {
      if (duplicate.userId !== user.id)
        throw new ApiError(409, "Please refresh your bag and try again.");
      return duplicate;
    }
    const items = await tx.bagItem.findMany({
      where: { bagId: bag.id },
      include: { variant: { include: { product: true } } },
    });
    if (!items.length) throw new ApiError(400, "Your bag is empty.");
    if (items.some((item) => !item.variant.active || !item.variant.product.active))
      throw new ApiError(409, "An item in your bag is no longer available. Remove it to continue.");
    const subtotalPaise = items.reduce(
      (sum, item) => sum + item.variant.pricePaise * item.quantity,
      0,
    );
    const shippingPaise = shipping(subtotalPaise);
    const order = await tx.order.create({
      data: {
        userId: user.id,
        checkoutKey,
        number: `MM${randomBytes(6).toString("hex").toUpperCase()}`,
        shippingAddress: { ...address, email: user.email, country: "India", country_code: "IN" },
        subtotalPaise,
        shippingPaise,
        totalPaise: subtotalPaise + shippingPaise,
        items: {
          create: items.map(({ variant: v, quantity }) => ({
            variantId: v.id,
            name: v.product.name,
            image: v.product.image,
            sku: v.sku,
            qikinkSku: v.qikinkSku,
            color: v.color,
            size: v.size,
            pricePaise: v.pricePaise,
            quantity,
            searchFromMyProducts: v.searchFromMyProducts,
            designs: v.designs ?? [],
          })),
        },
      },
    });
    await tx.bagItem.deleteMany({ where: { bagId: bag.id } });
    return order;
  });
}
