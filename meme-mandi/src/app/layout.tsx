import type { Metadata } from "next";
import "@fontsource/anton/latin-400.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/dm-sans/latin-800.css";
import "./globals.css";
import { StoreProvider } from "@/components/store-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BagDrawer } from "@/components/bag-drawer";
export const metadata: Metadata = {
  title: { default: "MemT — Wear the group chat", template: "%s | MemT" },
  description:
    "Original Indian meme T-shirts and hoodies. Oversized fits, everyday comfort, and a little internet energy.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <StoreProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <BagDrawer />
        </StoreProvider>
      </body>
    </html>
  );
}
