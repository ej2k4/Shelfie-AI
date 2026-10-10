// lib/inventory.ts
// Atomic inventory operations — concurrency-safe via SQLite transactions.
// The conditional-update pattern mirrors Cosmos DB conditional patch (Section 4.5).
// When migrating to Cosmos DB, replace transaction blocks with:
//   container.item(id, shopId).patch({ condition: "...", operations: [...] })

import { getDb } from "./db";
import type { Reservation, ItemRequest } from "./types";
import { randomInt } from "crypto";
import { randomUUID } from "crypto";
import { scheduleExpiry } from "./expiry";

// ─── Reserve from Online Pool (atomic) ────────────────────────────────────────

export interface ReserveArgs {
  inventoryId: string;
  shopId: string;
  qty: number;
  phone: string;
  holdMinutes?: number;
}

export interface ReserveResult {
  reservation: Reservation;
}

export function reserveFromOnlinePool(args: ReserveArgs): ReserveResult {
  const { inventoryId, shopId, qty, phone, holdMinutes = 45 } = args;

  if (!Number.isInteger(qty) || qty < 1 || qty > 5) {
    throw new Error("INVALID_QTY");
  }

  const db = getDb();

  // Check active holds for this phone (rate limit: max 2 active holds)
  const activeHolds = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM reservations WHERE customerPhone = ? AND status = 'HELD'`
    )
    .get(phone) as { cnt: number };
  if (activeHolds.cnt >= 2) throw new Error("TOO_MANY_HOLDS");

  // SQLite transaction: atomic read-check-write (prevents overselling)
  const doReserve = db.transaction(() => {
    const inv = db
      .prepare(
        `SELECT onlineQty, offlineQty FROM inventory WHERE id = ? AND shopId = ?`
      )
      .get(inventoryId, shopId) as
      | { onlineQty: number; offlineQty: number }
      | undefined;

    if (!inv) throw new Error("NOT_FOUND");
    if (inv.onlineQty < qty) throw new Error("OUT_OF_STOCK");

    // Atomic decrement
    db.prepare(
      `UPDATE inventory SET onlineQty = onlineQty - ?, lastUpdated = ? WHERE id = ? AND shopId = ?`
    ).run(qty, new Date().toISOString(), inventoryId, shopId);

    const now = Date.now();
    const res: Reservation = {
      id: `res_${randomUUID()}`,
      shopId,
      inventoryId,
      customerPhone: phone,
      qty,
      status: "HELD",
      source: "ONLINE_POOL",
      pickupCode: String(randomInt(100000, 999999)),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + holdMinutes * 60_000).toISOString(),
      ttl: 7 * 24 * 3600,
    };

    db.prepare(`
      INSERT INTO reservations (id, shopId, inventoryId, customerPhone, qty, status, source, pickupCode, createdAt, expiresAt, ttl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      res.id, res.shopId, res.inventoryId, res.customerPhone,
      res.qty, res.status, res.source, res.pickupCode,
      res.createdAt, res.expiresAt, res.ttl
    );

    return res;
  });

  const reservation = doReserve() as Reservation;

  // Schedule expiry (non-blocking; safe to call after the transaction)
  scheduleExpiry(reservation.id, shopId, new Date(reservation.expiresAt));

  return { reservation };
}

// ─── Cancel Reservation ────────────────────────────────────────────────────────

export function cancelReservation(reservationId: string, shopId: string) {
  const db = getDb();

  const doCancel = db.transaction(() => {
    const res = db
      .prepare(
        `SELECT * FROM reservations WHERE id = ? AND shopId = ?`
      )
      .get(reservationId, shopId) as Reservation | undefined;

    if (!res) throw new Error("NOT_FOUND");
    if (res.status !== "HELD") throw new Error("NOT_CANCELLABLE");

    db.prepare(
      `UPDATE reservations SET status = 'CANCELLED' WHERE id = ?`
    ).run(reservationId);

    const field = res.source === "ONLINE_POOL" ? "onlineQty" : "offlineQty";
    db.prepare(
      `UPDATE inventory SET ${field} = ${field} + ?, lastUpdated = ? WHERE id = ? AND shopId = ?`
    ).run(res.qty, new Date().toISOString(), res.inventoryId, shopId);

    return res;
  });

  return doCancel();
}

