// app/api/shop/[shopId]/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireShopOwner } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;
    await requireShopOwner(shopId);
    const db = getDb();

    const notifications = db.prepare(`
      SELECT * FROM notifications WHERE shopId = ? ORDER BY createdAt DESC LIMIT 30
    `).all(shopId);

    const unreadCount = (db.prepare(`
      SELECT COUNT(*) as c FROM notifications WHERE shopId = ? AND read = 0
    `).get(shopId) as any).c;

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: any) {
    if (err.message?.startsWith("Unauthorized") || err.message?.startsWith("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: err.message.startsWith("Unauthorized") ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;
    await requireShopOwner(shopId);
    const db = getDb();
    db.prepare(`UPDATE notifications SET read = 1 WHERE shopId = ?`).run(shopId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message?.startsWith("Unauthorized") || err.message?.startsWith("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: err.message.startsWith("Unauthorized") ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
