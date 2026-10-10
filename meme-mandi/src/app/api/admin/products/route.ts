import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { enforceOrigin, readJson, route } from "@/lib/http";
import { productSchema } from "@/lib/product-validation";
export async function GET() {
  return route(async () => {
    await requireUser(true);
    return {
      products: await db.product.findMany({
        include: { variants: true },
        orderBy: { createdAt: "desc" },
      }),
    };
  });
}
export async function POST(request: Request) {
  return route(async () => {
    enforceOrigin(request);
    await requireUser(true);
    const { variants, ...data } = productSchema.parse(await readJson(request));
    return {
      product: await db.product.create({
        data: {
          ...data,
          variants: {
            create: variants.map(({ id: _id, ...v }) => ({ ...v, qikinkSku: v.qikinkSku || null })),
          },
        },
        include: { variants: true },
      }),
    };
  });
}
