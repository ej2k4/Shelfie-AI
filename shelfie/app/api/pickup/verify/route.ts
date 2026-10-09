// app/api/pickup/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPickupCode } from "@/lib/inventory";
import { logEvent } from "@/lib/events";

import { requireShopOwner } from "@/lib/auth";

const schema = z.object({
  shopId: z.string().min(1),
  code: z.string().length(6),
});

const rateLimit = new Map<string, { attempts: number; windowStart: number }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopId, code } = schema.parse(body);

    // Enforce Authorization
    await requireShopOwner(shopId);

    // Enforce Rate Limiting (5 failures / 10 minutes)
    const now = Date.now();
    const limit = rateLimit.get(shopId) || { attempts: 0, windowStart: now };
    
    if (now - limit.windowStart > 10 * 60 * 1000) {
      limit.attempts = 0;
      limit.windowStart = now;
    }
    
    if (limit.attempts >= 5) {
      return NextResponse.json({ error: "Too many failed attempts. Locked for 10 minutes." }, { status: 429 });
    }

    try {
      const reservation = verifyPickupCode(shopId, code) as any;
      
      // Success: Reset rate limit
      rateLimit.delete(shopId);

      logEvent("PICKUP", { shopId, productKey: reservation.inventoryId });

      return NextResponse.json({
        success: true,
        reservationId: reservation.id,
        code,
        customerPhone: reservation.customerPhone,
        productName: reservation.productName,
        price: reservation.productPrice,
        qty: reservation.qty,
        total: (reservation.productPrice || 0) * (reservation.qty || 1),
        source: reservation.source,
      });
    } catch (err: any) {
      if (err.message === "INVALID_CODE") {
        limit.attempts += 1;
        rateLimit.set(shopId, limit);
      }
      throw err;
    }
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    if (err.message?.startsWith("Unauthorized") || err.message?.startsWith("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: err.message.startsWith("Unauthorized") ? 401 : 403 });
    }
    const code = err.message === "INVALID_CODE" ? 404 : err.message === "CODE_EXPIRED" ? 410 : 500;
    return NextResponse.json({ error: err.message }, { status: code });
  }
}

