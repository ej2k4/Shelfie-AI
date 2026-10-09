import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireShopOwner } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const shopId = (await params).shopId;
    await requireShopOwner(shopId);
    const db = getDb();
    
    const reservations = db.prepare(`
      SELECT r.*, i.name as productName, i.price as productPrice, i.imageEmoji
      FROM reservations r
      JOIN inventory i ON r.inventoryId = i.id
      WHERE r.shopId = ?
      ORDER BY r.createdAt DESC
      LIMIT 100
    `).all(shopId);

    // Group into active (HELD) and completed/expired
    const active = reservations.filter((r: any) => r.status === 'HELD');
    const history = reservations.filter((r: any) => r.status !== 'HELD');

    // Calculate revenue (COMPLETED reservations)
    const completed = history.filter((r: any) => r.status === 'COMPLETED');
    const totalRevenue = completed.reduce((sum: number, r: any) => sum + (r.productPrice * r.qty), 0);

    return NextResponse.json({ active, history, completedCount: completed.length, totalRevenue });
  } catch (err: any) {
    if (err.message?.startsWith("Unauthorized") || err.message?.startsWith("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: err.message.startsWith("Unauthorized") ? 401 : 403 });
    }
    console.error("[shop-reservations]", err);
    return NextResponse.json({ error: "Failed to load reservations" }, { status: 500 });
  }
}
