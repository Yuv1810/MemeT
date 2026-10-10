import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { catalogInclude } from "@/lib/catalog";
import { ProductDetail } from "@/components/product-detail";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });
  return { title: product?.name || "Product", description: product?.description };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug }, include: catalogInclude });
  if (!product?.active || !product.variants.length) notFound();
  return (
    <div className="page-shell">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/#shop">Shop</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <ProductDetail product={product} />
    </div>
  );
}
