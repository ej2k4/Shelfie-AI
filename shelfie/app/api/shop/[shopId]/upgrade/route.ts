// app/api/shop/[shopId]/upgrade/route.ts
// Simulated upgrade for demo mode. In production, replace with Razorpay subscription creation.
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ shopId: string }> }) {
  try {
    const { shopId } = await params;

    // Only allow in demo mode
    const isDemoMode = process.env.DEMO_MODE === "true";

    const db = getDb();
    const shop = db.prepare(`SELECT plan FROM shops WHERE shopId = ?`).get(shopId) as any;
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const newPlan = {
      id: "PRO",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days
      razorpaySubscriptionId: isDemoMode ? "sub_SIMULATED_DEMO" : null,
    };

    db.prepare(`UPDATE shops SET plan = ? WHERE shopId = ?`).run(JSON.stringify(newPlan), shopId);

    return NextResponse.json({
      success: true,
      plan: newPlan,
      simulated: isDemoMode,
      message: isDemoMode
        ? "Simulated payment (demo mode) — PRO plan activated"
        : "Upgrade successful",
    });
  } catch (err) {
    console.error("[upgrade]", err);
    return NextResponse.json({ error: "Upgrade failed" }, { status: 500 });
  }
}
