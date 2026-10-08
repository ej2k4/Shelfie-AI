// app/api/shop/[shopId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;
    const db = getDb();
    const shop = db.prepare(`SELECT * FROM shops WHERE shopId = ?`).get(shopId) as any;
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const productCount = (db.prepare(`SELECT COUNT(*) as c FROM inventory WHERE shopId = ?`).get(shopId) as any).c;

    return NextResponse.json({
      ...shop,
      hours: JSON.parse(shop.hours),
      plan: JSON.parse(shop.plan),
      stats: JSON.parse(shop.stats),
      productCount,
    });
  } catch (err) {
    console.error("[shop/get]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
