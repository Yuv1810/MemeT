import Image from "next/image";
import Link from "next/link";
import { Smile, Zap, Truck, Shirt, Sparkles } from "lucide-react";
import { getProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product-grid";
export const dynamic = "force-dynamic";
export default async function Home() {
  let products: Awaited<ReturnType<typeof getProducts>> = [],
    unavailable = false;
  try {
    products = await getProducts();
  } catch {
    unavailable = true;
  }
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-star">✳</span> THE GROUP CHAT, BUT MAKE IT FASHION
          </span>
          <h1 id="hero-title">
            YOU ARE
            <br />
            WHAT YOU
            <br />
            <span>MEME.</span>
            <span className="hero-smile">
              <Smile strokeWidth={1.5} />
            </span>
          </h1>
          <p>
            Your humour has range.
            <br />
            Your wardrobe should too.
          </p>
          <Link href="#shop" className="button button-accent">
            Shop the drop <ShoppingIcon />
          </Link>
          <div className="hero-bottom">
            <span>100% DESI ENERGY</span>
            <span>ZERO BORING FITS</span>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src="/images/kal-dekhenge-black-tee.png"
            alt="Washed black oversized Kal Dekhenge T-shirt"
            fill
            priority
            sizes="(max-width: 700px) 100vw, 50vw"
          />
          <div className="drop-label">
            <span>DROP 001</span>
            <b>
              EVERYDAY
              <br />
              MAIN CHARACTER
            </b>
          </div>
          <div className="hero-sticker">
            CERTIFIED
            <br />
            <strong>MOOD.</strong>
            <Sparkles size={21} />
          </div>
          <div className="hero-product-label">
            <span>THE KAL DEKHENGE CLUB</span>
            <Link href="/products/kal-dekhenge">Meet your new uniform</Link>
          </div>
        </div>
      </section>
      <div className="ticker" aria-label="Wear your mood">
        <div>
          <span>WEAR YOUR MOOD</span>
          <Zap size={23} fill="currentColor" />
          <span>MAIN CHARACTER ENERGY</span>
          <Zap size={23} fill="currentColor" />
          <span>MEMES MADE WEARABLE</span>
          <Zap size={23} fill="currentColor" />
          <span>WEAR YOUR MOOD</span>
          <Zap size={23} fill="currentColor" />
        </div>
      </div>
      <section className="shop-section section-container" id="shop">
        <div className="section-heading">
          <div>
            <span className="eyebrow subtle">FRESH FROM THE INTERNET</span>
            <h2>
              THE DAILY ROTATION<span className="heading-dot">.</span>
            </h2>
          </div>
          <p>For the fits. For the bits.</p>
        </div>
        {unavailable ? (
          <div className="notice" role="status">
            The catalog is temporarily unavailable. Please try again shortly.
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
      <section className="brand-note section-container">
        <div className="brand-note-title">
          <span className="eyebrow">VERY INDIAN. VERY ONLINE.</span>
          <h2>
            IF YOU KNOW,
            <br />
            YOU <span>WEAR IT.</span>
          </h2>
        </div>
        <div className="brand-note-copy">
          <Smile size={43} strokeWidth={1.4} />
          <p>
            From the chai break to the group chat. Original designs for the jokes that live
            rent-free in your head.
          </p>
          <span>No explanations required. Your people get it.</span>
        </div>
      </section>
      <section className="perks section-container" aria-label="Store benefits">
        <div>
          <Shirt />
          <b>Room for your personality</b>
          <span>Relaxed, oversized fits</span>
        </div>
        <div>
          <Sparkles />
          <b>Original internet energy</b>
          <span>Designs with a desi point of view</span>
        </div>
        <div>
          <Truck />
          <b>Good fits, to your door</b>
          <span>Free shipping on orders ₹1,499+</span>
        </div>
      </section>
    </>
  );
}
function ShoppingIcon() {
  return <Shirt size={19} />;
}
