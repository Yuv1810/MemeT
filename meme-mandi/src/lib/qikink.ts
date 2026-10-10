import { z } from "zod";
import type { Order, OrderItem } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./http";
export const designSchema = z.object({
  design_code: z.string().regex(/^[A-Za-z0-9]{1,15}$/),
  width_inches: z.number().positive().max(30),
  height_inches: z.number().positive().max(40),
  placement_sku: z.enum(["fr", "bk", "lp", "rp", "ls", "rs"]),
  design_link: z
    .url()
    .refine((url) => url.startsWith("https://"), "Artwork must use a public HTTPS URL."),
  mockup_link: z.url().optional(),
});
export function buildQikinkPayload(order: Order & { items: OrderItem[] }) {
  if (!/^[A-Za-z0-9]{1,15}$/.test(order.number))
    throw new ApiError(400, "The order number must be alphanumeric and at most 15 characters.");
  const line_items = order.items.map((item) => {
    if (!item.qikinkSku)
      throw new ApiError(
        400,
        `Map the Qikink SKU for ${item.name}, ${item.color}, ${item.size} before fulfillment.`,
      );
    const designs = z.array(designSchema).parse(item.designs);
    if (!item.searchFromMyProducts && !designs.length)
      throw new ApiError(400, `Add print artwork for ${item.name} before fulfillment.`);
    return {
      sku: item.qikinkSku,
      quantity: item.quantity,
      price: item.pricePaise / 100,
      search_from_my_products: item.searchFromMyProducts,
      ...(designs.length ? { designs } : {}),
    };
  });
  return {
    order_number: order.number,
    qikink_shipping: 1,
    gateway: "cash_on_delivery",
    total_order_value: order.totalPaise / 100,
    line_items,
    shipping_address: order.shippingAddress,
  };
}
export async function submitToQikink(orderId: string) {
  if (process.env.QIKINK_ENABLED !== "true" || !process.env.QIKINK_AUTH_TOKEN)
    throw new ApiError(503, "Connect your Qikink account before submitting orders.");
  const endpoint =
    process.env.QIKINK_API_URL || "https://qikink.com/erp2/index.php/api/createOrder";
  const url = new URL(endpoint);
  if (
    url.protocol !== "https:" ||
    (url.hostname !== "qikink.com" && !url.hostname.endsWith(".qikink.com"))
  )
    throw new ApiError(503, "Configure an official HTTPS Qikink endpoint.");
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new ApiError(404, "Order not found.");
  if (order.status === "CANCELLED")
    throw new ApiError(400, "Cancelled orders cannot be submitted.");
  const payload = buildQikinkPayload(order);
  const claim = await db.order.updateMany({
    where: {
      id: orderId,
      status: { not: "CANCELLED" },
      updatedAt: order.updatedAt,
      fulfillmentStatus: { in: ["NOT_SUBMITTED", "REJECTED"] },
    },
    data: { fulfillmentStatus: "SUBMITTING", fulfillmentMessage: null },
  });
  if (!claim.count)
    throw new ApiError(
      409,
      "This order has been submitted or needs manual reconciliation. Check it in Qikink before retrying.",
    );
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, auth_token: process.env.QIKINK_AUTH_TOKEN }),
      signal: AbortSignal.timeout(25000),
    });
    const result = (await response.json()) as {
      code?: number;
      order_id?: string | number;
      msg?: string;
    };
    if (response.ok && Number(result.code) === 1 && result.order_id) {
      return await db.order.update({
        where: { id: orderId },
        data: {
          fulfillmentStatus: "SUBMITTED",
          status: "PROCESSING",
          qikinkOrderId: String(result.order_id),
          fulfillmentMessage: "Accepted by Qikink",
        },
      });
    }
    // Only an explicit documented rejection is safe to retry. An ambiguous result may have created an order.
    const rejected = response.ok && result.code !== undefined && Number(result.code) !== 1;
    await db.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: rejected ? "REJECTED" : "REVIEW_REQUIRED",
        fulfillmentMessage: rejected
          ? "Qikink rejected this order. Review the SKU and artwork in your dashboard."
          : "Check this order in Qikink before any retry.",
      },
    });
    throw new ApiError(
      502,
      rejected
        ? "Qikink rejected the order. Review its configuration."
        : "Qikink returned an unexpected response. Check its dashboard before retrying.",
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    await db.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: "REVIEW_REQUIRED",
        fulfillmentMessage:
          "Delivery is uncertain. Check the order number in Qikink; do not submit again until reconciled.",
      },
    });
    throw new ApiError(
      502,
      "We couldn't confirm submission. Check this order in Qikink before trying again.",
    );
  }
}
