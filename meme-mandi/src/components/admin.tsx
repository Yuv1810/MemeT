"use client";
import Link from "next/link";
import Image from "@/components/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, X, Eye, Send } from "lucide-react";
import { api, useStore } from "./store-provider";
import { money } from "@/lib/format";
import type { ClientOrder } from "./orders";
type Variant = {
  id?: string;
  sku: string;
  qikinkSku: string | null;
  color: string;
  colorHex: string;
  size: string;
  pricePaise: number;
  compareAtPaise: number | null;
  active: boolean;
  searchFromMyProducts: boolean;
  designs: unknown[];
};
type AdminProduct = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  fit: string;
  fabric: string;
  image: string;
  tag: string | null;
  active: boolean;
  variants: Variant[];
};
const newVariant = (): Variant => ({
  sku: "",
  qikinkSku: null,
  color: "Black",
  colorHex: "#242526",
  size: "M",
  pricePaise: 79900,
  compareAtPaise: null,
  active: true,
  searchFromMyProducts: false,
  designs: [],
});
const newProduct = (): AdminProduct => ({
  name: "",
  slug: "",
  description: "",
  category: "T-shirts",
  fit: "Oversized",
  fabric: "100% cotton",
  image: "",
  tag: null,
  active: false,
  variants: [newVariant()],
});
export function Admin() {
  const { user, ready } = useStore();
  const [tab, setTab] = useState("products"),
    [products, setProducts] = useState<AdminProduct[]>([]),
    [orders, setOrders] = useState<ClientOrder[]>([]),
    [connected, setConnected] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<AdminProduct | null>(null),
    [payload, setPayload] = useState<{ id: string; json: string } | null>(null);
  const load = useCallback(async () => {
    const [p, o] = await Promise.all([
      api<{ products: AdminProduct[] }>("/api/admin/products"),
      api<{ orders: ClientOrder[]; qikinkConnected: boolean }>("/api/admin/orders"),
    ]);
    setProducts(p.products);
    setOrders(o.orders);
    setConnected(o.qikinkConnected);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (user?.role === "ADMIN")
      load().catch((e) => {
        setError(e.message);
        setLoaded(true);
      });
  }, [user, load]);
  async function orderAction(order: ClientOrder, action: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action === "preview") {
        const result = await api<{ payload: unknown }>(`/api/admin/orders/${order.id}`);
        setPayload({ id: order.id, json: JSON.stringify(result.payload, null, 2) });
      } else if (action === "submit") {
        await api(`/api/admin/orders/${order.id}`, "POST", {});
        setMessage(`${order.number} was accepted by Qikink.`);
        await load();
      } else {
        await api(
          `/api/admin/orders/${order.id}`,
          "PATCH",
          action === "sync_print" ? { action: "sync_print" } : { status: action },
        );
        setMessage("Order status updated.");
        await load();
      }
    } catch (e) {
      setError((e as Error).message);
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <div className="loading-state">Opening store admin…</div>;
  if (!user)
    return (
      <div className="empty-state">
        <h3>Store owner's corner.</h3>
        <p>Sign in with your admin account to manage products and orders.</p>
        <Link href="/login?next=/admin" className="button button-dark">
          Sign in
        </Link>
      </div>
    );
  if (user.role !== "ADMIN")
    return (
      <div className="empty-state">
        <h3>This area is for store admins.</h3>
        <p>Your account has customer access.</p>
        <Link href="/" className="button button-accent">
          Back to the store
        </Link>
      </div>
    );
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">memeT / STORE ADMIN</span>
          <h1 className="page-title">BEHIND THE MEMES.</h1>
          <p className="page-intro">Your catalog, variants, and fulfillment in one place.</p>
        </div>
        <button
          className="button button-dark"
          onClick={() => {
            setEditing(newProduct());
            setTab("products");
            setError("");
            setMessage("");
          }}
        >
          <Plus size={17} />
          Add product
        </button>
      </div>
      <div className="admin-stats">
        <div className="admin-stat">
          <span>Products in the catalog</span>
          <b>{products.length.toString().padStart(2, "0")}</b>
        </div>
        <div className="admin-stat">
          <span>Orders placed</span>
          <b>{orders.length.toString().padStart(2, "0")}</b>
        </div>
        <div className="admin-stat">
          <span>Qikink connection</span>
          <b style={{ fontFamily: "var(--body)", fontSize: 19 }}>
            {connected ? "Connected" : "Setup pending"}
          </b>
        </div>
      </div>
      <div className="admin-nav">
        <button className={tab === "products" ? "selected" : ""} onClick={() => setTab("products")}>
          Products
        </button>
        <button className={tab === "orders" ? "selected" : ""} onClick={() => setTab("orders")}>
          Orders & fulfillment
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
      {!loaded ? (
        <div className="loading-state">Loading your store…</div>
      ) : tab === "products" ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variants</th>
                  <th>Price</th>
                  <th>Qikink mapping</th>
                  <th>Visibility</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="table-product">
                        <Image src={p.image} alt={p.name} width={44} height={57} />
                        <div>
                          <b>{p.name}</b>
                          <span>{p.category}</span>
                        </div>
                      </div>
                    </td>
                    <td>{p.variants.filter((v) => v.active).length}</td>
                    <td>{money(p.variants[0]?.pricePaise ?? 0)}</td>
                    <td>
                      {p.variants.filter((v) => v.qikinkSku).length}/{p.variants.length} mapped
                    </td>
                    <td>
                      <span className="status-pill">{p.active ? "LIVE" : "DRAFT"}</span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setEditing(structuredClone(p));
                          setMessage("");
                        }}
                      >
                        Edit product
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editing && (
            <ProductEditor
              key={editing.id || "new"}
              product={editing}
              onClose={() => setEditing(null)}
              onSaved={async () => {
                setEditing(null);
                setMessage("Product saved. Your catalog is up to date.");
                await load();
              }}
            />
          )}
        </>
      ) : (
        <>
          {!connected && (
            <p className="admin-warning">
              Connect your Qikink credentials to submit orders. You can still review orders and
              preview their payloads. Sample products need real supplier SKUs and print artwork.
            </p>
          )}
          {!orders.length && (
            <div className="empty-state">
              <h3>The first order starts here.</h3>
              <p>Customer orders will appear after checkout.</p>
            </div>
          )}
          {orders.map((o) => (
            <article className="order-card" key={o.id}>
              <div className="order-card-top">
                <div>
                  <h2>
                    {o.number} · {o.user?.name}
                  </h2>
                  <p>
                    {o.user?.email} ·{" "}
                    {new Date(o.createdAt).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </p>
                </div>
                <span
                  className={`status-pill ${o.fulfillmentStatus === "REVIEW_REQUIRED" ? "warning" : ""}`}
                >
                  {o.fulfillmentStatus.replaceAll("_", " ")}
                </span>
              </div>
              {o.items.map((i) => (
                <div className="order-item" key={i.id}>
                  <Image src={i.image} alt={i.name} width={65} height={84} />
                  <div>
                    <h3>
                      {i.name} · {i.size} · Qty {i.quantity}
                    </h3>
                    <p>
                      {i.color} · Store SKU: {i.sku}
                    </p>
                    <p>Qikink SKU: {i.qikinkSku || "Missing from order snapshot"}</p>
                  </div>
                  <b>{money(i.pricePaise * i.quantity)}</b>
                </div>
              ))}
              <p className="admin-shipping">
                Ship to {o.shippingAddress.first_name} {o.shippingAddress.last_name},{" "}
                {o.shippingAddress.address1}, {o.shippingAddress.city} {o.shippingAddress.zip},{" "}
                {o.shippingAddress.province}. Phone: {o.shippingAddress.phone}
              </p>
              <div className="order-card-total">
                <span>
                  {o.status} · Cash on delivery
                  {o.qikinkOrderId && ` · Qikink order ${o.qikinkOrderId}`}
                </span>
                <strong>{money(o.totalPaise)}</strong>
              </div>
              {o.fulfillmentMessage && (
                <p className="admin-warning" style={{ marginTop: 15 }}>
                  {o.fulfillmentMessage}
                </p>
              )}
              <div className="admin-order-actions">
                {["NOT_SUBMITTED", "REJECTED"].includes(o.fulfillmentStatus) &&
                  o.status !== "CANCELLED" && (
                    <button
                      className="button button-outline"
                      disabled={busy}
                      onClick={() => orderAction(o, "sync_print")}
                    >
                      Refresh print details
                    </button>
                  )}
                <button
                  className="button button-outline"
                  disabled={busy}
                  onClick={() => orderAction(o, "preview")}
                >
                  <Eye size={15} />
                  Preview Qikink payload
                </button>
                {["NOT_SUBMITTED", "REJECTED"].includes(o.fulfillmentStatus) &&
                  o.status !== "CANCELLED" && (
                    <button
                      className="button button-dark"
                      disabled={busy || !connected}
                      onClick={() => orderAction(o, "submit")}
                    >
                      <Send size={15} />
                      Submit to Qikink
                    </button>
                  )}
                {o.fulfillmentStatus === "SUBMITTED" && o.status === "PROCESSING" && (
                  <button
                    className="button button-outline"
                    disabled={busy}
                    onClick={() => orderAction(o, "SHIPPED")}
                  >
                    Mark shipped
                  </button>
                )}
                {o.status === "SHIPPED" && (
                  <button
                    className="button button-outline"
                    disabled={busy}
                    onClick={() => orderAction(o, "DELIVERED")}
                  >
                    Mark delivered
                  </button>
                )}
                {["NOT_SUBMITTED", "REJECTED"].includes(o.fulfillmentStatus) &&
                  o.status !== "CANCELLED" && (
                    <button
                      className="button button-outline"
                      disabled={busy}
                      onClick={() => orderAction(o, "CANCELLED")}
                    >
                      Cancel order
                    </button>
                  )}
              </div>
              {payload?.id === o.id && <pre className="payload-preview">{payload.json}</pre>}
            </article>
          ))}
        </>
      )}
    </>
  );
}
function ProductEditor({
  product,
  onClose,
  onSaved,
}: {
  product: AdminProduct;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState(product),
    [designText, setDesignText] = useState(
      product.variants.map((v) => JSON.stringify(v.designs, null, 2)),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  function patch<K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) {
    setForm({ ...form, [key]: value });
  }
  function variantPatch<K extends keyof Variant>(i: number, key: K, value: Variant[K]) {
    const variants = [...form.variants];
    variants[i] = { ...variants[i], [key]: value };
    patch("variants", variants);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const variants = form.variants.map((v, i) => ({ ...v, designs: JSON.parse(designText[i]) }));
      await api(
        form.id ? `/api/admin/products/${form.id}` : "/api/admin/products",
        form.id ? "PUT" : "POST",
        { ...form, variants },
      );
      await onSaved();
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? "Print artwork must be valid JSON. Use [] when artwork is not configured yet."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="admin-editor" onSubmit={save}>
      <div className="editor-heading">
        <h2>{form.id ? "Edit product" : "New product"}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close product editor"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-grid">
        <label className="field">
          <span>Product name</span>
          <input
            required
            value={form.name}
            maxLength={100}
            onChange={(e) => patch("name", e.target.value)}
          />
        </label>
        <label className="field">
          <span>URL slug</span>
          <input
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={form.slug}
            onChange={(e) => patch("slug", e.target.value)}
            placeholder="your-product-name"
          />
        </label>
        <label className="field span-2">
          <span>Description</span>
          <textarea
            required
            minLength={10}
            value={form.description}
            onChange={(e) => patch("description", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={form.category} onChange={(e) => patch("category", e.target.value)}>
            <option>T-shirts</option>
            <option>Hoodies</option>
          </select>
        </label>
        <label className="field">
          <span>Tag (optional)</span>
          <input
            maxLength={30}
            value={form.tag || ""}
            onChange={(e) => patch("tag", e.target.value || null)}
          />
        </label>
        <label className="field">
          <span>Fit</span>
          <input required value={form.fit} onChange={(e) => patch("fit", e.target.value)} />
        </label>
        <label className="field">
          <span>Fabric</span>
          <input required value={form.fabric} onChange={(e) => patch("fabric", e.target.value)} />
        </label>
        <label className="field span-2">
          <span>Product image URL</span>
          <input
            required
            value={form.image}
            onChange={(e) => patch("image", e.target.value)}
            placeholder="https://… or /images/filename.png"
          />
        </label>
      </div>
      <label className="form-checkbox">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => patch("active", e.target.checked)}
        />
        Publish this product in the storefront
      </label>
      <h3>Colour & size variants</h3>
      <p className="form-hint">
        Store SKUs identify your own designs. Copy each exact supplier SKU from Qikink. Never guess
        a colour or size code.
      </p>
      {form.variants.map((v, i) => (
        <div className="variant-editor" key={i}>
          <div className="variant-editor-top">
            <h3>Variant {i + 1}</h3>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                patch(
                  "variants",
                  form.variants.filter((_, index) => index !== i),
                );
                setDesignText(designText.filter((_, index) => index !== i));
              }}
            >
              Remove variant
            </button>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Store SKU</span>
              <input
                required
                value={v.sku}
                onChange={(e) => variantPatch(i, "sku", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Qikink SKU</span>
              <input
                value={v.qikinkSku || ""}
                onChange={(e) => variantPatch(i, "qikinkSku", e.target.value || null)}
                placeholder="Copy from Qikink"
              />
            </label>
            <label className="field">
              <span>Size</span>
              <select value={v.size} onChange={(e) => variantPatch(i, "size", e.target.value)}>
                {["S", "M", "L", "XL", "2XL"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Colour name</span>
              <input
                required
                value={v.color}
                onChange={(e) => variantPatch(i, "color", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Colour hex</span>
              <input
                required
                pattern="#[a-fA-F0-9]{6}"
                value={v.colorHex}
                onChange={(e) => variantPatch(i, "colorHex", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Price (₹)</span>
              <input
                type="number"
                min={100}
                max={100000}
                step="0.01"
                required
                value={v.pricePaise / 100}
                onChange={(e) =>
                  variantPatch(i, "pricePaise", Math.round(Number(e.target.value) * 100))
                }
              />
            </label>
            <label className="field">
              <span>Compare-at price (₹)</span>
              <input
                type="number"
                min={100}
                step="0.01"
                value={v.compareAtPaise ? v.compareAtPaise / 100 : ""}
                onChange={(e) =>
                  variantPatch(
                    i,
                    "compareAtPaise",
                    e.target.value ? Math.round(Number(e.target.value) * 100) : null,
                  )
                }
              />
            </label>
          </div>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={v.active}
              onChange={(e) => variantPatch(i, "active", e.target.checked)}
            />
            Available to customers
          </label>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={v.searchFromMyProducts}
              onChange={(e) => variantPatch(i, "searchFromMyProducts", e.target.checked)}
            />
            SKU belongs to Qikink My Products (preconfigured design)
          </label>
          <label className="field">
            <span>Print artwork (Qikink designs JSON)</span>
            <textarea
              rows={5}
              value={designText[i]}
              onChange={(e) =>
                setDesignText(
                  designText.map((value, index) => (index === i ? e.target.value : value)),
                )
              }
              placeholder='[{"design_code":"SCENE01","width_inches":10,"height_inches":12,"placement_sku":"fr","design_link":"https://your-domain.com/print.png"}]'
            />
          </label>
          <p className="form-hint">
            Use a public print-ready HTTPS artwork URL. The generated catalog photograph is a
            mockup, not production artwork.
          </p>
        </div>
      ))}
      <button
        type="button"
        className="button button-outline"
        onClick={() => {
          patch("variants", [...form.variants, newVariant()]);
          setDesignText([...designText, "[]"]);
        }}
      >
        <Plus size={16} />
        Add variant
      </button>
      <div style={{ display: "flex", gap: 12, marginTop: 25 }}>
        <button className="button button-dark" disabled={busy}>
          {busy ? "Saving…" : "Save product"}
        </button>
        <button type="button" className="button button-outline" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
