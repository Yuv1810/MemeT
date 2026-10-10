import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function randomToken() {
  return randomBytes(32).toString("hex");
}
export function hashCode(email: string, purpose: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("AUTH_SECRET must have at least 32 characters.");
  return createHmac("sha256", secret).update(`${email}:${purpose}:${code}`).digest("hex");
}
const derive = (password: string, salt: string, cost = 32768, parallelism = 3) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: cost, r: 8, p: parallelism, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:32768:8:3:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split(":"),
    algorithm = parts[0];
  const modern = parts.length === 6;
  const salt = modern ? parts[4] : parts[1],
    hex = modern ? parts[5] : parts[2];
  if (algorithm !== "scrypt" || !salt || !hex) return false;
  const key = await derive(password, salt, modern ? 32768 : 16384, modern ? 3 : 1),
    expected = Buffer.from(hex, "hex");
  return expected.length === key.length && timingSafeEqual(key, expected);
}
