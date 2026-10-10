"use client";
import Image from "@/components/image";
import { useRef, useState } from "react";
import { ShoppingBag, Truck, ShieldCheck } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog";
import { money } from "@/lib/format";
import { useStore } from "./store-provider";
export function ProductDetail({ product }: { product: CatalogProduct }) {
  const { addItem } = useStore(),
    [color, setColor] = useState(product.variants[0].color),
    [size, setSize] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const sizeChart = useRef<HTMLDetailsElement>(null);
  const colors = [...new Set(product.variants.map((v) => v.color))],
    sizes = ["S", "M", "L", "XL", "2XL"];
  const variant = product.variants.find((v) => v.color === color && v.size === size);
  const displayedPrice = variant || product.variants.find((v) => v.color === color)!;
  async function add() {
    if (!variant) {
      setError("Pick your size first. Your fit, your call.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addItem(variant.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="product-page">
      <div className="detail-image">
        <Image
          src={product.image}
          alt={`${product.name} in ${color}`}
          fill
          priority
          sizes="(max-width: 540px) 90vw, 45vw"
        />
      </div>
      <div className="detail-copy">
        <span className="eyebrow">{product.tag || "THE EVERYDAY EDIT"}</span>
        <h1>{product.name}</h1>
        <div className="detail-price">
          {money(displayedPrice.pricePaise)}
          {displayedPrice.compareAtPaise && <del>{money(displayedPrice.compareAtPaise)}</del>}
        </div>
        <p className="tax-note">Inclusive of all taxes</p>
        <p className="detail-description">{product.description}</p>
        <p className="variant-label">Colour: {color}</p>
        <div className="color-options">
          {colors.map((c) => (
            <button
              key={c}
              className={c === color ? "selected" : ""}
              aria-pressed={c === color}
              onClick={() => {
                setColor(c);
                setSize("");
              }}
            >
              <i style={{ background: product.variants.find((v) => v.color === c)!.colorHex }} />
              {c}
            </button>
          ))}
        </div>
        <p className="variant-label">
          <span>Size{size && `: ${size}`}</span>
          <button
            onClick={() => {
              if (sizeChart.current) {
                sizeChart.current.open = true;
                sizeChart.current.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
          >
            Fit guide
          </button>
        </p>
        <div className="size-options">
          {sizes.map((s) => (
            <button
              key={s}
              disabled={!product.variants.some((v) => v.color === color && v.size === s)}
              aria-pressed={s === size}
              className={s === size ? "selected" : ""}
              onClick={() => {
                setSize(s);
                setError("");
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="sku-note">
          {variant ? `SKU: ${variant.sku}` : "Choose a size to find your fit."}
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button button-dark full" disabled={busy} onClick={add}>
          {busy ? "Adding to your bag…" : "Add to bag"}
          <ShoppingBag size={18} />
        </button>
        <div className="detail-perks">
          <span>
            <Truck size={16} />
            Free shipping on ₹1,499+
          </span>
          <span>
            <ShieldCheck size={16} />
            Cash on delivery
          </span>
        </div>
        <details>
          <summary>Fabric & care</summary>
          <p>
            {product.fabric}. Machine wash cold, inside out, with similar colours. Dry in the shade.
            Do not iron directly on the print.
          </p>
        </details>
        <details ref={sizeChart}>
          <summary>Fit guide</summary>
          <p>
            {product.fit} fit. Compare your usual size with the garment measurements supplied for
            your chosen product. The store owner will confirm exact measurements before production;
            choose your regular size for a relaxed fit.
          </p>
        </details>
        <details>
          <summary>Shipping & order updates</summary>
          <p>
            Your order appears in My orders after checkout. Shipping is ₹79 below ₹1,499 and free
            above it. Production and tracking updates are added after the store confirms
            fulfillment.
          </p>
        </details>
      </div>
    </div>
  );
}
