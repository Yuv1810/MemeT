import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/security";
const db = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password || password.length < 14)
    throw new Error(
      "Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 14 characters, then run this command.",
    );
  if (await db.user.findUnique({ where: { email } }))
    throw new Error(
      "This account already exists. Use a deliberate database role update to promote an existing verified user.",
    );
  await db.user.create({
    data: {
      email,
      name: process.env.ADMIN_NAME || "Store owner",
      role: "ADMIN",
      passwordHash: await hashPassword(password),
      emailVerifiedAt: new Date(),
    },
  });
  console.log(
    "Admin created. Sign in with the configured credentials. Remove ADMIN_PASSWORD from the environment afterward.",
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
