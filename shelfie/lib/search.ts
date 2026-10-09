// lib/search.ts
// Search abstraction layer.
// Currently: keyword match + geo-distance filter over SQLite.
// When Azure AI Search credentials are available, replace the searchOffers()
// implementation only — the SearchOffer type and caller code need no changes.

import { getDb } from "./db";
import type { SearchOffer, Shop, InventoryItem } from "./types";

// Haversine distance in metres between two lat/lng points
export function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Walk time estimate: 80 m/min average walking speed
export function walkMinutes(distanceM: number): number {
  return Math.round(distanceM / 80);
}

// Determine if shop is open right now
export function isOpenNow(hours: Record<string, [string, string]>): {
  open: boolean;
  closesAt: string | null;
} {
  const now = new Date();
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayKey = days[now.getDay()];
  const todayHours = hours[dayKey];
  if (!todayHours) return { open: false, closesAt: null };

  const [openStr, closeStr] = todayHours;
  const [oh, om] = openStr.split(":").map(Number);
  const [ch, cm] = closeStr.split(":").map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;

  const open = nowMins >= openMins && nowMins < closeMins;
  const closesAt = open
    ? `${closeStr}`
    : null;
  return { open, closesAt };
}

export interface SearchArgs {
  q: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  sort?: "distance" | "price" | "open";
  category?: string;
}

export function searchOffers(args: SearchArgs): SearchOffer[] {
  const { q, lat, lng, radiusKm = 3, sort = "distance", category } = args;
  const db = getDb();
  const radiusM = radiusKm * 1000;
  const queryLower = q.toLowerCase().trim();

  // Single JOIN query — eliminates N+1 per-shop inventory queries
  let sql = `
    SELECT
      i.id        AS inventoryId,
      i.name      AS productName,
      i.category,
      i.price,
      i.onlineQty,
      i.offlineQty,
      i.lastUpdated,
      i.imageEmoji,
      s.shopId,
      s.name      AS shopName,
      s.address   AS shopAddress,
      s.lat,
      s.lng,
      s.hours,
      s.plan,
      s.reliability
    FROM inventory i
    JOIN shops s ON i.shopId = s.shopId
    WHERE 1=1
  `;
  const params: any[] = [];

  if (category) {
    sql += ` AND i.category = ?`;
    params.push(category);
  }

  if (queryLower) {
    sql += ` AND (LOWER(i.name) LIKE ? OR LOWER(i.category) LIKE ?)`;
    params.push(`%${queryLower}%`, `%${queryLower}%`);
  }

  const rows = db.prepare(sql).all(...params) as any[];

  const results: SearchOffer[] = [];

  for (const row of rows) {
    const distM = haversineMetres(lat, lng, row.lat, row.lng);
    if (distM > radiusM) continue;

    const inStock = row.onlineQty > 0;
    const requestable = !inStock && row.offlineQty > 0;
    if (!inStock && !requestable) continue;

    const hours = JSON.parse(row.hours);
    const { open: openNow, closesAt } = isOpenNow(hours);
    const plan = JSON.parse(row.plan) as { id: string };

    const freshnessMins = Math.floor(
      (Date.now() - new Date(row.lastUpdated).getTime()) / 60000
    );

    results.push({
      inventoryId: row.inventoryId,
      shopId: row.shopId,
      shopName: row.shopName,
      shopAddress: row.shopAddress,
      productName: row.productName,
      category: row.category,
      price: row.price,
      onlineQty: row.onlineQty,
      inStock,
      requestable,
      location: { lat: row.lat, lng: row.lng },
      distanceM: Math.round(distM),
      walkMinutes: walkMinutes(distM),
      openNow,
      closesAt,
      lastUpdated: row.lastUpdated,
      freshnessMins,
      reliability: row.reliability,
      plan: plan.id as "FREE" | "PRO" | "ASSOCIATION",
      imageEmoji: row.imageEmoji || "📦",
    });
  }

  // Sort results
  if (sort === "price") {
    results.sort((a, b) => a.price - b.price);
  } else if (sort === "open") {
    results.sort((a, b) => {
      if (a.openNow === b.openNow) return a.distanceM - b.distanceM;
      return a.openNow ? -1 : 1;
    });
  } else {
    results.sort((a, b) => a.distanceM - b.distanceM);
  }

  return results.slice(0, 20);
}

// ─── CPC Campaign Click Deduction ─────────────────────────────────────────────
// Call this when a sponsored item is clicked/reserved.
// Atomic: decrements remainingINR and pauses campaign if budget is exhausted.
export function deductCampaignClick(campaignId: string): void {
  const db = getDb();
  db.transaction(() => {
    const campaign = db.prepare(
      `SELECT costPerClickINR, remainingINR FROM campaigns WHERE id = ? AND status = 'ACTIVE'`
    ).get(campaignId) as { costPerClickINR: number; remainingINR: number } | undefined;

    if (!campaign) return; // campaign gone or paused — no-op

    const newRemaining = Math.max(0, campaign.remainingINR - campaign.costPerClickINR);
    const newStatus = newRemaining <= 0 ? "PAUSED" : "ACTIVE";

    db.prepare(
      `UPDATE campaigns SET remainingINR = ?, status = ? WHERE id = ?`
    ).run(newRemaining, newStatus, campaignId);
  })();
}

