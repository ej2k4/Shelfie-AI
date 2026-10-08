// app/api/cron/expiry/route.ts
// Safety-net sweeper: expires HELD reservations past their expiresAt.
// In production, call this via a scheduled job every 2 minutes.
// The setTimeout in scheduleExpiry is the primary expiry mechanism.
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const now = new Date().toISOString();

    const expired = db.prepare(`
      SELECT * FROM reservations WHERE status = 'HELD' AND expiresAt < ?
    `).all(now) as any[];

    let count = 0;
    const doExpiry = db.transaction(() => {
      for (const res of expired) {
        const changes = db.prepare(
          `UPDATE reservations SET status = 'EXPIRED' WHERE id = ? AND status = 'HELD'`
        ).run(res.id);

        if (changes.changes > 0) {
          const field = res.source === "ONLINE_POOL" ? "onlineQty" : "offlineQty";
          db.prepare(
            `UPDATE inventory SET ${field} = ${field} + ?, lastUpdated = ? WHERE id = ? AND shopId = ?`
          ).run(res.qty, now, res.inventoryId, res.shopId);
          count++;
        }
      }
    });
    doExpiry();

    // Also expire requests
    const expiredRequests = db.prepare(
      `UPDATE requests SET status = 'EXPIRED' WHERE status = 'PENDING' AND expiresAt < ?`
    ).run(now);

    return NextResponse.json({
      expiredReservations: count,
      expiredRequests: expiredRequests.changes,
    });
  } catch (err) {
    console.error("[cron/expiry]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
