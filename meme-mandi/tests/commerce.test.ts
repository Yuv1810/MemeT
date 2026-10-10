import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/lib/security";
import { shipping } from "../src/lib/format";
import { buildQikinkPayload } from "../src/lib/qikink";
import { productSchema } from "../src/lib/product-validation";
import type { Order, OrderItem } from "@prisma/client";
test("passwords use independent salts and reject incorrect passwords", async () => {
  const a = await hashPassword("a-long-password-123"),
    b = await hashPassword("a-long-password-123");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("a-long-password-123", a), true);
  assert.equal(await verifyPassword("incorrect", a), false);
});
test("free shipping threshold is exact in paise", () => {
  assert.equal(shipping(149899), 7900);
  assert.equal(shipping(149900), 0);
});
const order = {
  number: "MM123ABC",
  totalPaise: 87800,
  shippingAddress: { first_name: "Test", country_code: "IN" },
  items: [
    {
      name: "Test tee",
      qikinkSku: "Mrnhs-Bk-L",
      sku: "OWN-001",
      quantity: 1,
      pricePaise: 79900,
      searchFromMyProducts: true,
      designs: [],
    },
  ],
} as unknown as Order & { items: OrderItem[] };
test("Qikink payload uses supplier SKU, rupees, COD, and saved address", () => {
  const p = buildQikinkPayload(order);
  assert.equal(p.line_items[0].sku, "Mrnhs-Bk-L");
  assert.equal(p.line_items[0].price, 799);
  assert.equal(p.total_order_value, 878);
  assert.equal(p.gateway, "cash_on_delivery");
  assert.equal(p.qikink_shipping, 1);
  assert.equal("auth_token" in p, false);
});
test("Qikink rejects missing SKUs, missing artwork, and invalid order numbers", () => {
  assert.throws(() =>
    buildQikinkPayload({ ...order, items: [{ ...order.items[0], qikinkSku: null }] }),
  );
  assert.throws(() =>
    buildQikinkPayload({ ...order, items: [{ ...order.items[0], searchFromMyProducts: false }] }),
  );
  assert.throws(() => buildQikinkPayload({ ...order, number: "contains-hyphens" }));
});
test("custom print artwork includes placement and dimensions", () => {
  const designs = [
    {
      design_code: "DESIGN01",
      width_inches: 10,
      height_inches: 12,
      placement_sku: "fr",
      design_link: "https://example.com/print.png",
    },
  ];
  const p = buildQikinkPayload({
    ...order,
    items: [{ ...order.items[0], searchFromMyProducts: false, designs }],
  });
  assert.deepEqual(p.line_items[0].designs, designs);
});
test("catalog validation rejects duplicate colour and size mappings", () => {
  const v = {
    sku: "ONE",
    color: "Black",
    colorHex: "#000000",
    size: "M",
    pricePaise: 79900,
    active: true,
    searchFromMyProducts: false,
    designs: [],
  };
  const p = {
    name: "Test tee",
    slug: "test-tee",
    description: "Original test tee for the store",
    category: "T-shirts",
    fit: "Oversized",
    fabric: "Cotton",
    image: "/images/test.png",
    active: true,
    variants: [v, { ...v, sku: "TWO" }],
  };
  assert.equal(productSchema.safeParse(p).success, false);
});
