import { Checkout } from "@/components/checkout";
export const metadata = { title: "Checkout" };
export default function Page() {
  return (
    <div className="page-shell">
      <Checkout />
    </div>
  );
}
