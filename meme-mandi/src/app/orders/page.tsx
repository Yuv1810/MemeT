import { Orders } from "@/components/orders";
export const metadata = { title: "My orders" };
export default function Page() {
  return (
    <div className="page-shell">
      <Orders />
    </div>
  );
}
