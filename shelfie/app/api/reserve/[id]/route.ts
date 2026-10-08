// app/api/reserve/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Reservation } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const res = db.prepare(`SELECT * FROM reservations WHERE id = ?`).get(id) as Reservation | undefined;
    if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get product and shop name
    const inv = db.prepare(`SELECT name, price FROM inventory WHERE id = ?`).get(res.inventoryId) as any;
    const shop = db.prepare(`SELECT name, address, lat, lng, phone FROM shops WHERE shopId = ?`).get(res.shopId) as any;

    return NextResponse.json({
      ...res,
      productName: inv?.name,
      productPrice: inv?.price,
      shopName: shop?.name,
      shopAddress: shop?.address,
      shopLat: shop?.lat,
      shopLng: shop?.lng,
      shopPhone: shop?.phone,
    });
  } catch (err) {
    console.error("[reserve/get]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
