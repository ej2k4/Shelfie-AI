// lib/types.ts
// Shared TypeScript types — mirrors the Cosmos DB data model exactly
// so swapping SQLite → Cosmos DB later requires no type changes.

export interface Shop {
  id: string;
  shopId: string;
  name: string;
  address: string;
  area: string; // e.g. "Koramangala"
  location: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
  phone: string;
  whatsapp: string;
  hours: Record<string, [string, string]>; // { mon: ["09:00","21:30"], ... }
  reliability: number; // 0–1
  defaultHoldMinutes: number;
  areaId: string; // geohash precision-6
  plan: ShopPlan;
  stats: ShopStats;
}

export interface ShopPlan {
  id: "FREE" | "PRO" | "ASSOCIATION";
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED";
  currentPeriodEnd: string | null;
  razorpaySubscriptionId: string | null;
}

export interface ShopStats {
  requestsReceived: number;
  requestsAccepted: number;
  avgResponseSec: number;
  pickupsConfirmed: number;
  pickupsFulfilled: number;
}

export interface InventoryItem {
  id: string;
  shopId: string;
  productId: string;
  name: string;
  category: string;
  price: number;
  onlineQty: number;
  offlineQty: number;
  lastUpdated: string;
  lastVerified: string;
  unmetRequests7d: number;
  imageEmoji?: string; // for demo display
}

export interface Reservation {
  id: string;
  shopId: string;
  inventoryId: string;
  customerPhone: string;
  qty: number;
  status: "HELD" | "COLLECTED" | "EXPIRED" | "CANCELLED" | "SHOP_UNABLE";
  source: "ONLINE_POOL" | "OFFLINE_CONVERTED";
  pickupCode: string;
  createdAt: string;
  expiresAt: string;
  ttl: number;
}

export interface ItemRequest {
  id: string;
  shopId: string;
  inventoryId: string;
  customerPhone: string;
  qty: number;
  etaMinutes: number;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  expiresAt: string;
  ttl: number;
  createdAt: string;
  // Denormalized for dashboard display
  productName?: string;
  shopName?: string;
}

export interface Notification {
  id: string;
  shopId: string;
  type: "NEW_REQUEST" | "REQUEST_EXPIRED" | "PICKUP_READY" | "INFO";
  title: string;
  body: string;
  requestId?: string;
  reservationId?: string;
  read: boolean;
  createdAt: string;
  channel: "IN_APP" | "WHATSAPP_SIMULATED" | "WHATSAPP";
}

// Search result — enriched offer returned by /api/search
export interface SearchOffer {
  inventoryId: string;
  shopId: string;
  shopName: string;
  shopAddress: string;
  productName: string;
  category: string;
  price: number;
  onlineQty: number;
  inStock: boolean;        // onlineQty > 0
  requestable: boolean;   // onlineQty == 0 && offlineQty > 0
  location: { lat: number; lng: number };
  distanceM: number;
  walkMinutes: number;
  openNow: boolean;
  closesAt: string | null;
  lastUpdated: string;
  freshnessMins: number;   // minutes since lastUpdated
  reliability: number;
  plan: "FREE" | "PRO" | "ASSOCIATION";
  sponsored?: boolean;
}

export interface ImpactStats {
  tripsSaved: number;
  pickupsConfirmed: number;
  shopsActive: number;
  requestsAccepted: number;
  totalSearches: number;
}

export interface Campaign {
  id: string;
  brandId: string;
  productKeys: string[] | string;
  areaIds: string[] | string;
  costPerClickINR: number;
  budgetINR: number;
  remainingINR: number;
  status: "ACTIVE" | "PAUSED" | "EXHAUSTED";
  startAt: string;
  endAt: string;
}
