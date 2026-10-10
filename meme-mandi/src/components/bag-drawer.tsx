"use client";
import Image from "@/components/image";
import Link from "next/link";
import { X, Minus, Plus, Trash2, ShoppingBag, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store-provider";
import { money } from "@/lib/format";
export function BagDrawer() {
  const { bag, bagOpen, setBagOpen, changeQuantity } = useStore();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!bagOpen) return;
    const previous = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") setBagOpen(false);
      if (e.key === "Tab") {
        const nodes = panel.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input, select",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [bagOpen, setBagOpen]);
  if (!bagOpen) return null;
  async function change(id: string, quantity: number) {
    setError("");
    setBusy(true);
    try {
      await changeQuantity(id, quantity);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="drawer-overlay">
      <button
        className="drawer-backdrop"
        aria-label="Close bag"
        tabIndex={-1}
        onClick={() => setBagOpen(false)}
      />
      <div
        className="bag-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bag-title"
        ref={panel}
      >
        <div className="drawer-heading">
          <h2 id="bag-title">
            YOUR BAG <span>({bag.count})</span>
          </h2>
          <button className="icon-button" aria-label="Close bag" onClick={() => setBagOpen(false)}>
            <X />
          </button>
        </div>
        {bag.items.length ? (
          <>
            <p className="shipping-note">
              {bag.subtotalPaise >= 149900
                ? "You've unlocked free shipping. Nice one."
                : `You're ${money(149900 - bag.subtotalPaise)} away from free shipping.`}
            </p>
            <div className="bag-lines">
              {bag.items.map((item) => (
                <div className="bag-line" key={item.id}>
                  <Image
                    src={item.variant.product.image}
                    alt={item.variant.product.name}
                    width={100}
                    height={134}
                  />
                  <div>
                    <Link
                      href={`/products/${item.variant.product.slug}`}
                      onClick={() => setBagOpen(false)}
                    >
                      {item.variant.product.name}
                    </Link>
                    <p>
                      {item.variant.color} / {item.variant.size}
                    </p>
                    <b>{money(item.variant.pricePaise)}</b>
                    <div className="quantity">
                      <button
                        disabled={busy}
                        aria-label={`Decrease quantity of ${item.variant.product.name}`}
                        onClick={() => change(item.variant.id, item.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        disabled={busy || item.quantity >= 10}
                        aria-label={`Increase quantity of ${item.variant.product.name}`}
                        onClick={() => change(item.variant.id, item.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <button
                    className="icon-button remove-item"
                    disabled={busy}
                    aria-label={`Remove ${item.variant.product.name}`}
                    onClick={() => change(item.variant.id, 0)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="bag-bottom">
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <div className="total-row">
                <span>Subtotal</span>
                <strong>{money(bag.subtotalPaise)}</strong>
              </div>
              <div className="total-row">
                <span>Shipping</span>
                <span>{bag.shippingPaise ? money(bag.shippingPaise) : "On us"}</span>
              </div>
              <Link
                href="/checkout"
                className="button button-dark full"
                onClick={() => setBagOpen(false)}
              >
                Checkout · {money(bag.totalPaise)}
              </Link>
              <p className="secure-note">
                <ShieldCheck size={15} />
                Cash on delivery available
              </p>
            </div>
          </>
        ) : (
          <div className="empty-bag">
            <ShoppingBag size={48} strokeWidth={1} />
            <h3>All vibes. No items. Yet.</h3>
            <p>Your next favourite fit is waiting.</p>
            <Link href="/#shop" className="button button-accent" onClick={() => setBagOpen(false)}>
              Explore the drop
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
