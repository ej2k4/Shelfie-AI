// app/api/reserve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reserveFromOnlinePool } from "@/lib/inventory";
import { logEvent } from "@/lib/events";

const schema = z.object({
  inventoryId: z.string().min(1),
  shopId: z.string().min(1),
  qty: z.number().int().min(1).max(5),
  phone: z.string().regex(/^\+\d{10,15}$/, "Phone must be in E.164 format, e.g. +919876543210"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const args = schema.parse(body);

    const { reservation } = reserveFromOnlinePool(args);

    logEvent("RESERVE", { shopId: args.shopId, productKey: args.inventoryId });

    return NextResponse.json({
      reservationId: reservation.id,
      pickupCode: reservation.pickupCode,
      expiresAt: reservation.expiresAt,
      status: reservation.status,
      source: reservation.source,
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    const code =
      err.message === "OUT_OF_STOCK" ? 409
      : err.message === "TOO_MANY_HOLDS" ? 429
      : err.message === "NOT_FOUND" ? 404
      : err.message === "INVALID_QTY" ? 400
      : 500;
    return NextResponse.json({ error: err.message }, { status: code });
  }
}
