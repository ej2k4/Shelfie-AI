// app/api/shop/[shopId]/requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireShopOwner } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;
    await requireShopOwner(shopId);
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
  } catch (err: any) {
    if (err.message?.startsWith("Unauthorized") || err.message?.startsWith("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: err.message.startsWith("Unauthorized") ? 401 : 403 });
    }
    console.error("[shop/requests]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
