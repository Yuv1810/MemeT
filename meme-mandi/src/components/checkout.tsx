"use client";
import Link from "next/link";
import Image from "@/components/image";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Banknote } from "lucide-react";
import { api, useStore } from "./store-provider";
import { money } from "@/lib/format";
export function Checkout() {
  const { bag, user, ready, refresh } = useStore();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(""),
    [checkoutKey, setCheckoutKey] = useState("");
  const [address, setAddress] = useState({
    first_name: "",
    last_name: "",
    address1: "",
    address2: "",
    phone: "",
    city: "",
    zip: "",
    province: "",
  });
  useEffect(() => {
    setCheckoutKey(crypto.randomUUID());
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ order: { number: string } }>("/api/orders", "POST", {
        address,
        checkoutKey,
      });
      setSuccess(result.order.number);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <div className="loading-state">Opening your bag…</div>;
  if (success)
    return (
      <div className="order-success">
        <CheckCircle2 />
        <h1>THAT'S A GOOD FIT.</h1>
        <p>
          Order <strong>{success}</strong> is placed. You'll pay on delivery. Follow production and
          shipping updates in My orders.
        </p>
        <Link href="/orders" className="button button-dark">
          View my orders
        </Link>
      </div>
    );
  if (!user)
    return (
      <div className="empty-state">
        <h3>One quick sign-in before checkout.</h3>
        <p>Sign in with your verified email so your order stays with you.</p>
        <Link href="/login?next=/checkout" className="button button-dark">
          Sign in to checkout
        </Link>
      </div>
    );
  if (!bag.items.length)
    return (
      <div className="empty-state">
        <h3>Your bag is taking a chai break.</h3>
        <p>Add a fit before checking out.</p>
        <Link href="/#shop" className="button button-accent">
          Shop the drop
        </Link>
      </div>
    );
  const fields = [
    ["first_name", "First name", "given-name", 20],
    ["last_name", "Last name", "family-name", 20],
    ["address1", "Street address", "address-line1", 80],
    ["address2", "Apartment, landmark (optional)", "address-line2", 80],
    ["phone", "Mobile number", "tel-national", 10],
    ["zip", "PIN code", "postal-code", 6],
    ["city", "City", "address-level2", 40],
    ["province", "State", "address-level1", 40],
  ] as const;
  return (
    <>
      <h1 className="page-title">MAKE IT YOURS.</h1>
      <p className="page-intro">One last stop before a wardrobe upgrade.</p>
      <div className="checkout-layout">
        <form onSubmit={submit}>
          <h2 className="form-section-title">
            <span className="step-badge">1</span>Delivery address
          </h2>
          <div className="form-grid">
            {fields.map(([key, label, autoComplete, max]) => (
              <label className={`field ${key.startsWith("address") ? "span-2" : ""}`} key={key}>
                <span>{label}</span>
                <input
                  name={key}
                  autoComplete={autoComplete}
                  required={key !== "address2"}
                  maxLength={max}
                  inputMode={key === "phone" || key === "zip" ? "numeric" : "text"}
                  pattern={
                    key === "phone" ? "[6-9][0-9]{9}" : key === "zip" ? "[1-9][0-9]{5}" : undefined
                  }
                  value={address[key]}
                  onChange={(e) => setAddress({ ...address, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <h2 className="form-section-title">
            <span className="step-badge">2</span>Payment
          </h2>
          <div className="cod-option">
            <Banknote size={21} />
            <b>Cash on delivery</b>
            <span>Pay when your fit arrives</span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button button-dark full" disabled={busy || !checkoutKey}>
            {busy ? "Placing your order…" : `Place order · ${money(bag.totalPaise)}`}
          </button>
          <p className="checkout-caption">
            Delivery within India. Your order is sent to production after the store confirms it.
          </p>
        </form>
        <aside className="checkout-summary">
          <h2>THE BAG, RECAP.</h2>
          {bag.items.map((item) => (
            <div key={item.id} className="checkout-item">
              <Image
                src={item.variant.product.image}
                alt={item.variant.product.name}
                width={62}
                height={80}
              />
              <div>
                <b>{item.variant.product.name}</b>
                <p>
                  {item.variant.color} / {item.variant.size} · Qty {item.quantity}
                </p>
              </div>
              <span>{money(item.variant.pricePaise * item.quantity)}</span>
            </div>
          ))}
          <div className="checkout-totals">
            <div className="total-row">
              <span>Subtotal</span>
              <span>{money(bag.subtotalPaise)}</span>
            </div>
            <div className="total-row">
              <span>Shipping</span>
              <span>{bag.shippingPaise ? money(bag.shippingPaise) : "On us"}</span>
            </div>
            <div className="total-row grand-total">
              <span>Total</span>
              <span>{money(bag.totalPaise)}</span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
