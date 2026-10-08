// lib/expiry.ts
// Hold expiry for reservations.
// Uses setTimeout in-process (prototype). In production, replace with Azure Service Bus scheduled messages.
// The expiry handler is idempotent — safe to run twice.

import { randomUUID } from "crypto";

export function scheduleExpiry(
  reservationId: string,
  shopId: string,
  expiresAt: Date
) {
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) {
    runExpiry(reservationId, shopId);
    return;
  }
  setTimeout(() => runExpiry(reservationId, shopId), ms);
}

function runExpiry(reservationId: string, shopId: string) {
  try {
    // Lazy-import to avoid circular deps and edge-runtime issues
    const { getDb } = require("./db");
    const db = getDb();

    const res = db
      .prepare(`SELECT * FROM reservations WHERE id = ? AND status = 'HELD'`)
      .get(reservationId);

    if (!res) return; // Already collected or cancelled — idempotent

    db.prepare(`UPDATE reservations SET status = 'EXPIRED' WHERE id = ? AND status = 'HELD'`).run(
      reservationId
    );

    // Return units to the correct pool
    const field = res.source === "ONLINE_POOL" ? "onlineQty" : "offlineQty";
    db.prepare(
      `UPDATE inventory SET ${field} = ${field} + ?, lastUpdated = ? WHERE id = ? AND shopId = ?`
    ).run(res.qty, new Date().toISOString(), res.inventoryId, shopId);

    console.log(`[expiry] Reservation ${reservationId} expired, returned ${res.qty} units to ${field}`);
  } catch (e) {
    console.error(`[expiry] Error expiring ${reservationId}:`, e);
  }
}

/**
 * B-04 fix: Persistent sweeper that catches any holds/requests missed by setTimeout
 * (e.g. due to server restarts). Call once from getDb() on startup.
 */
export function startExpirySweeper() {
  setInterval(() => {
    try {
      const { getDb } = require("./db");
      const db = getDb();

      // Expire old HELD reservations and restore stock
      const expiredRes = db.prepare(
        `SELECT id, shopId, inventoryId, qty, source FROM reservations
         WHERE status = 'HELD' AND expiresAt < datetime('now')`
      ).all() as any[];

      for (const res of expiredRes) {
        const changed = db.prepare(
          `UPDATE reservations SET status = 'EXPIRED' WHERE id = ? AND status = 'HELD'`
        ).run(res.id);
        if (changed.changes > 0) {
          const field = res.source === "ONLINE_POOL" ? "onlineQty" : "offlineQty";
          db.prepare(
            `UPDATE inventory SET ${field} = ${field} + ?, lastUpdated = datetime('now') WHERE id = ? AND shopId = ?`
          ).run(res.qty, res.inventoryId, res.shopId);
          console.log(`[sweeper] expired reservation ${res.id}, returned ${res.qty} to ${field}`);
        }
      }

      // Expire old PENDING requests
      const expiredReqs = db.prepare(
        `UPDATE requests SET status = 'EXPIRED' WHERE status = 'PENDING' AND expiresAt < datetime('now')`
      ).run();
      if (expiredReqs.changes > 0) {
        console.log(`[sweeper] expired ${expiredReqs.changes} pending request(s)`);
      }
    } catch (e) {
      console.error("[sweeper]", e);
    }
  }, 60_000);
}
