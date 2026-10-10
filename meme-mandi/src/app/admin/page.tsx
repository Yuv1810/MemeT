import { Admin } from "@/components/admin";
export const metadata = { title: "Store admin", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <div className="page-shell admin-shell">
      <Admin />
    </div>
  );
}
