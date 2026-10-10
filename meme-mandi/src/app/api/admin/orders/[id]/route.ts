import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { buildQikinkPayload, submitToQikink } from "@/lib/qikink";
import { ApiError, enforceOrigin, readJson, route } from "@/lib/http";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return route(async () => {
    await requireUser(true);
    const { id } = await context.params;
    const order = await db.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new ApiError(404, "Order not found.");
    return { payload: buildQikinkPayload(order) };
  });
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return route(async () => {
    enforceOrigin(request);
    await requireUser(true);
    const { id } = await context.params;
    return { order: await submitToQikink(id) };
  });
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return route(async () => {
    enforceOrigin(request);
    await requireUser(true);
    const { id } = await context.params;
    const body = await readJson(request);
    if (body.action === "sync_print") {
      return db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`;
        const order = await tx.order.findUnique({
          where: { id },
          include: { items: { include: { variant: true } } },
        });
        if (!order) throw new ApiError(404, "Order not found.");
        if (
          !["NOT_SUBMITTED", "REJECTED"].includes(order.fulfillmentStatus) ||
          order.status === "CANCELLED"
        )
          throw new ApiError(409, "Print details can only change before submission.");
        for (const item of order.items) {
          if (
            item.variant.color !== item.color ||
            item.variant.size !== item.size ||
            item.variant.sku !== item.sku
          )
            throw new ApiError(
              409,
              "A catalog variant has changed. Restore its original SKU, colour, and size before syncing print details.",
            );
          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              qikinkSku: item.variant.qikinkSku,
              designs: item.variant.designs ?? [],
              searchFromMyProducts: item.variant.searchFromMyProducts,
            },
          });
        }
        return {
          order: await tx.order.update({
            where: { id },
            data: {
              fulfillmentMessage:
                "Print configuration refreshed from catalog. Review the payload before submission.",
            },
          }),
        };
      });
    }
    const { status } = z
      .object({ status: z.enum(["SHIPPED", "DELIVERED", "CANCELLED"]) })
      .parse(body);
    const order = await db.order.findUnique({ where: { id } });
    if (!order) throw new ApiError(404, "Order not found.");
    if (
      status === "CANCELLED" &&
      order.fulfillmentStatus !== "NOT_SUBMITTED" &&
      order.fulfillmentStatus !== "REJECTED"
    )
      throw new ApiError(409, "Submitted orders must first be cancelled in Qikink.");
    if (order.status === "CANCELLED" || order.status === "DELIVERED")
      throw new ApiError(409, "This order is already closed.");
    if (status === "DELIVERED" && order.status !== "SHIPPED")
      throw new ApiError(400, "Mark the order shipped before delivered.");
    if (status === "SHIPPED" && order.fulfillmentStatus !== "SUBMITTED")
      throw new ApiError(400, "Submit the order before marking it shipped.");
    const changed = await db.order.updateMany({
      where: {
        id,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        updatedAt: order.updatedAt,
      },
      data: { status },
    });
    if (!changed.count)
      throw new ApiError(
        409,
        "The order changed while you were reviewing it. Refresh and try again.",
      );
    return { order: await db.order.findUnique({ where: { id } }) };
  });
}
