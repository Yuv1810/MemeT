import "dotenv/config";
import { PrismaClient, type Prisma } from "@prisma/client";
import { hashPassword, verifyPassword, hashToken, randomToken } from "../src/lib/security";
import { shipping } from "../src/lib/format";

const db = new PrismaClient();
const password = "MemT-Demo-2026!";

async function main() {
  const appUrl = new URL(process.env.APP_URL || ""),
    databaseUrl = new URL(process.env.DATABASE_URL || "");
  const loopback = (host: string) => host === "127.0.0.1" || host === "localhost";
  if (
    process.env.NODE_ENV === "production" ||
    !loopback(appUrl.hostname) ||
    !loopback(databaseUrl.hostname) ||
    appUrl.protocol !== "http:" ||
    process.env.MAIL_PROVIDER !== "local" ||
    process.env.QIKINK_ENABLED !== "false"
  ) {
    throw new Error("Demo setup requires localhost, a local database, local email, and disabled Qikink.");
  }
  const variants = await db.productVariant.findMany({
    where: {
      active: true,
      size: "M",
      product: {
        active: true,
        slug: { in: ["kya-scene-hai", "kal-dekhenge", "overthinking-department"] },
      },
    },
    include: { product: true },
    orderBy: { sku: "asc" },
  });
  if (variants.length < 3) throw new Error("Run npm run db:seed first to add the sample catalog.");

  await db.$transaction(async (tx) => {
    async function account(email: string, name: string, role: "ADMIN" | "CUSTOMER") {
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) {
        if (
          existing.name !== name || existing.role !== role || !existing.emailVerifiedAt ||
          !(await verifyPassword(password, existing.passwordHash))
        ) throw new Error(`Refusing to overwrite an existing account: ${email}`);
        return existing;
      }
      return tx.user.create({
        data: {
          email, name, role, passwordHash: await hashPassword(password),
          emailVerifiedAt: new Date(),
        },
      });
    }
    await account("admin@memt.test", "MemT demo admin", "ADMIN");
    const customer = await account("customer@memt.test", "MemT demo customer", "CUSTOMER");
    const address = {
      first_name: "Demo", last_name: "Customer", address1: "12 Sample Street (demo only)",
      address2: "Sample address", city: "Mumbai", province: "Maharashtra", zip: "400001",
      phone: "9999999999", email: customer.email, country: "India", country_code: "IN",
    };
    for (let index = 0; index < 2; index++) {
      const number = `DEMO100${index + 1}`;
      const existing = await tx.order.findUnique({ where: { number } });
      if (existing) {
        if (existing.userId !== customer.id) throw new Error(`Demo order number already in use: ${number}`);
        continue;
      }
      const items = index === 0 ? variants.slice(0, 1) : variants.slice(1, 3);
      const subtotalPaise = items.reduce((sum, variant) => sum + variant.pricePaise, 0);
      const shippingPaise = shipping(subtotalPaise);
      await tx.order.create({
        data: {
          number,
          checkoutKey: `8fd0a614-3f15-4a6c-9db7-86553994410${index + 1}`,
          userId: customer.id,
          status: "PLACED",
          shippingAddress: address,
          subtotalPaise, shippingPaise, totalPaise: subtotalPaise + shippingPaise,
          items: {
            create: items.map((variant) => ({
              variantId: variant.id, name: variant.product.name, image: variant.product.image,
              sku: variant.sku, qikinkSku: variant.qikinkSku, color: variant.color, size: variant.size,
              pricePaise: variant.pricePaise, quantity: 1,
              searchFromMyProducts: variant.searchFromMyProducts,
              designs: variant.designs as Prisma.InputJsonValue,
            })),
          },
        },
      });
    }
    // Preserve edits and checkout history when the demo setup is run again.
    const existingBag = await tx.bag.findUnique({ where: { userId: customer.id } });
    if (!existingBag) {
      await tx.bag.create({
        data: {
          userId: customer.id, tokenHash: hashToken(randomToken()),
          expiresAt: new Date(Date.now() + 365 * 86400000),
          items: { create: { variantId: variants[0].id, quantity: 1 } },
        },
      });
    }
  }, { timeout: 15000 });
  console.log("Local demo ready: admin@memt.test and customer@memt.test");
  console.log(`Password for both: ${password}`);
  console.log("Three products, 15 variants, two sample orders, and a customer bag are ready. Qikink is disabled.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
