// lib/repositories/inventory.ts
import { getDb } from "@/lib/db";
import { randomInt, randomUUID } from "crypto";

export interface ReservationItem {
  id: string;
  shopId: string;
  inventoryId: string;
  customerPhone: string;
  qty: number;
  status: string;
  source: string;
  pickupCode: string;
  createdAt: string;
  expiresAt: string;
  ttl: number;
}

export interface BulkReserveRequest {
  phone: string;
  holdMinutes: number;
  items: Array<{
    shopId: string;
    inventoryId: string;
    qty: number;
  }>;
}

/**
 * Interface representing the database operations for Inventory and Reservations.
 * This decouples the business logic from SQLite so we can swap to Postgres/Cosmos later.
 */
export interface IInventoryRepository {
  /**
   * Performs an atomic bulk reservation. All items must succeed or all fail.
   * Throws "OUT_OF_STOCK" or "TOO_MANY_HOLDS" on business logic failure.
   */
  atomicBulkReserve(req: BulkReserveRequest): ReservationItem[];
}

/**
 * SQLite Implementation of the Inventory Repository.
 */
export class SQLiteInventoryRepository implements IInventoryRepository {
  atomicBulkReserve(req: BulkReserveRequest): ReservationItem[] {
    const db = getDb();

    // Check active holds for this phone (max 2 per customer, across all items)
    const activeHolds = db
      .prepare(`SELECT COUNT(*) as cnt FROM reservations WHERE customerPhone = ? AND status = 'HELD'`)
      .get(req.phone) as { cnt: number };
      
    if (activeHolds.cnt + req.items.length > 5) {
      throw new Error("TOO_MANY_HOLDS");
    }

    const now = Date.now();
    const reservations: ReservationItem[] = [];

    // Single atomic transaction — all succeed or all roll back
    const doBulkReserve = db.transaction(() => {
      for (const item of req.items) {
        const inv = db
          .prepare(`SELECT onlineQty FROM inventory WHERE id = ? AND shopId = ?`)
          .get(item.inventoryId, item.shopId) as { onlineQty: number } | undefined;

        if (!inv) throw Object.assign(new Error("NOT_FOUND"), { inventoryId: item.inventoryId });
        if (inv.onlineQty < item.qty) throw Object.assign(new Error("OUT_OF_STOCK"), { inventoryId: item.inventoryId });

        db.prepare(
          `UPDATE inventory SET onlineQty = onlineQty - ?, lastUpdated = ? WHERE id = ? AND shopId = ?`
        ).run(item.qty, new Date(now).toISOString(), item.inventoryId, item.shopId);

        const res: ReservationItem = {
          id: `res_${randomUUID()}`,
          shopId: item.shopId,
          inventoryId: item.inventoryId,
          customerPhone: req.phone,
          qty: item.qty,
          status: "HELD",
          source: "ONLINE_POOL",
          pickupCode: String(randomInt(100000, 999999)),
          createdAt: new Date(now).toISOString(),
          expiresAt: new Date(now + req.holdMinutes * 60_000).toISOString(),
          ttl: 7 * 24 * 3600,
        };

        db.prepare(`
          INSERT INTO reservations (id, shopId, inventoryId, customerPhone, qty, status, source, pickupCode, createdAt, expiresAt, ttl)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          res.id, res.shopId, res.inventoryId, res.customerPhone,
          res.qty, res.status, res.source, res.pickupCode,
          res.createdAt, res.expiresAt, res.ttl
        );

        reservations.push(res);
      }
      return reservations;
    });

    return doBulkReserve() as ReservationItem[];
  }
}

// Export a singleton instance for the app to use
export const inventoryRepo = new SQLiteInventoryRepository();
