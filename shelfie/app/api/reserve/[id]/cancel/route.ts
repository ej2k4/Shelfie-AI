// app/api/reserve/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cancelReservation } from "@/lib/inventory";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Auth: verify caller is the customer who owns this reservation
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const reservation = db.prepare(`SELECT shopId, customerPhone FROM reservations WHERE id = ?`).get(id) as any;
    if (!reservation) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // CUSTOMER: phone must match; SHOPKEEPER: must own the shop (no-show / expired case)
    if (session.role === "CUSTOMER" && session.userId !== reservation.customerPhone) {
      return NextResponse.json({ error: "Forbidden: Not your reservation" }, { status: 403 });
    }
    if (session.role === "SHOPKEEPER" && session.userId !== reservation.shopId) {
      return NextResponse.json({ error: "Forbidden: Not your shop" }, { status: 403 });
    }

    cancelReservation(id, reservation.shopId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const code = err.message === "NOT_FOUND" ? 404 : err.message === "NOT_CANCELLABLE" ? 409 : 500;
    return NextResponse.json({ error: err.message }, { status: code });
  }
}
