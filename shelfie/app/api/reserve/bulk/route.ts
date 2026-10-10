// app/api/reserve/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inventoryRepo } from "@/lib/repositories/inventory";
import { scheduleExpiry } from "@/lib/expiry";
import { logEvent } from "@/lib/events";
import { getDb } from "@/lib/db";

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

    // Call the abstract repository instead of direct DB logic
    const created = inventoryRepo.atomicBulkReserve({ items, phone, holdMinutes });

    // Schedule expiry timers outside the transaction (non-blocking)
    for (const res of created) {
      scheduleExpiry(res.id, res.shopId, new Date(res.expiresAt));
      logEvent("RESERVE", { shopId: res.shopId, productKey: res.inventoryId });
    }

    const db = getDb();
    const richReservations = created.map((r) => {
      const inv = db.prepare(`SELECT name, price, imageEmoji FROM inventory WHERE id = ?`).get(r.inventoryId) as any;
      const shop = db.prepare(`SELECT name, address, phone FROM shops WHERE shopId = ?`).get(r.shopId) as any;
      return {
        reservationId: r.id,
        shopId: r.shopId,
        shopName: shop?.name || "Local Store",
        shopAddress: shop?.address || "",
        inventoryId: r.inventoryId,
        productName: inv?.name || "Product",
        productPrice: inv?.price || 0,
        imageEmoji: inv?.imageEmoji || "📦",
        qty: r.qty,
        pickupCode: r.pickupCode,
        expiresAt: r.expiresAt,
        status: r.status,
      };
    });

    return NextResponse.json({
      success: true,
      reservations: richReservations,
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
