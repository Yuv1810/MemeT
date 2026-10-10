export function money(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}
export function shipping(subtotal: number) {
  return subtotal >= 149900 ? 0 : 7900;
}
