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
    const reservationsMap = new Map<string, any>();

    if (phone) {
      const cleanDigits = phone.replace(/\D/g, "");
      const last10 = cleanDigits.slice(-10);
      const phonePattern = last10.length >= 7 ? `%${last10}` : phone;

      const phoneResults = db.prepare(`
        SELECT r.*, i.name as productName, i.price as productPrice, i.imageEmoji,
               s.name as shopName, s.address as shopAddress, s.lat as shopLat, s.lng as shopLng, s.phone as shopPhone
        FROM reservations r
        JOIN inventory i ON r.inventoryId = i.id
        JOIN shops s ON r.shopId = s.shopId
        WHERE r.customerPhone = ? OR r.customerPhone LIKE ?
        ORDER BY r.createdAt DESC
        LIMIT 30
      `).all(phone, phonePattern);

      for (const item of phoneResults) {
        reservationsMap.set((item as any).id, item);
      }
    }

    if (idsParam) {
      const ids = idsParam.split(",").map(id => id.trim()).filter(Boolean);
      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");
        const idsResults = db.prepare(`
          SELECT r.*, i.name as productName, i.price as productPrice, i.imageEmoji,
                 s.name as shopName, s.address as shopAddress, s.lat as shopLat, s.lng as shopLng, s.phone as shopPhone
          FROM reservations r
          JOIN inventory i ON r.inventoryId = i.id
          JOIN shops s ON r.shopId = s.shopId
          WHERE r.id IN (${placeholders})
          ORDER BY r.createdAt DESC
          LIMIT 30
        `).all(...ids);

        for (const item of idsResults) {
          reservationsMap.set((item as any).id, item);
        }
      }
    }

    const reservations = Array.from(reservationsMap.values()).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ reservations });
  } catch (err) {
    console.error("[reservations]", err);
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
  }
}
