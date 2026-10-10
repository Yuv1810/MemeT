import { cookies } from "next/headers";
import { db } from "./db";
import { getUser } from "./auth";
import { hashToken, randomToken } from "./security";
import { shipping } from "./catalog";
import { ApiError } from "./http";
export async function getBag(create = false) {
  const jar = await cookies(),
    token = jar.get("mm_bag")?.value;
  const guest = token ? await db.bag.findUnique({ where: { tokenHash: hashToken(token) } }) : null;
  const user = await getUser();
  if (user) {
    const existing = await db.bag.findUnique({ where: { userId: user.id } });
    if (existing) {
      if (guest && !guest.userId && guest.expiresAt > new Date() && guest.id !== existing.id) {
        await db.$transaction(async (tx) => {
          // Lock the guest bag so concurrent requests cannot merge it twice.
          const locked = await tx.$queryRaw<
            { id: string }[]
          >`SELECT "id" FROM "Bag" WHERE "id" = ${guest.id} FOR UPDATE`;
          if (!locked.length) return;
          await tx.$queryRaw`SELECT "id" FROM "Bag" WHERE "id" = ${existing.id} FOR UPDATE`;
          const items = await tx.bagItem.findMany({ where: { bagId: guest.id } });
          for (const item of items) {
            const old = await tx.bagItem.findUnique({
              where: { bagId_variantId: { bagId: existing.id, variantId: item.variantId } },
            });
            await tx.bagItem.upsert({
              where: { bagId_variantId: { bagId: existing.id, variantId: item.variantId } },
              create: { bagId: existing.id, variantId: item.variantId, quantity: item.quantity },
              update: { quantity: Math.min(10, (old?.quantity ?? 0) + item.quantity) },
            });
          }
          await tx.bag.delete({ where: { id: guest.id } });
        });
      }
      return existing;
    }
    if (guest && !guest.userId && guest.expiresAt > new Date())
      return db.bag.update({ where: { id: guest.id }, data: { userId: user.id } });
    // A signed-in user's bag is retained across devices and does not depend on a bag cookie.
    const newToken = randomToken();
    return db.bag.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tokenHash: hashToken(newToken),
        expiresAt: new Date(Date.now() + 365 * 86400000),
      },
      update: {},
    });
  }
  if (guest && !guest.userId && guest.expiresAt > new Date()) return guest;
  if (!create) return null;
  const newToken = randomToken(),
    expiresAt = new Date(Date.now() + 30 * 86400000);
  const bag = await db.bag.create({ data: { tokenHash: hashToken(newToken), expiresAt } });
  jar.set("mm_bag", newToken, {
    httpOnly: true,
    secure: process.env.APP_URL?.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return bag;
}
export async function bagSummary() {
  const bag = await getBag();
  const items = bag
    ? await db.bagItem.findMany({
        where: { bagId: bag.id },
        include: { variant: { include: { product: true } } },
        orderBy: { id: "asc" },
      })
    : [];
  const subtotalPaise = items.reduce(
    (sum, item) => sum + item.variant.pricePaise * item.quantity,
    0,
  );
  const shippingPaise = items.length ? shipping(subtotalPaise) : 0;
  return {
    items,
    count: items.reduce((n, item) => n + item.quantity, 0),
    subtotalPaise,
    shippingPaise,
    totalPaise: subtotalPaise + shippingPaise,
  };
}
export async function changeBag(variantId: string, quantity: number, mode: "add" | "set") {
  const bag = await getBag(true);
  if (!bag) throw new ApiError(400, "Couldn't open your bag.");
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Bag" WHERE "id" = ${bag.id} FOR UPDATE`;
    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant || !variant.active || !variant.product.active)
      throw new ApiError(400, "This item is currently unavailable.");
    const key = { bagId_variantId: { bagId: bag.id, variantId } };
    const item = await tx.bagItem.findUnique({ where: key });
    const next = mode === "add" ? (item?.quantity ?? 0) + quantity : quantity;
    if (next > 10) throw new ApiError(400, "You can add up to 10 of each size to your bag.");
    if (next === 0) await tx.bagItem.deleteMany({ where: { bagId: bag.id, variantId } });
    else
      await tx.bagItem.upsert({
        where: key,
        create: { bagId: bag.id, variantId, quantity: next },
        update: { quantity: next },
      });
  });
  return bagSummary();
}