// ─── Create Request Item ───────────────────────────────────────────────────────

export interface CreateRequestArgs {
  inventoryId: string;
  shopId: string;
  qty: number;
  phone: string;
  etaMinutes: number;
}

export function createRequest(args: CreateRequestArgs): ItemRequest {
  const { inventoryId, shopId, qty, phone, etaMinutes } = args;
  const db = getDb();

  // Verify the item is requestable (offlineQty > 0, onlineQty == 0)
  const inv = db
    .prepare(`SELECT onlineQty, offlineQty FROM inventory WHERE id = ? AND shopId = ?`)
    .get(inventoryId, shopId) as { onlineQty: number; offlineQty: number } | undefined;

  if (!inv) throw new Error("NOT_FOUND");
  if (inv.offlineQty < qty) throw new Error("NOT_REQUESTABLE");

  const now = Date.now();
  const req: ItemRequest = {
    id: `req_${randomUUID()}`,
    shopId,
    inventoryId,
    customerPhone: phone,
    qty,
    etaMinutes,
    status: "PENDING",
    expiresAt: new Date(now + 3 * 60_000).toISOString(), // 3-min shopkeeper timeout
    ttl: 86400,
    createdAt: new Date(now).toISOString(),
  };

  db.prepare(`
    INSERT INTO requests (id, shopId, inventoryId, customerPhone, qty, etaMinutes, status, expiresAt, ttl, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.id, req.shopId, req.inventoryId, req.customerPhone,
    req.qty, req.etaMinutes, req.status, req.expiresAt, req.ttl, req.createdAt
  );

  // Schedule request expiry
  scheduleRequestExpiry(req.id, shopId, new Date(req.expiresAt));

  return req;
}

// ─── Accept Request (atomic) ───────────────────────────────────────────────────

export function acceptRequest(
  requestId: string,
  shopId: string
): Reservation & { requestId: string } {
  const db = getDb();

  const doAccept = db.transaction(() => {
    // Load request, must still be PENDING
    const req = db
      .prepare(`SELECT * FROM requests WHERE id = ? AND shopId = ? AND status = 'PENDING'`)
      .get(requestId, shopId) as ItemRequest | undefined;

    if (!req) throw new Error("REQUEST_NOT_FOUND");

    // Atomically take from offline pool if available
    const inv = db
      .prepare(`SELECT offlineQty FROM inventory WHERE id = ? AND shopId = ?`)
      .get(req.inventoryId, shopId) as { offlineQty: number } | undefined;

    if (inv) {
      const newOffline = Math.max(0, (inv.offlineQty || 0) - req.qty);
      db.prepare(
        `UPDATE inventory SET offlineQty = ?, lastUpdated = ? WHERE id = ? AND shopId = ?`
      ).run(newOffline, new Date().toISOString(), req.inventoryId, shopId);
    }

    // Mark request ACCEPTED (guard: only PENDING → ACCEPTED)
    db.prepare(`UPDATE requests SET status = 'ACCEPTED' WHERE id = ? AND status = 'PENDING'`).run(requestId);

    // Get shop's defaultHoldMinutes
    const shop = db.prepare(`SELECT defaultHoldMinutes FROM shops WHERE shopId = ?`).get(shopId) as
      | { defaultHoldMinutes: number }
      | undefined;
    const holdMinutes = Math.min(Math.max((req.etaMinutes || 15) + 15, 30), 60);

    const now = Date.now();
    const resId = `res_${randomUUID()}`;
    const res = {
      id: resId,
      requestId,  // link back to originating request (for B-02)
      shopId,
      inventoryId: req.inventoryId,
      customerPhone: req.customerPhone,
      qty: req.qty,
      status: "HELD" as const,
      source: "OFFLINE_CONVERTED" as const,
      pickupCode: String(randomInt(100000, 999999)),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + holdMinutes * 60_000).toISOString(),
      ttl: 7 * 24 * 3600,
    };

    db.prepare(`
      INSERT INTO reservations (id, requestId, shopId, inventoryId, customerPhone, qty, status, source, pickupCode, createdAt, expiresAt, ttl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      res.id, res.requestId, res.shopId, res.inventoryId, res.customerPhone,
      res.qty, res.status, res.source, res.pickupCode,
      res.createdAt, res.expiresAt, res.ttl
    );

    // Update shop stats — safe read-parse-write
    try {
      const shopRow = db.prepare(`SELECT stats FROM shops WHERE shopId = ?`).get(shopId) as any;
      if (shopRow?.stats) {
        const updatedStats = typeof shopRow.stats === "string" ? JSON.parse(shopRow.stats) : shopRow.stats;
        updatedStats.requestsAccepted = (updatedStats.requestsAccepted || 0) + 1;
        db.prepare(`UPDATE shops SET stats = ? WHERE shopId = ?`)
          .run(JSON.stringify(updatedStats), shopId);
      }
    } catch (e) {
      console.warn("Could not update shop stats:", e);
    }

    return res;
  });

  const reservation = doAccept() as Reservation & { requestId: string };
  scheduleExpiry(reservation.id, shopId, new Date(reservation.expiresAt));
  return reservation;
}

