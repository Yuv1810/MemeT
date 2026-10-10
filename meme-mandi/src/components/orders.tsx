"use client";
import Link from "next/link";
import Image from "@/components/image";
import { useEffect, useState } from "react";
import { api, useStore } from "./store-provider";
import { money } from "@/lib/format";
export type ClientOrder = {
  id: string;
  number: string;
  status: string;
  fulfillmentStatus: string;
  fulfillmentMessage: string | null;
  qikinkOrderId: string | null;
  createdAt: string;
  totalPaise: number;
  shippingAddress: Record<string, string>;
  items: {
    id: string;
    name: string;
    image: string;
    color: string;
    size: string;
    quantity: number;
    pricePaise: number;
    qikinkSku: string | null;
    sku: string;
  }[];
  user?: { name: string; email: string };
};
export function Orders() {
  const { user, ready } = useStore();
  const [orders, setOrders] = useState<ClientOrder[]>([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (user)
      api<{ orders: ClientOrder[] }>("/api/orders")
        .then((v) => {
          setOrders(v.orders);
          setLoaded(true);
        })
        .catch((e) => {
          setError(e.message);
          setLoaded(true);
        });
  }, [user]);
  if (!ready) return <div className="loading-state">Opening your orders…</div>;
  if (!user)
    return (
      <div className="empty-state">
        <h3>Your fits have a story.</h3>
        <p>Sign in to see your order history.</p>
        <Link href="/login?next=/orders" className="button button-dark">
          Sign in
        </Link>
      </div>
    );
  return (
    <>
      <h1 className="page-title">YOUR FITS, ON FILE.</h1>
      <p className="page-intro">Hey {user.name.split(" ")[0]}. Here's the latest on your orders.</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!loaded ? (
        <div className="loading-state">Loading orders…</div>
      ) : !orders.length && !error ? (
        <div className="empty-state">
          <h3>No orders yet. Plenty of potential.</h3>
          <p>Find the fit that gets you.</p>
          <Link href="/#shop" className="button button-accent">
            Shop the drop
          </Link>
        </div>
      ) : (
        orders.map((order) => (
          <article className="order-card" key={order.id}>
            <div className="order-card-top">
              <div>
                <h2>Order {order.number}</h2>
                <p>
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                  })}
                </p>
              </div>
              <span className="status-pill">{order.status.replaceAll("_", " ")}</span>
            </div>
            {order.items.map((item) => (
              <div className="order-item" key={item.id}>
                <Image src={item.image} alt={item.name} width={65} height={84} />
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    {item.color} / {item.size} · Qty {item.quantity}
                  </p>
                </div>
                <b>{money(item.pricePaise * item.quantity)}</b>
              </div>
            ))}
            <div className="order-card-total">
              <span>
                Cash on delivery · {order.shippingAddress.city}, {order.shippingAddress.zip}
              </span>
              <strong>Total {money(order.totalPaise)}</strong>
            </div>
          </article>
        ))
      )}
    </>
  );
}
