// app/api/shop/[shopId]/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;
    const db = getDb();

    const notifications = db.prepare(`
      SELECT * FROM notifications WHERE shopId = ? ORDER BY createdAt DESC LIMIT 30
    `).all(shopId);

    const unreadCount = (db.prepare(`
      SELECT COUNT(*) as c FROM notifications WHERE shopId = ? AND read = 0
    `).get(shopId) as any).c;

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;
    const db = getDb();
    db.prepare(`UPDATE notifications SET read = 1 WHERE shopId = ?`).run(shopId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
