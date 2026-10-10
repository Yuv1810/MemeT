import { db } from "@/lib/db";
import { requireUser, rateLimit } from "@/lib/auth";
import { placeOrder } from "@/lib/orders";
import { enforceOrigin, readJson, route } from "@/lib/http";
export async function GET() {
  return route(async () => {
    const user = await requireUser();
    return {
      orders: await db.order.findMany({
        where: { userId: user.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    };
  });
}
export async function POST(request: Request) {
  return route(async () => {
    enforceOrigin(request);
    const user = await requireUser();
    await rateLimit(`checkout:${user.id}`, 20, 15);
    const order = await placeOrder(user, await readJson(request));
    return { order };
  });
}
