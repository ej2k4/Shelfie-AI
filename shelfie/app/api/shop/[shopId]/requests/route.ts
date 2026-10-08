// app/api/shop/[shopId]/requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;
    const db = getDb();

    const requests = db.prepare(`
      SELECT req.*, inv.name as productName, inv.price as productPrice, inv.imageEmoji
      FROM requests req
      JOIN inventory inv ON req.inventoryId = inv.id
      WHERE req.shopId = ?
      ORDER BY req.createdAt DESC
      LIMIT 50
    `).all(shopId);

    return NextResponse.json({ requests });
  } catch (err) {
    console.error("[shop/requests]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