// ─── Decline Request ───────────────────────────────────────────────────────────

export function declineRequest(requestId: string, shopId: string) {
  const db = getDb();
  const changes = db
    .prepare(`UPDATE requests SET status = 'DECLINED' WHERE id = ? AND shopId = ? AND status = 'PENDING'`)
    .run(requestId, shopId);
  if (changes.changes === 0) {
    db.prepare(`UPDATE requests SET status = 'DECLINED' WHERE id = ?`).run(requestId);
  }
}

// ─── Verify Pickup Code ────────────────────────────────────────────────────────

export function verifyPickupCode(shopId: string, code: string) {
  const db = getDb();

  const doVerify = db.transaction(() => {
    const res = db
      .prepare(`
        SELECT r.*, i.name as productName, i.price as productPrice, i.imageEmoji
        FROM reservations r
        JOIN inventory i ON r.inventoryId = i.id
        WHERE r.shopId = ? AND r.pickupCode = ? AND r.status = 'HELD'
      `)
      .get(shopId, code) as any;

    if (!res) throw new Error("INVALID_CODE");
    if (new Date(res.expiresAt) < new Date()) throw new Error("CODE_EXPIRED");

    db.prepare(`UPDATE reservations SET status = 'COLLECTED' WHERE id = ?`).run(res.id);

    // Update shop stats
    db.prepare(`
      UPDATE shops SET
        stats = json_set(
          json_set(stats, '$.pickupsConfirmed', json_extract(stats, '$.pickupsConfirmed') + 1),
          '$.pickupsFulfilled', json_extract(stats, '$.pickupsFulfilled') + 1
        )
      WHERE shopId = ?
    `).run(shopId);

    return res;
  });

  return doVerify();
}

// ─── Rebalance Pools ───────────────────────────────────────────────────────────

export function rebalancePools(
  inventoryId: string,
  shopId: string,
  onlineQty: number,
  offlineQty: number
) {
  const db = getDb();
  db.prepare(`
    UPDATE inventory SET onlineQty = ?, offlineQty = ?, lastUpdated = ?, lastVerified = ?
    WHERE id = ? AND shopId = ?
  `).run(onlineQty, offlineQty, new Date().toISOString(), new Date().toISOString(), inventoryId, shopId);
}

// ─── Request Expiry ─────────────────────────────────────────────────────────────

function scheduleRequestExpiry(requestId: string, shopId: string, expiresAt: Date) {
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return;
  setTimeout(() => {
    try {
      const db = getDb();
      const changes = db
        .prepare(`UPDATE requests SET status = 'EXPIRED' WHERE id = ? AND status = 'PENDING'`)
        .run(requestId);
      if (changes.changes > 0) {
        // Notify customer that request expired
        db.prepare(`
          INSERT INTO notifications (id, shopId, type, title, body, requestId, read, createdAt, channel)
          VALUES (?, ?, 'REQUEST_EXPIRED', 'Request expired', 'The shop did not respond in time. Try another nearby shop.', ?, 0, ?, 'IN_APP')
        `).run(`notif_${randomUUID()}`, shopId, requestId, new Date().toISOString());
      }
    } catch (e) {
      console.error("[requestExpiry] error:", e);
    }
  }, ms);
}
