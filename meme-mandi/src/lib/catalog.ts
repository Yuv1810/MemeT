import { db } from "./db";
export const catalogInclude = {
  variants: { where: { active: true }, orderBy: { size: "asc" as const } },
};
export async function getProducts() {
  return db.product.findMany({
    where: { active: true, variants: { some: { active: true } } },
    include: catalogInclude,
    orderBy: { createdAt: "asc" },
  });
}
export type CatalogProduct = Awaited<ReturnType<typeof getProducts>>[number];
export { money, shipping } from "./format";
