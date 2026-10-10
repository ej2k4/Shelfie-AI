// app/api/reservations/route.ts
// GET all reservations for a customer phone number or specific IDs
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get("phone");
    const idsParam = req.nextUrl.searchParams.get("ids");

    if (!phone && !idsParam) {
      return NextResponse.json({ error: "phone or ids required" }, { status: 400 });
    }

    const db = getDb();
    let reservations: any[] = [];

    if (phone) {
      reservations = db.prepare(`
        SELECT r.*, i.name as productName, i.price as productPrice, i.imageEmoji,
               s.name as shopName, s.address as shopAddress, s.lat as shopLat, s.lng as shopLng, s.phone as shopPhone
        FROM reservations r
        JOIN inventory i ON r.inventoryId = i.id
        JOIN shops s ON r.shopId = s.shopId
        WHERE r.customerPhone = ?
        ORDER BY r.createdAt DESC
        LIMIT 30
      `).all(phone);
    } else if (idsParam) {
      const ids = idsParam.split(",").map(id => id.trim()).filter(Boolean);
      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");
        reservations = db.prepare(`
          SELECT r.*, i.name as productName, i.price as productPrice, i.imageEmoji,
                 s.name as shopName, s.address as shopAddress, s.lat as shopLat, s.lng as shopLng, s.phone as shopPhone
          FROM reservations r
          JOIN inventory i ON r.inventoryId = i.id
          JOIN shops s ON r.shopId = s.shopId
          WHERE r.id IN (${placeholders})
          ORDER BY r.createdAt DESC
          LIMIT 30
        `).all(...ids);
      }
    }

    return NextResponse.json({ reservations });
  } catch (err) {
    console.error("[reservations]", err);
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
  }
}
