// lib/events.ts
// Event logging for the prototype (SQLite backed)
// In production, this would write to Azure Event Hubs or directly to Cosmos DB for the Insights Aggregator.

import { getDb } from "./db";
import { randomUUID } from "crypto";

export interface EventData {
  productKey?: string;
  shopId?: string;
  areaId?: string;
}

export function logEvent(type: "SEARCH" | "IMPRESSION" | "CLICK" | "RESERVE" | "REQUEST" | "PICKUP", data: EventData) {
  // Fire and forget
  void Promise.resolve().then(() => {
    try {
      const db = getDb();
      db.prepare(`
        INSERT OR IGNORE INTO events (id, type, productKey, shopId, areaId, ts)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(
        randomUUID(),
        type,
        data.productKey ?? null,
        data.shopId ?? null,
        data.areaId ?? null
      );
    } catch (err) {
      console.error("[events] Failed to log event:", err);
    }
  });
}
