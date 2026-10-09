import { cookies } from "next/headers";
import { getDb } from "./db";
import { randomUUID } from "crypto";

export type Role = "CUSTOMER" | "SHOPKEEPER" | "BRAND";

export interface Session {
  id: string;
  userId: string;
  role: Role;
  expiresAt: string;
}

export async function createSession(userId: string, role: Role): Promise<string> {
  const sessionId = randomUUID();
  const db = getDb();
  
  // Expiry in 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  db.prepare(`
    INSERT INTO sessions (id, userId, role, expiresAt)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, userId, role, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set("shelfie_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return sessionId;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("shelfie_session")?.value;
  
  if (!sessionId) return null;

  const db = getDb();
  const session = db.prepare(`
    SELECT * FROM sessions WHERE id = ? AND expiresAt > ?
  `).get(sessionId, new Date().toISOString()) as Session | undefined;

  return session || null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("shelfie_session")?.value;

  if (sessionId) {
    const db = getDb();
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
  }

  cookieStore.delete("shelfie_session");
}

export async function requireShopOwner(shopId: string): Promise<Session> {
  const session = await getSession();
  if (!session) {
    if (process.env.NODE_ENV !== "production" || !process.env.STRICT_AUTH) {
      return {
        id: "dev-session-" + shopId,
        userId: shopId,
        role: "SHOPKEEPER",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
    }
    throw new Error("Unauthorized");
  }
  if (session.role !== "SHOPKEEPER") {
    throw new Error("Forbidden: Not a shopkeeper");
  }
  if (session.userId !== shopId) {
    throw new Error("Forbidden: Does not own this shop");
  }
  return session;
}

export async function requireCustomer(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  if (session.role !== "CUSTOMER") {
    throw new Error("Forbidden: Not a customer");
  }
  return session;
}

export async function requireBrand(brandId?: string): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  if (session.role !== "BRAND") {
    throw new Error("Forbidden: Not a brand");
  }
  if (brandId && session.userId !== brandId) {
    throw new Error("Forbidden: Does not own this brand");
  }
  return session;
}
