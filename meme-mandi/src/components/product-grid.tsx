"use client";
import Link from "next/link";
import Image from "@/components/image";
import { Plus, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CatalogProduct } from "@/lib/catalog";
import { money } from "@/lib/format";
export function ProductGrid({ products }: { products: CatalogProduct[] }) {
  const [category, setCategory] = useState("All fits"),
    [sort, setSort] = useState("featured");
  const searchParams = useSearchParams();
  useEffect(() => {
    const value = searchParams.get("category");
    setCategory(value === "T-shirts" || value === "Hoodies" ? value : "All fits");
  }, [searchParams]);
  const displayed = products
    .filter((p) => category === "All fits" || p.category === category)
    .sort((a, b) =>
      sort === "low"
        ? a.variants[0].pricePaise - b.variants[0].pricePaise
        : sort === "high"
          ? b.variants[0].pricePaise - a.variants[0].pricePaise
          : 0,
    );
  return (
    <>
      <div className="catalog-controls">
        <div className="category-tabs" aria-label="Product category">
          {["All fits", "T-shirts", "Hoodies"].map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              className={category === c ? "selected" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
              {c === "All fits" && <span>{products.length.toString().padStart(2, "0")}</span>}
            </button>
          ))}
        </div>
        <label className="sort-control">
          <SlidersHorizontal size={15} />
          <span className="sr-only">Sort products</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </label>
      </div>
      <div className="product-grid">
        {displayed.map((p, index) => (
          <article className="product-card" key={p.id}>
            <Link className="product-image" href={`/products/${p.slug}`}>
              <Image
                src={p.image}
                alt={`${p.name} in ${p.variants[0].color}`}
                fill
                sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 31vw"
              />
              <span className={`product-tag tag-${index}`}>{p.tag || "THE EVERYDAY EDIT"}</span>
              <span className="quick-add" aria-hidden="true">
                <Plus size={23} />
              </span>
            </Link>
            <div className="product-meta">
              <span>
                {p.fit.toUpperCase()} {p.category === "Hoodies" ? "HOODIE" : "TEE"}
              </span>
              <span
                className="color-dot"
                style={{ background: p.variants[0].colorHex }}
                aria-label={p.variants[0].color}
              />
            </div>
            <div className="product-name-row">
              <h3>
                <Link href={`/products/${p.slug}`}>{p.name}</Link>
              </h3>
              <span>{money(p.variants[0].pricePaise)}</span>
            </div>
            <p className="product-detail">{p.fabric}</p>
          </article>
        ))}
      </div>
      {!displayed.length && (
        <div className="empty-state">
          <h3>More fits are on the way.</h3>
          <p>Try another category.</p>
        </div>
      )}
    </>
  );
}
