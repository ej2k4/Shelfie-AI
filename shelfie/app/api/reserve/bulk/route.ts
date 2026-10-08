// app/api/reserve/bulk/route.ts
// Phase 2 Task 2.2: Atomic bulk reservation for cart checkout.
// All items are reserved inside a single SQLite transaction.
// If any item fails (out of stock), the entire batch is rolled back atomically.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { randomInt, randomUUID } from "crypto";
import { scheduleExpiry } from "@/lib/expiry";
import { logEvent } from "@/lib/events";

const itemSchema = z.object({
  inventoryId: z.string().min(1),
  shopId: z.string().min(1),
  qty: z.number().int().min(1).max(5),
});

const bulkSchema = z.object({
  items: z.array(itemSchema).min(1).max(10),
  phone: z.string().regex(/^\+\d{10,15}$/, "Phone must be in E.164 format"),
  holdMinutes: z.number().int().min(15).max(60).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, phone, holdMinutes = 45 } = bulkSchema.parse(body);

    const db = getDb();

    // Check active holds for this phone (max 2 per customer, across all items)
    const activeHolds = db
      .prepare(`SELECT COUNT(*) as cnt FROM reservations WHERE customerPhone = ? AND status = 'HELD'`)
      .get(phone) as { cnt: number };
    if (activeHolds.cnt + items.length > 5) {
      return NextResponse.json({ error: "TOO_MANY_HOLDS" }, { status: 429 });
    }

    const now = Date.now();
    const reservations: any[] = [];

    // Single atomic transaction — all succeed or all roll back
    const doBulkReserve = db.transaction(() => {
      for (const item of items) {
        const inv = db
          .prepare(`SELECT onlineQty FROM inventory WHERE id = ? AND shopId = ?`)
          .get(item.inventoryId, item.shopId) as { onlineQty: number } | undefined;

        if (!inv) throw Object.assign(new Error("NOT_FOUND"), { inventoryId: item.inventoryId });
        if (inv.onlineQty < item.qty) throw Object.assign(new Error("OUT_OF_STOCK"), { inventoryId: item.inventoryId });

        db.prepare(
          `UPDATE inventory SET onlineQty = onlineQty - ?, lastUpdated = ? WHERE id = ? AND shopId = ?`
        ).run(item.qty, new Date(now).toISOString(), item.inventoryId, item.shopId);

        const res = {
          id: `res_${randomUUID()}`,
          shopId: item.shopId,
          inventoryId: item.inventoryId,
          customerPhone: phone,
          qty: item.qty,
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

        reservations.push(res);
      }
      return reservations;
    });

    const created = doBulkReserve() as typeof reservations;

    // Schedule expiry timers outside the transaction (non-blocking)
    for (const res of created) {
      scheduleExpiry(res.id, res.shopId, new Date(res.expiresAt));
      logEvent("RESERVE", { shopId: res.shopId, productKey: res.inventoryId });
    }

    return NextResponse.json({
      success: true,
      reservations: created.map((r) => ({
        reservationId: r.id,
        shopId: r.shopId,
        inventoryId: r.inventoryId,
        qty: r.qty,
        pickupCode: r.pickupCode,
        expiresAt: r.expiresAt,
        status: r.status,
      })),
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    const status =
      err.message === "OUT_OF_STOCK" ? 409
      : err.message === "TOO_MANY_HOLDS" ? 429
      : err.message === "NOT_FOUND" ? 404
      : 500;
    return NextResponse.json({
      error: err.message,
      inventoryId: err.inventoryId ?? null,
    }, { status });
  }
}
