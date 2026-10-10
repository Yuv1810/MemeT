import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/security";
const db = new PrismaClient(),
  origin = process.env.APP_URL!;
if (
  !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin) ||
  process.env.MAIL_PROVIDER !== "local" ||
  process.env.QIKINK_ENABLED === "true"
)
  throw new Error("Integration tests require localhost, local email, and disabled Qikink.");
const marker = `qa${Date.now()}`,
  email = `${marker}@example.test`,
  adminEmail = `${marker}admin@example.test`,
  secondEmail = `${marker}other@example.test`,
  password = `Test${randomUUID()}!`;
const createdProductIds: string[] = [],
  jars = {
    customer: new Map<string, string>(),
    admin: new Map<string, string>(),
    other: new Map<string, string>(),
  };
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  jar = jars.customer,
  requestOrigin = origin,
) {
  const r = await fetch(`${origin}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: requestOrigin,
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  for (const cookie of r.headers.getSetCookie()) {
    const [pair] = cookie.split(";"),
      index = pair.indexOf("=");
    jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return { status: r.status, data: await r.json() };
}
async function mailCode(to: string, purpose: string) {
  for (const file of (await readdir(".local-mail")).sort().reverse()) {
    const value = JSON.parse(await readFile(join(".local-mail", file), "utf8"));
    if (value.to === to && value.purpose === purpose) return value.code as string;
  }
  throw new Error("Expected development email was not written.");
}
function check(result: { status: number; data: unknown }, status: number) {
  assert.equal(result.status, status, JSON.stringify(result.data));
}
async function main() {
  const product = await db.product.create({
    data: {
      name: "QA test tee",
      slug: marker,
      description: "Disposable test-only product",
      category: "T-shirts",
      image: "/images/kal-dekhenge-black-tee.png",
      variants: {
        create: {
          sku: marker,
          color: "Black",
          colorHex: "#000000",
          size: "L",
          pricePaise: 79900,
          searchFromMyProducts: true,
          qikinkSku: "Mrnhs-Bk-L",
        },
      },
    },
    include: { variants: true },
  });
  createdProductIds.push(product.id);
  const variantId = product.variants[0].id;
  check(await request("/api/bag", "POST", { variantId, quantity: 1 }), 200);
  check(await request("/api/auth/register", "POST", { email, name: "QA customer", password }), 200);
  const before = await request("/api/auth/login", "POST", { email, password });
  check(before, 200);
  assert.equal(before.data.needsVerification, true);
  const code = await mailCode(email, "VERIFY_EMAIL");
  check(await request("/api/auth/verify", "POST", { email, code: "000000" }), 400);
  check(await request("/api/auth/verify", "POST", { email, code }), 200);
  check(await request("/api/auth/verify", "POST", { email, code }), 400);
  const me = await request("/api/auth/me");
  check(me, 200);
  assert.equal(me.data.user.email, email);
  assert.equal((await request("/api/bag")).data.count, 1);
  check(await request("/api/admin/products"), 403);
  check(await request("/api/admin/products", "GET", undefined, new Map()), 401);
  check(await request("/api/bag", "PATCH", { variantId, quantity: 11 }), 400);
  check(await request("/api/bag", "PATCH", { variantId, quantity: -1 }), 400);
  check(
    await request(
      "/api/bag",
      "POST",
      { variantId, quantity: 1 },
      jars.customer,
      "https://evil.example",
    ),
    403,
  );
  const additions = await Promise.all([
    request("/api/bag", "POST", { variantId, quantity: 1 }),
    request("/api/bag", "POST", { variantId, quantity: 1 }),
  ]);
  additions.forEach((r) => check(r, 200));
  assert.equal((await request("/api/bag")).data.count, 3);
  check(await request("/api/bag", "PATCH", { variantId, quantity: 1 }), 200);
  const body = {
    checkoutKey: randomUUID(),
    address: {
      first_name: "QA",
      last_name: "Customer",
      address1: "Test-only address 1",
      address2: "",
      phone: "9876543210",
      city: "Mumbai",
      province: "Maharashtra",
      zip: "400001",
    },
    totalPaise: 1,
  };
  const checkout = await Promise.all([
    request("/api/orders", "POST", body),
    request("/api/orders", "POST", body),
  ]);
  checkout.forEach((r) => check(r, 200));
  assert.equal(checkout[0].data.order.id, checkout[1].data.order.id);
  assert.equal(checkout[0].data.order.totalPaise, 87800);
  const orderId = checkout[0].data.order.id;
  assert.equal((await request("/api/bag")).data.count, 0);
  await db.productVariant.update({ where: { id: variantId }, data: { pricePaise: 89900 } });
  const history = await request("/api/orders");
  assert.equal(history.data.orders[0].items[0].pricePaise, 79900);
  assert.equal(history.data.orders[0].items[0].qikinkSku, "Mrnhs-Bk-L");
  check(await request("/api/admin/orders/" + orderId, "POST", {}), 403);
  await db.user.create({
    data: {
      email: adminEmail,
      name: "QA admin",
      role: "ADMIN",
      emailVerifiedAt: new Date(),
      passwordHash: await hashPassword(password),
    },
  });
  check(await request("/api/auth/login", "POST", { email: adminEmail, password }, jars.admin), 200);
  const newProduct = {
    name: "QA draft",
    slug: `${marker}-draft`,
    description: "Disposable admin-created product",
    category: "T-shirts",
    fit: "Oversized",
    fabric: "Cotton",
    image: "/images/kal-dekhenge-black-tee.png",
    active: false,
    variants: [
      {
        sku: `${marker}-draft`,
        color: "Black",
        colorHex: "#000000",
        size: "M",
        pricePaise: 69900,
        compareAtPaise: null,
        active: true,
        searchFromMyProducts: false,
        designs: [],
      },
    ],
  };
  const created = await request("/api/admin/products", "POST", newProduct, jars.admin);
  check(created, 200);
  createdProductIds.push(created.data.product.id);
  const updated = await request(
    `/api/admin/products/${created.data.product.id}`,
    "PUT",
    { ...created.data.product, name: "QA updated draft", variants: created.data.product.variants },
    jars.admin,
  );
  check(updated, 200);
  assert.equal(updated.data.product.name, "QA updated draft");
  check(
    await request("/api/admin/orders/" + orderId, "PATCH", { action: "sync_print" }, jars.admin),
    200,
  );
  const payload = await request("/api/admin/orders/" + orderId, "GET", undefined, jars.admin);
  check(payload, 200);
  assert.equal(payload.data.payload.line_items[0].price, 799);
  assert.equal(payload.data.payload.line_items[0].sku, "Mrnhs-Bk-L");
  check(await request("/api/admin/orders/" + orderId, "POST", {}, jars.admin), 503);
  check(
    await request("/api/admin/orders/" + orderId, "PATCH", { status: "DELIVERED" }, jars.admin),
    400,
  );
  check(
    await request("/api/admin/orders/" + orderId, "PATCH", { status: "CANCELLED" }, jars.admin),
    200,
  );
  check(
    await request(
      "/api/auth/register",
      "POST",
      { email: secondEmail, name: "QA other", password },
      jars.other,
    ),
    200,
  );
  check(
    await request(
      "/api/auth/verify",
      "POST",
      { email: secondEmail, code: await mailCode(secondEmail, "VERIFY_EMAIL") },
      jars.other,
    ),
    200,
  );
  assert.equal((await request("/api/orders", "GET", undefined, jars.other)).data.orders.length, 0);
  assert.equal((await request("/api/bag", "GET", undefined, jars.other)).data.count, 0);
  check(await request("/api/auth/forgot", "POST", { email }), 200);
  const resetCode = await mailCode(email, "RESET_PASSWORD"),
    nextPassword = password + "new";
  check(
    await request("/api/auth/reset", "POST", { email, code: resetCode, password: nextPassword }),
    200,
  );
  assert.equal((await request("/api/auth/me")).data.user, null);
  check(await request("/api/auth/login", "POST", { email, password }), 401);
  check(await request("/api/auth/login", "POST", { email, password: nextPassword }), 200);
  check(await request("/api/auth/logout", "POST", {}), 200);
  assert.equal((await request("/api/auth/me")).data.user, null);
  console.log(
    "PASS: email verification, OTP rejection/replay, login/logout, password reset/session revocation, guest-cart merge, cart bounds/concurrency, CSRF, admin authorization, server-priced/idempotent checkout, order snapshots/isolation, and Qikink payload/disabled dispatch.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    const users = await db.user.findMany({
      where: { email: { in: [email, adminEmail, secondEmail] } },
      select: { id: true },
    });
    await db.order.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await db.bagItem.deleteMany({ where: { variant: { productId: { in: createdProductIds } } } });
    await db.productVariant.deleteMany({ where: { productId: { in: createdProductIds } } });
    await db.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await db.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    for (const file of await readdir(".local-mail").catch(() => [])) {
      const path = join(".local-mail", file),
        value = JSON.parse(await readFile(path, "utf8"));
      if ([email, adminEmail, secondEmail].includes(value.to)) await unlink(path);
    }
    await db.$disconnect();
  });
