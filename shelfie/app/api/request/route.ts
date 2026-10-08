// app/api/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRequest } from "@/lib/inventory";
import { notifyShopOfRequest } from "@/lib/notify";
import { getDb } from "@/lib/db";
import { logEvent } from "@/lib/events";

const schema = z.object({
  inventoryId: z.string().min(1),
  shopId: z.string().min(1),
  qty: z.number().int().min(1).max(5),
  phone: z.string().regex(/^\+\d{10,15}$/),
  etaMinutes: z.number().int().min(2).max(60),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const args = schema.parse(body);

    const request = createRequest(args);

    // Enrich with product and shop info for notification
    const db = getDb();
    const inv = db.prepare(`SELECT name FROM inventory WHERE id = ?`).get(args.inventoryId) as any;
    const shop = db.prepare(`SELECT name, whatsapp FROM shops WHERE shopId = ?`).get(args.shopId) as any;

    // Fire-and-forget notification (never blocks the response)
    void notifyShopOfRequest({
      shopId: args.shopId,
      shopWhatsapp: shop?.whatsapp ?? "",
      requestId: request.id,
      productName: inv?.name ?? "Unknown product",
      customerPhone: args.phone,
      qty: args.qty,
      etaMinutes: args.etaMinutes,
    }).catch(console.error);

    // Update shop stats
    db.prepare(`
      UPDATE shops SET
        stats = json_set(stats, '$.requestsReceived', json_extract(stats, '$.requestsReceived') + 1)
      WHERE shopId = ?
    `).run(args.shopId);

    logEvent("REQUEST", { shopId: args.shopId, productKey: args.inventoryId });

    return NextResponse.json({
      requestId: request.id,
      status: request.status,
      expiresAt: request.expiresAt,
      shopName: shop?.name,
      productName: inv?.name,
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    const code =
      err.message === "NOT_FOUND" ? 404
      : err.message === "NOT_REQUESTABLE" ? 409
      : 500;
    return NextResponse.json({ error: err.message }, { status: code });
  }
}
