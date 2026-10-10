import { cookies } from "next/headers";
import { randomInt, timingSafeEqual } from "node:crypto";
import type { TokenPurpose } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./http";
import { hashCode, hashToken, randomToken } from "./security";
import { sendCode } from "./mail";
const SESSION_COOKIE = "mm_session";
export async function rateLimit(key: string, limit = 10, minutes = 15) {
  const expiresAt = new Date(Date.now() + minutes * 60000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${hashToken(key)}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN EXCLUDED."expiresAt" ELSE "RateLimit"."expiresAt" END
    RETURNING "count"`;
  if (rows[0].count > limit)
    throw new ApiError(429, "Too many attempts. Please wait a few minutes and try again.");
}
export async function getUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.emailVerifiedAt) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}
export async function requireUser(admin = false) {
  const user = await getUser();
  if (!user) throw new ApiError(401, "Sign in to continue.");
  if (admin && user.role !== "ADMIN")
    throw new ApiError(403, "Only store admins can access this page.");
  return user;
}
export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.APP_URL?.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export async function logout() {
  const jar = await cookies(),
    token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
  jar.delete("mm_bag");
}
export async function issueCode(userId: string, email: string, purpose: TokenPurpose) {
  await rateLimit(`send:${email}:${purpose}`, 5, 30);
  const key = { userId_purpose: { userId, purpose } };
  const existing = await db.emailToken.findUnique({ where: key });
  if (existing && Date.now() - existing.sentAt.getTime() < 60000)
    throw new ApiError(429, "Please wait 60 seconds before requesting another code.");
  const code = String(randomInt(100000, 1000000));
  const codeHash = hashCode(email, purpose, code);
  // Delivery failure leaves the previous code usable. Issuance is rate limited in PostgreSQL.
  await sendCode(email, code, purpose);
  await db.emailToken.upsert({
    where: key,
    create: { userId, purpose, codeHash, expiresAt: new Date(Date.now() + 600000) },
    update: { codeHash, attempts: 0, sentAt: new Date(), expiresAt: new Date(Date.now() + 600000) },
  });
}
export async function consumeCode(
  email: string,
  code: string,
  purpose: TokenPurpose,
  newPasswordHash?: string,
) {
  await rateLimit(`verify:${email}:${purpose}`, 10, 15);
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(400, "That code is invalid or has expired.");
  const token = await db.emailToken.findUnique({
    where: { userId_purpose: { userId: user.id, purpose } },
  });
  if (!token || token.expiresAt <= new Date() || token.attempts >= 5)
    throw new ApiError(400, "That code is invalid or has expired. Request a new one.");
  const claimed = await db.emailToken.updateMany({
    where: {
      id: token.id,
      codeHash: token.codeHash,
      attempts: { lt: 5 },
      expiresAt: { gt: new Date() },
    },
    data: { attempts: { increment: 1 } },
  });
  if (!claimed.count) throw new ApiError(400, "Request a new code and try again.");
  if (!timingSafeEqual(Buffer.from(token.codeHash), Buffer.from(hashCode(email, purpose, code))))
    throw new ApiError(400, "That code is incorrect. Please check your email.");
  await db.$transaction(async (tx) => {
    const removed = await tx.emailToken.deleteMany({
      where: { id: token.id, codeHash: token.codeHash },
    });
    if (!removed.count) throw new ApiError(400, "That code has already been used.");
    if (purpose === "VERIFY_EMAIL")
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    else {
      if (!newPasswordHash) throw new ApiError(400, "A new password is required.");
      await tx.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash } });
      await tx.session.deleteMany({ where: { userId: user.id } });
    }
  });
  return user.id;
}
