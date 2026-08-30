import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const GOOGLE_CONNECTOR_ID = "google_oauth";
export const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
export const GOOGLE_CALLBACK_PATH = "/api/public/google/oauth/callback";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

export function googleOAuthConfigured() {
  return Boolean(process.env["GOOGLE_OAUTH_CLIENT_ID"] && process.env["GOOGLE_OAUTH_CLIENT_SECRET"]);
}

function credentials() {
  const clientId = process.env["GOOGLE_OAUTH_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_OAUTH_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar isn't set up on this server yet.");
  }
  return { clientId, clientSecret };
}

function stateKey() {
  const raw =
    process.env["GOOGLE_OAUTH_STATE_SECRET"] ??
    process.env["APP_USER_CONNECTION_KEY_SECRET"] ??
    process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!raw) throw new Error("No server secret available to sign the OAuth state.");
  return createHash("sha256").update(raw).digest();
}

/** state = base64url({userId, exp}) + "." + hmac, valid for 10 minutes. */
export function signState(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + 10 * 60 * 1000 }),
  ).toString("base64url");
  const sig = createHmac("sha256", stateKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyState(state: string): string | null {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", stateKey()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId?: string;
      exp?: number;
    };
    if (!data.userId || !data.exp || data.exp < Date.now()) return null;
    return data.userId;
  } catch {
    return null;
  }
}

export function buildConsentUrl(userId: string, redirectUri: string) {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: signState(userId),
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

async function tokenRequest(body: URLSearchParams) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google token request failed (${res.status}): ${text.slice(0, 300)}`);
  return JSON.parse(text || "{}") as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const { clientId, clientSecret } = credentials();
  return tokenRequest(
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  );
}

export async function accessTokenFromRefresh(refreshToken: string) {
  const { clientId, clientSecret } = credentials();
  const data = await tokenRequest(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  );
  if (!data.access_token) throw new Error("Google did not return an access token.");
  return data.access_token;
}

export async function revokeToken(token: string) {
  await fetch(REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
}

/** Public origin of the running app, honouring sandbox/proxy forwarding. */
export function appOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwardedHost}`;
  }
  return url.origin;
}

export function redirectUriFor(request: Request) {
  return new URL(GOOGLE_CALLBACK_PATH, appOrigin(request)).toString();
}
