// app/api/reservations/route.ts
// GET all reservations for a customer phone number
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get("phone");
    if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

    const db = getDb();
    const reservations = db.prepare(`
      SELECT r.*, i.name as productName, i.price as productPrice,
             s.name as shopName, s.address as shopAddress, s.lat as shopLat, s.lng as shopLng
      FROM reservations r
      JOIN inventory i ON r.inventoryId = i.id
      JOIN shops s ON r.shopId = s.shopId
      WHERE r.customerPhone = ?
      ORDER BY r.createdAt DESC
      LIMIT 20
    `).all(phone);

    return NextResponse.json({ reservations });
  } catch (err) {
    console.error("[reservations]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
