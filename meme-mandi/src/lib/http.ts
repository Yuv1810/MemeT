import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function enforceOrigin(request: Request) {
  const configured = process.env.APP_URL;
  if (!configured)
    throw new ApiError(503, "The store is being configured. Please try again later.");
  const configuredOrigin = new URL(configured).origin;
  const requestOrigin = request.headers.get("origin");
  const isLoopback = (origin: string | null) => {
    if (!origin) return false;
    try {
      const { hostname } = new URL(origin);
      return hostname === "localhost" || hostname === "127.0.0.1";
    } catch {
      return false;
    }
  };
  const match =
    requestOrigin === configuredOrigin ||
    (isLoopback(configuredOrigin) && isLoopback(requestOrigin));
  if (!match)
    throw new ApiError(403, "Please open this form from the store website.");
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Please send a JSON request.");
}
export async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Please check the form and try again.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 64000) {
      await reader.cancel();
      throw new ApiError(413, "This request is too large.");
    }
    chunks.push(value);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Object required");
    return parsed;
  } catch {
    throw new ApiError(400, "Please check the form and try again.");
  }
}
export async function route(handler: () => Promise<unknown>) {
  try {
    return NextResponse.json(await handler(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Please check your entries." },
        { status: 400 },
      );
    if (error && typeof error === "object" && "code" in error && error.code === "P2002")
      return NextResponse.json(
        { error: "That entry already exists. Please check the email, slug, or SKU." },
        { status: 409 },
      );
    console.error("Store request failed", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json(
      { error: "We couldn't complete that request. Please try again shortly." },
      { status: 503 },
    );
  }
}
