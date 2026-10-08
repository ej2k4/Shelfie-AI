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

  // Load all shops and inventory, then filter in JS
  // (At Azure AI Search scale this query is done server-side with geo.distance filter)
  const shops = db.prepare(`SELECT * FROM shops`).all() as any[];
  const queryLower = q.toLowerCase().trim();

  const results: SearchOffer[] = [];

  for (const shop of shops) {
    const shopLat = shop.lat as number;
    const shopLng = shop.lng as number;
    const distM = haversineMetres(lat, lng, shopLat, shopLng);
    if (distM > radiusM) continue;

    const hours = JSON.parse(shop.hours);
    const { open: openNow, closesAt } = isOpenNow(hours);
    const plan = JSON.parse(shop.plan) as { id: string };

    // Query inventory for this shop
    let inventoryQuery = `SELECT * FROM inventory WHERE shopId = ?`;
    const params: any[] = [shop.shopId];

    if (category) {
      inventoryQuery += ` AND category = ?`;
      params.push(category);
    }

    const items = db.prepare(inventoryQuery).all(...params) as InventoryItem[];

    for (const item of items) {
      if (queryLower && !item.name.toLowerCase().includes(queryLower) && !item.category.toLowerCase().includes(queryLower)) {
        continue;
      }

      const inStock = item.onlineQty > 0;
      const requestable = !inStock && item.offlineQty > 0;

      if (!inStock && !requestable) continue;

      const freshnessMins = Math.floor(
        (Date.now() - new Date(item.lastUpdated).getTime()) / 60000
      );

      results.push({
        inventoryId: item.id,
        shopId: shop.shopId,
        shopName: shop.name,
        shopAddress: shop.address,
        productName: item.name,
        category: item.category,
        price: item.price,
        onlineQty: item.onlineQty,
        inStock,
        requestable,
        location: { lat: shopLat, lng: shopLng },
        distanceM: Math.round(distM),
        walkMinutes: walkMinutes(distM),
        openNow,
        closesAt,
        lastUpdated: item.lastUpdated,
        freshnessMins,
        reliability: shop.reliability,
        plan: plan.id as "FREE" | "PRO" | "ASSOCIATION",
      });
    }
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
    // Default: distance
    results.sort((a, b) => a.distanceM - b.distanceM);
  }

  return results.slice(0, 20);
}
