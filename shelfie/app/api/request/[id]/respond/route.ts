// app/api/request/[id]/respond/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { acceptRequest, declineRequest } from "@/lib/inventory";
import { notifyCustomerOfAccept } from "@/lib/notify";
import { getDb } from "@/lib/db";

import { requireShopOwner } from "@/lib/auth";

const schema = z.object({
  decision: z.enum(["ACCEPT", "DECLINE"]),
  shopId: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: requestId } = await params;
    const body = await req.json();
    const { decision, shopId } = schema.parse(body);

    await requireShopOwner(shopId);

    const db = getDb();

    if (decision === "ACCEPT") {
      const reservation = acceptRequest(requestId, shopId);

      // Enrich for notification
      const inv = db.prepare(`SELECT name FROM inventory WHERE id = ?`).get(reservation.inventoryId) as any;
      const shop = db.prepare(`SELECT name, address FROM shops WHERE shopId = ?`).get(shopId) as any;

      // Notify customer (fire-and-forget)
      void notifyCustomerOfAccept({
        customerPhone: reservation.customerPhone,
        shopName: shop?.name ?? "The shop",
        productName: inv?.name ?? "Your item",
        pickupCode: reservation.pickupCode,
        expiresAt: reservation.expiresAt,
        shopAddress: shop?.address ?? "",
      }).catch(console.error);

      // Mark notification as read in dashboard
      db.prepare(`
        UPDATE notifications SET read = 1 WHERE requestId = ? AND shopId = ?
      `).run(requestId, shopId);

      // Add customer notification about pickup code
      const { randomUUID } = await import("crypto");
      db.prepare(`
        INSERT INTO notifications (id, shopId, type, title, body, reservationId, read, createdAt, channel)
        VALUES (?, ?, 'PICKUP_READY', 'Your item is ready!', ?, ?, 0, ?, 'IN_APP')
      `).run(
        `notif_${randomUUID()}`,
        shopId,
        `Pickup Code: ${reservation.pickupCode}. Valid until ${new Date(reservation.expiresAt).toLocaleTimeString()}`,
        reservation.id,
        new Date().toISOString()
      );

      return NextResponse.json({
        success: true,
        decision: "ACCEPT",
        reservationId: reservation.id,
        pickupCode: reservation.pickupCode,
        expiresAt: reservation.expiresAt,
        customerPhone: reservation.customerPhone,
      });
    } else {
      declineRequest(requestId, shopId);
      db.prepare(`UPDATE notifications SET read = 1 WHERE requestId = ? AND shopId = ?`).run(requestId, shopId);
      return NextResponse.json({ success: true, decision: "DECLINE" });
    }
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    if (err.message?.startsWith("Unauthorized") || err.message?.startsWith("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: err.message.startsWith("Unauthorized") ? 401 : 403 });
    }
    const code =
      err.message === "REQUEST_NOT_FOUND" ? 404
      : err.message === "REQUEST_EXPIRED" ? 410
      : err.message === "OUT_OF_STOCK" ? 409
      : 500;
    return NextResponse.json({ error: err.message }, { status: code });
  }
}

