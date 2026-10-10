import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/http";
export async function GET() {
  return route(async () => {
    await requireUser(true);
    return {
      orders: await db.order.findMany({
        include: { items: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      qikinkConnected:
        process.env.QIKINK_ENABLED === "true" && Boolean(process.env.QIKINK_AUTH_TOKEN),
    };
  });
}
