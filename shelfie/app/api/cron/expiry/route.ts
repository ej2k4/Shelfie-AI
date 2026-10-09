// app/api/cron/expiry/route.ts
// Safety-net sweeper: expires HELD reservations past their expiresAt.
// In production, call this via a scheduled job every 2 minutes.
// Protected by CRON_SECRET bearer token.
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  // Verify bearer token — prevents public execution of this endpoint
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
