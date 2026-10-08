// app/api/request/[id]/route.ts
// GET a single request by ID (for customer polling)
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { ItemRequest } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const request = db.prepare(`SELECT * FROM requests WHERE id = ?`).get(id) as ItemRequest | undefined;
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // If accepted, look up the reservation created FOR THIS specific request
    let reservation = null;
    if (request.status === "ACCEPTED") {
      reservation = db.prepare(`
        SELECT r.*, i.name as productName, s.name as shopName, s.address as shopAddress
        FROM reservations r
        JOIN inventory i ON r.inventoryId = i.id
        JOIN shops s ON r.shopId = s.shopId
        WHERE r.requestId = ?
        LIMIT 1
      `).get(request.id);
    }

    const inv = db.prepare(`SELECT name, price FROM inventory WHERE id = ?`).get(request.inventoryId) as any;
    const shop = db.prepare(`SELECT name, address FROM shops WHERE shopId = ?`).get(request.shopId) as any;

    return NextResponse.json({
      ...request,
      productName: inv?.name,
      productPrice: inv?.price,
      shopName: shop?.name,
      shopAddress: shop?.address,
      reservation,
    });
  } catch (err) {
    console.error("[request/get]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
