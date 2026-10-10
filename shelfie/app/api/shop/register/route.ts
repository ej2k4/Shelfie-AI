// app/api/shop/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

const AREA_COORDINATES: Record<string, { lat: number; lng: number; areaId: string }> = {
  Koramangala: { lat: 12.9352, lng: 77.6245, areaId: "area_koramangala" },
  Indiranagar: { lat: 12.9784, lng: 77.6408, areaId: "area_indiranagar" },
  "HSR Layout": { lat: 12.9116, lng: 77.6389, areaId: "area_hsr" },
  "JP Nagar": { lat: 12.9080, lng: 77.5855, areaId: "area_jpnagar" },
  Jayanagar: { lat: 12.9299, lng: 77.5830, areaId: "area_jayanagar" },
  Whitefield: { lat: 12.9698, lng: 77.7499, areaId: "area_whitefield" },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      category,
      area = "Koramangala",
      address,
      phone,
      whatsapp,
      items = [],
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Store name is required" }, { status: 400 });
    }

    const db = getDb();

    // Create a slugified unique shopId
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 15);
    const uniqueSuffix = Math.floor(100 + Math.random() * 900);
    const shopId = `shop_${baseSlug}_${uniqueSuffix}`;

    const coords = AREA_COORDINATES[area] || AREA_COORDINATES["Koramangala"];
    // Add tiny jitter to lat/lng so stores don't overlap exactly on map
    const jitterLat = (Math.random() - 0.5) * 0.005;
    const jitterLng = (Math.random() - 0.5) * 0.005;

    const defaultHours = JSON.stringify({
      open: "08:00",
      close: "22:00",
      days: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    });

    const defaultPlan = JSON.stringify({
      tier: "STARTER",
      maxOnlineItems: 50,
      feePercent: 0,
    });

    const defaultStats = JSON.stringify({
      fulfilledCount: 0,
      activeHoldsCount: 0,
      todayRevenue: 0,
    });

    // Execute atomic transaction to register shop and seed initial inventory
    const doRegister = db.transaction(() => {
      // 1. Insert Shop
      db.prepare(`
        INSERT INTO shops (
          id, shopId, name, address, area, lat, lng,
          phone, whatsapp, hours, reliability, defaultHoldMinutes,
          areaId, plan, stats
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `shop_uuid_${crypto.randomUUID()}`,
        shopId,
        name.trim(),
        address?.trim() || `${name}, ${area}, Bengaluru`,
        area,
        coords.lat + jitterLat,
        coords.lng + jitterLng,
        phone?.trim() || "+91 98450 12345",
        whatsapp?.trim() || phone?.trim() || "+91 98450 12345",
        defaultHours,
        0.98,
        45,
        coords.areaId,
        defaultPlan,
        defaultStats
      );

      // 2. Insert initial inventory items
      const insertInv = db.prepare(`
        INSERT INTO inventory (
          id, shopId, productId, name, category, price,
          onlineQty, offlineQty, lastUpdated, lastVerified,
          unmetRequests7d, imageEmoji
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      for (const item of items) {
        if (!item.name || !item.name.trim()) continue;
        const itemId = `inv_${crypto.randomUUID()}`;
        const prodId = `prod_${crypto.randomUUID().slice(0, 8)}`;
        insertInv.run(
          itemId,
          shopId,
          prodId,
          item.name.trim(),
          item.category || category || "grocery",
          Number(item.price) || 50,
          Number(item.onlineQty) || 5,
          Number(item.offlineQty) || 10,
          now,
          now,
          0,
          item.imageEmoji || item.emoji || "📦"
        );
      }

      // 3. Welcome notification
      db.prepare(`
        INSERT INTO notifications (
          id, shopId, type, title, body, read, channel, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `notif_${crypto.randomUUID()}`,
        shopId,
        "SYSTEM_WELCOME",
        "🎉 Welcome to Shelfie Merchant Network!",
        `Your store ${name} is live in ${area}. Shoppers can now view inventory and place counter holds.`,
        0,
        "IN_APP",
        now
      );
    });

    doRegister();

    return NextResponse.json({
      success: true,
      shopId,
      name,
      redirectUrl: `/shop/dashboard?s=${shopId}`,
    });
  } catch (err: any) {
    console.error("[shop/register] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to register shop" },
      { status: 500 }
    );
  }
}
