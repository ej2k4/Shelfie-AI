// app/api/brand/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { z } from "zod";
import { randomUUID } from "crypto";

import { requireBrand } from "@/lib/auth";

const schema = z.object({
  brandId: z.string().min(1),
  productKeys: z.array(z.string()).min(1),
  areaIds: z.array(z.string()).min(1),
  costPerClickINR: z.number().min(1),
  budgetINR: z.number().min(100),
});

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get("brandId");
    if (!brandId) return NextResponse.json({ error: "brandId required" }, { status: 400 });

    await requireBrand(brandId);

    const db = getDb();
    const campaigns = db.prepare(`SELECT * FROM campaigns WHERE brandId = ? ORDER BY startAt DESC`).all(brandId);
    
    // Parse JSON fields
    const parsed = campaigns.map((c: any) => ({
      ...c,
      productKeys: JSON.parse(c.productKeys),
      areaIds: JSON.parse(c.areaIds),
    }));

    return NextResponse.json({ campaigns: parsed });
  } catch (err: any) {
    if (err.message?.startsWith("Unauthorized") || err.message?.startsWith("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: err.message.startsWith("Unauthorized") ? 401 : 403 });
    }
    console.error("[brand/campaigns/get]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const args = schema.parse(body);

    await requireBrand(args.brandId);

    const db = getDb();
    const id = `camp_${randomUUID()}`;
    const startAt = new Date().toISOString();
    const endAt = new Date(Date.now() + 30 * 86400000).toISOString();

    db.prepare(`
      INSERT INTO campaigns (id, brandId, productKeys, areaIds, costPerClickINR, budgetINR, remainingINR, status, startAt, endAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `).run(
      id, args.brandId, JSON.stringify(args.productKeys), JSON.stringify(args.areaIds),
      args.costPerClickINR, args.budgetINR, args.budgetINR, startAt, endAt
    );

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    if (err.message?.startsWith("Unauthorized") || err.message?.startsWith("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: err.message.startsWith("Unauthorized") ? 401 : 403 });
    }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

