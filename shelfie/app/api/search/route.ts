// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchOffers, deductCampaignClick } from "@/lib/search";
import { applySponsoredSlot } from "@/lib/ranking";
import { logEvent } from "@/lib/events";
import { getDb } from "@/lib/db";

const schema = z.object({
  q: z.string().min(0).max(100),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.5).max(10).optional().default(3),
  sort: z.enum(["distance", "price", "open"]).optional().default("distance"),
  category: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const args = schema.parse(params);
    const offers = searchOffers({
      q: args.q,
      lat: args.lat,
      lng: args.lng,
      radiusKm: args.radius,
      sort: args.sort,
      category: args.category,
    });

    const db = getDb();
    const rawCampaigns = db.prepare(`SELECT * FROM campaigns WHERE status = 'ACTIVE' AND endAt > datetime('now')`).all() as any[];
    const campaigns = rawCampaigns.map(c => ({ 
      ...c, 
      productKeys: JSON.parse(c.productKeys), 
      areaIds: JSON.parse(c.areaIds) 
    }));
    
    const result = applySponsoredSlot(offers, campaigns) || { offers, sponsoredCampaignId: null }; const rankedOffers = result.offers; const sponsoredCampaignId = result.sponsoredCampaignId;

    // Deduct CPC for sponsored impression (fire-and-forget)
    if (sponsoredCampaignId) {
      try { deductCampaignClick(sponsoredCampaignId); } catch { /* non-critical */ }
    }

    // Log the search event
    logEvent("SEARCH", { productKey: args.q });

    return NextResponse.json({ offers: rankedOffers, total: rankedOffers.length });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Invalid parameters", details: err.errors }, { status: 400 });
    }
    console.error("[search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

