"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
export type StoreUser = { id: string; name: string; email: string; role: "ADMIN" | "CUSTOMER" };
export type BagLine = {
  id: string;
  quantity: number;
  variant: {
    id: string;
    sku: string;
    color: string;
    size: string;
    pricePaise: number;
    active: boolean;
    product: { name: string; slug: string; image: string; active: boolean };
  };
};
export type BagData = {
  items: BagLine[];
  count: number;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
};
const emptyBag: BagData = {
  items: [],
  count: 0,
  subtotalPaise: 0,
  shippingPaise: 0,
  totalPaise: 0,
};
export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
type StoreContext = {
  user: StoreUser | null;
  bag: BagData;
  ready: boolean;
  bagOpen: boolean;
  setBagOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
  addItem: (variantId: string) => Promise<void>;
  changeQuantity: (variantId: string, quantity: number) => Promise<void>;
  toast: string;
  notify: (message: string) => void;
};
const Context = createContext<StoreContext | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoreUser | null>(null),
    [bag, setBag] = useState(emptyBag),
    [ready, setReady] = useState(false),
    [bagOpen, setBagOpen] = useState(false),
    [toast, setToast] = useState("");
  const refresh = useCallback(async () => {
    // Resolve account before bag so a guest cart is merged into the correct account.
    const account = await api<{ user: StoreUser | null }>("/api/auth/me");
    setUser(account.user);
    setBag(await api<BagData>("/api/bag"));
    setReady(true);
  }, []);
  useEffect(() => {
    refresh().catch(() => setReady(true));
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  async function addItem(variantId: string) {
    setBag(await api<BagData>("/api/bag", "POST", { variantId, quantity: 1 }));
    setBagOpen(true);
  }
  async function changeQuantity(variantId: string, quantity: number) {
    setBag(await api<BagData>("/api/bag", "PATCH", { variantId, quantity }));
  }
  return (
    <Context.Provider
      value={{
        user,
        bag,
        ready,
        bagOpen,
        setBagOpen,
        refresh,
        addItem,
        changeQuantity,
        toast,
        notify: setToast,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing StoreProvider");
  return value;
}
