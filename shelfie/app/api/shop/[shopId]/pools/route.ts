// app/api/shop/[shopId]/pools/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rebalancePools } from "@/lib/inventory";

const schema = z.object({
  inventoryId: z.string().min(1),
  onlineQty: z.number().int().min(0),
  offlineQty: z.number().int().min(0),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;
    const body = await req.json();
    const { inventoryId, onlineQty, offlineQty } = schema.parse(body);
    const { getDb } = require("@/lib/db");
    const db = getDb();
    const current = db.prepare(`SELECT onlineQty, offlineQty FROM inventory WHERE id = ? AND shopId = ?`)
      .get(inventoryId, shopId) as any;
    
    if (!current) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    
    const totalPhysical = current.onlineQty + current.offlineQty;
    // We allow them to add stock here up to a certain point (since there's no separate receive-stock flow in the prototype),
    // but we block massive inflation mistakes (e.g. 100 instead of 10)
    if (onlineQty + offlineQty > totalPhysical + 20) {
      return NextResponse.json({ error: `Pool totals exceed physical stock limit` }, { status: 400 });
    }

    rebalancePools(inventoryId, shopId, onlineQty, offlineQty);
    return NextResponse.json({ success: true, onlineQty, offlineQty });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
