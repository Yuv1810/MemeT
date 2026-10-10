import Link from "next/link";
import { BrandLogo } from "./brand-logo";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Link href="/" className="footer-logo" aria-label="MemT home">
            <BrandLogo />
          </Link>
          <p>Internet humour. Offline wardrobe.</p>
        </div>
        <div className="footer-links">
          <Link href="/#shop">Shop the drop</Link>
          <Link href="/orders">My orders</Link>
          <Link href="/login">My account</Link>
          <Link href="/admin">Store admin</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} MemT. Made for the group chat.</span>
        <span>INDIAN AT HEART. INTERNET BY HABIT.</span>
      </div>
    </footer>
  );
}
