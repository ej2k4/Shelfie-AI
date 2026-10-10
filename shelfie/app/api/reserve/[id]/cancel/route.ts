// app/api/reserve/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cancelReservation } from "@/lib/inventory";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const phone = body?.phone;

    const db = getDb();
    const reservation = db.prepare(`SELECT shopId, customerPhone FROM reservations WHERE id = ?`).get(id) as any;
    if (!reservation) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const session = await getSession();
    
    // Allow cancellation if:
    // 1. Session is CUSTOMER and phone matches reservation.customerPhone
    // 2. Session is SHOPKEEPER and shopId matches reservation.shopId
    // 3. Or if phone passed in body matches reservation.customerPhone
    const isAuthorizedCustomer = 
      (session?.role === "CUSTOMER" && session.userId === reservation.customerPhone) ||
      (phone && phone === reservation.customerPhone);
    const isAuthorizedShopkeeper = 
      session?.role === "SHOPKEEPER" && session.userId === reservation.shopId;

    if (!isAuthorizedCustomer && !isAuthorizedShopkeeper) {
      return NextResponse.json({ error: "Forbidden: Not your reservation" }, { status: 403 });
    }

    cancelReservation(id, reservation.shopId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const code = err.message === "NOT_FOUND" ? 404 : err.message === "NOT_CANCELLABLE" ? 409 : 500;
    return NextResponse.json({ error: err.message }, { status: code });
  }
}
