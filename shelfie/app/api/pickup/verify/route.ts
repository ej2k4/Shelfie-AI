// app/api/pickup/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPickupCode } from "@/lib/inventory";
import { logEvent } from "@/lib/events";

const schema = z.object({
  shopId: z.string().min(1),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopId, code } = schema.parse(body);

    const reservation = verifyPickupCode(shopId, code) as any;

    logEvent("PICKUP", { shopId, productKey: reservation.inventoryId });

    return NextResponse.json({
      success: true,
      reservationId: reservation.id,
      customerPhone: reservation.customerPhone,
      qty: reservation.qty,
      source: reservation.source,
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    const code = err.message === "INVALID_CODE" ? 404 : err.message === "CODE_EXPIRED" ? 410 : 500;
    return NextResponse.json({ error: err.message }, { status: code });
  }
}
