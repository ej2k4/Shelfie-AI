// app/api/reserve/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cancelReservation } from "@/lib/inventory";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { shopId } = body;
    if (!shopId) return NextResponse.json({ error: "shopId required" }, { status: 400 });

    cancelReservation(id, shopId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const code = err.message === "NOT_FOUND" ? 404 : err.message === "NOT_CANCELLABLE" ? 409 : 500;
    return NextResponse.json({ error: err.message }, { status: code });
  }
}
