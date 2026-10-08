// app/api/shop/[shopId]/inventory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { assertCanAddProducts, effectivePlan, PlanLimitError } from "@/lib/entitlements";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;
    const db = getDb();
    const items = db.prepare(`SELECT * FROM inventory WHERE shopId = ? ORDER BY category, name`).all(shopId);
    return NextResponse.json({ inventory: items });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const addSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  price: z.number().min(0),
  onlineQty: z.number().int().min(0),
  offlineQty: z.number().int().min(0),
  imageEmoji: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;
    const body = await req.json();
    const data = addSchema.parse(body);

    const db = getDb();
    const shop = db.prepare(`SELECT plan FROM shops WHERE shopId = ?`).get(shopId) as any;
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const currentCount = (db.prepare(`SELECT COUNT(*) as c FROM inventory WHERE shopId = ?`).get(shopId) as any).c;
    const plan = JSON.parse(shop.plan);

    assertCanAddProducts(plan, currentCount, 1);

    const productId = `prod_${randomUUID().slice(0, 8)}`;
    const id = `inv_${shopId}_${productId}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO inventory (id, shopId, productId, name, category, price, onlineQty, offlineQty, lastUpdated, lastVerified, unmetRequests7d, imageEmoji)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, shopId, productId, data.name, data.category, data.price, data.onlineQty, data.offlineQty, now, now, data.imageEmoji ?? "📦");

    return NextResponse.json({ id, productId, ...data });
  } catch (err: any) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json({
        error: "PLAN_LIMIT",
        limit: err.limit,
        planId: err.planId,
        message: `You've reached the ${err.planId} plan limit. Upgrade to PRO to add more products.`,
      }, { status: 402 });
    }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;
    const inventoryId = req.nextUrl.searchParams.get("id");
    if (!inventoryId) return NextResponse.json({ error: "id required" }, { status: 400 });
    const db = getDb();
    db.prepare("DELETE FROM inventory WHERE id = ? AND shopId = ?").run(inventoryId, shopId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
