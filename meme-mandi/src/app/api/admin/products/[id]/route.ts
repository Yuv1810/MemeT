import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, enforceOrigin, readJson, route } from "@/lib/http";
import { productSchema } from "@/lib/product-validation";
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return route(async () => {
    enforceOrigin(request);
    await requireUser(true);
    const { id } = await context.params,
      { variants, ...data } = productSchema.parse(await readJson(request));
    return db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id }, include: { variants: true } });
      if (!product) throw new ApiError(404, "Product not found.");
      for (const variant of variants)
        if (variant.id && !product.variants.some((v) => v.id === variant.id))
          throw new ApiError(400, "A variant does not belong to this product.");
      await tx.product.update({ where: { id }, data });
      await tx.productVariant.updateMany({ where: { productId: id }, data: { active: false } });
      for (const { id: variantId, ...v } of variants) {
        const values = { ...v, qikinkSku: v.qikinkSku || null };
        if (variantId) await tx.productVariant.update({ where: { id: variantId }, data: values });
        else await tx.productVariant.create({ data: { ...values, productId: id } });
      }
      return {
        product: await tx.product.findUnique({ where: { id }, include: { variants: true } }),
      };
    });
  });
}
