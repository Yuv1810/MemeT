"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingBag, UserRound, LogOut, Package } from "lucide-react";
import { useState } from "react";
import { api, useStore } from "./store-provider";
import { BrandLogo } from "./brand-logo";
export function Header() {
  const path = usePathname(),
    { user, bag, setBagOpen, notify } = useStore();
  const [menu, setMenu] = useState(false),
    [account, setAccount] = useState(false);
  async function logout() {
    try {
      await api("/api/auth/logout", "POST", {});
      window.location.assign("/");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <div className="announcement">
        <span>GOOD MEMES. GREAT FITS. NO CONTEXT NEEDED.</span>
        <span className="announcement-extra">FREE SHIPPING ON ORDERS ₹1,499+</span>
      </div>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="MemT home">
          <BrandLogo />
        </Link>
        <nav className={menu ? "main-nav open" : "main-nav"} aria-label="Main navigation">
          <Link
            href="/#shop"
            onClick={() => setMenu(false)}
            className={path === "/" ? "active" : ""}
          >
            Shop all
          </Link>
          <Link href="/?category=T-shirts#shop" onClick={() => setMenu(false)}>
            T-shirts
          </Link>
          <Link href="/?category=Hoodies#shop" onClick={() => setMenu(false)}>
            Hoodies
          </Link>
          <Link href="/orders" onClick={() => setMenu(false)}>
            My orders
          </Link>
        </nav>
        <div className="header-actions">
          <div className="account-container">
            <button
              className="icon-button"
              aria-label={user ? "Account menu" : "Sign in"}
              aria-expanded={account}
              onClick={() => (user ? setAccount(!account) : window.location.assign("/login"))}
            >
              <UserRound size={21} />
            </button>
            {account && user && (
              <div className="account-menu">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
                <Link href="/orders" onClick={() => setAccount(false)}>
                  <Package size={16} />
                  My orders
                </Link>
                {user.role === "ADMIN" && (
                  <Link href="/admin" onClick={() => setAccount(false)}>
                    Store admin
                  </Link>
                )}
                <button onClick={logout}>
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
          <button
            className="bag-button"
            onClick={() => setBagOpen(true)}
            aria-label={`Open bag with ${bag.count} items`}
          >
            <ShoppingBag size={20} />
            <span>Bag</span>
            <b>{bag.count}</b>
          </button>
          <button
            className="icon-button mobile-menu"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
    </>
  );
}
