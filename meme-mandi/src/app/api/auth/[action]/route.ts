import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, enforceOrigin, readJson, route } from "@/lib/http";
import { consumeCode, createSession, getUser, issueCode, logout, rateLimit } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/security";
const emailSchema = z
  .email("Enter a valid email address.")
  .max(254)
  .transform((v) => v.trim().toLowerCase());
const password = z.string().min(10, "Use at least 10 characters for your password.").max(128);
const credentials = z.object({ email: emailSchema, password });
const emailOnly = z.object({ email: emailSchema });
const otp = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the six-digit code from your email."),
});
export async function GET(_request: Request, context: { params: Promise<{ action: string }> }) {
  return route(async () => {
    if ((await context.params).action !== "me") throw new ApiError(404, "Page not found.");
    return { user: await getUser() };
  });
}
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  return route(async () => {
    enforceOrigin(request);
    const { action } = await context.params;
    if (action === "logout") {
      await logout();
      return { ok: true };
    }
    if (!["register", "login", "verify", "resend", "forgot", "reset"].includes(action)) {
      throw new ApiError(404, "Page not found.");
    }
    const body = await readJson(request);
    // Global persistent budget also limits requests distributed across arbitrary email addresses.
    await rateLimit(`auth-global:${action}`, 300, 15);
    if (action === "register") {
      const data = credentials.extend({ name: z.string().trim().min(2).max(60) }).parse(body);
      await rateLimit(`register:${data.email}`, 5, 30);
      let user = await db.user.findUnique({ where: { email: data.email } });
      if (!user)
        user = await db.user.create({
          data: {
            email: data.email,
            name: data.name,
            passwordHash: await hashPassword(data.password),
          },
        });
      if (!user.emailVerifiedAt) await issueCode(user.id, user.email, "VERIFY_EMAIL");
      return {
        ok: true,
        message:
          "If this address can be registered, a verification code has been sent. Existing members can sign in.",
      };
    }
    if (action === "login") {
      const data = credentials.parse(body);
      await rateLimit(`login:${data.email}`, 10, 15);
      const user = await db.user.findUnique({ where: { email: data.email } });
      const dummy = "scrypt:32768:8:3:00000000000000000000000000000000:" + "0".repeat(128);
      const valid = await verifyPassword(data.password, user?.passwordHash ?? dummy);
      if (!user || !valid) throw new ApiError(401, "The email or password is incorrect.");
      if (!user.emailVerifiedAt)
        return {
          needsVerification: true,
          email: data.email,
          message: "Verify your email before signing in. Request a code below if needed.",
        };
      await createSession(user.id);
      return { ok: true };
    }
    if (action === "verify") {
      const data = otp.parse(body);
      const userId = await consumeCode(data.email, data.code, "VERIFY_EMAIL");
      await createSession(userId);
      return { ok: true };
    }
    if (action === "resend" || action === "forgot") {
      const { email } = emailOnly.parse(body);
      await rateLimit(`request:${action}:${email}`, 5, 30);
      const user = await db.user.findUnique({ where: { email } });
      if (user && (action === "forgot" || !user.emailVerifiedAt))
        await issueCode(user.id, email, action === "forgot" ? "RESET_PASSWORD" : "VERIFY_EMAIL");
      return {
        ok: true,
        message: "If the account is eligible, a code has been sent to that email address.",
      };
    }
    if (action === "reset") {
      const data = otp.extend({ password }).parse(body);
      await consumeCode(data.email, data.code, "RESET_PASSWORD", await hashPassword(data.password));
      await logout();
      return { ok: true };
    }
    throw new ApiError(404, "Page not found.");
  });
}
