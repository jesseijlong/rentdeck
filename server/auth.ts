import crypto from "node:crypto";

// Password gate for RentDeck (single-user, LAN/self-hosted).
// Password and secret come from env vars (set in docker-compose.yml),
// so they are NOT baked into the image.

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "rentdeck-dev-secret-change-me";
const COOKIE_NAME = "rd_auth";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function b64url(input: string | Buffer): string {
  return Buffer.from(input as never).toString("base64url");
}

function sign(value: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

/** Create a signed session cookie value: payload.signature */
export function createSession(): string {
  const payload = b64url(JSON.stringify({ authed: true, exp: Date.now() + MAX_AGE_SECONDS * 1000 }));
  return `${payload}.${sign(payload)}`;
}

/** Verify a session cookie value. Returns true if valid and not expired. */
export function verifySession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const [payload, sig] = cookieValue.split(".");
  if (!payload || !sig) return false;
  if (sign(payload) !== sig) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data?.authed) return false;
    if (typeof data.exp === "number" && data.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export const AUTH_COOKIE = COOKIE_NAME;
export const AUTH_MAX_AGE = MAX_AGE_SECONDS;

/** True if a password has been configured (gate active). */
export function isAuthEnabled(): boolean {
  return AUTH_PASSWORD.length > 0;
}

/** Returns true if the request is authenticated (valid session cookie). */
export function isAuthenticated(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== "string") return false;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return verifySession(match?.[1]);
}

/** Validate a submitted password. */
export function checkPassword(submitted: string): boolean {
  if (!isAuthEnabled()) return false;
  // constant-time-ish comparison
  const a = Buffer.from(submitted);
  const b = Buffer.from(AUTH_PASSWORD);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
