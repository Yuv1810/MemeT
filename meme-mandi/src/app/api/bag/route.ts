import { z } from "zod";
import { bagSummary, changeBag } from "@/lib/bag";
import { enforceOrigin, readJson, route } from "@/lib/http";
export async function GET() {
  return route(bagSummary);
}
export async function POST(request: Request) {
  return route(async () => {
    enforceOrigin(request);
    const { variantId, quantity } = z
      .object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(10) })
      .parse(await readJson(request));
    return changeBag(variantId, quantity, "add");
  });
}
export async function PATCH(request: Request) {
  return route(async () => {
    enforceOrigin(request);
    const { variantId, quantity } = z
      .object({ variantId: z.string().min(1), quantity: z.number().int().min(0).max(10) })
      .parse(await readJson(request));
    return changeBag(variantId, quantity, "set");
  });
}
