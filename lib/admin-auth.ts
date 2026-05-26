import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, hasFirebaseAdminConfig } from "@/lib/firebase-admin";

const COOKIE_NAME = "foretagsnamn_admin";
const AUTH_DOC = "auth";

export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || "mosegaard622@gmail.com").toLowerCase();
}

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SECRET_KEY || "";
}

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [scheme, salt, expectedHash] = storedHash.split("$");
  if (scheme !== "scrypt" || !salt || !expectedHash) return false;
  const actual = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function getStoredPasswordHash(): Promise<string | null> {
  if (process.env.ADMIN_PASSWORD_HASH) return process.env.ADMIN_PASSWORD_HASH;
  if (!hasFirebaseAdminConfig()) return null;

  const snapshot = await getAdminFirestore().collection("admin_config").doc(AUTH_DOC).get();
  const hash = snapshot.data()?.passwordHash;
  return typeof hash === "string" ? hash : null;
}

export async function hasAdminPassword(): Promise<boolean> {
  return Boolean(await getStoredPasswordHash());
}

export async function createAdminPassword(password: string, setupToken: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasFirebaseAdminConfig()) {
    return { ok: false, error: "Firebase Admin måste vara konfigurerat för första lösenordet." };
  }

  if (!process.env.ADMIN_SETUP_TOKEN || setupToken !== process.env.ADMIN_SETUP_TOKEN) {
    return { ok: false, error: "Ogiltig setup-token." };
  }

  if (await getStoredPasswordHash()) {
    return { ok: false, error: "Adminlösenord finns redan." };
  }

  if (password.length < 12) {
    return { ok: false, error: "Välj minst 12 tecken." };
  }

  await getAdminFirestore().collection("admin_config").doc(AUTH_DOC).set({
    email: getAdminEmail(),
    passwordHash: hashAdminPassword(password),
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true };
}

function signSession(email: string, expiresAt: number): string {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Admin session secret is missing.");
  const payload = Buffer.from(JSON.stringify({ email, expiresAt })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function clearAdminCookie(response: Response): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`);
}

export function setAdminCookie(response: Response, email: string): void {
  const maxAge = 60 * 60 * 8;
  const token = signSession(email, Date.now() + maxAge * 1000);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${maxAge}`);
}

export async function loginAdmin(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (email.toLowerCase() !== getAdminEmail()) {
    return { ok: false, error: "Fel e-post eller lösenord." };
  }

  const storedHash = await getStoredPasswordHash();
  if (!storedHash || !verifyPassword(password, storedHash)) {
    return { ok: false, error: "Fel e-post eller lösenord." };
  }

  if (!getSessionSecret()) {
    return { ok: false, error: "ADMIN_SESSION_SECRET saknas." };
  }

  return { ok: true };
}

export async function getAdminSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const secret = getSessionSecret();
  if (!token || !secret || !token.includes(".")) return null;

  const [payload, signature] = token.split(".");
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: unknown; expiresAt?: unknown };
    if (data.email !== getAdminEmail() || typeof data.expiresAt !== "number" || data.expiresAt < Date.now()) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}
