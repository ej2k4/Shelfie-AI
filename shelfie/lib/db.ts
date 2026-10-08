// lib/db.ts
// SQLite database singleton.
// When Azure Cosmos DB credentials are available, this module can be replaced
// with a Cosmos client and the rest of the app needs no changes (same API).

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "shelfie.db");

let _db: Database.Database | null = null;
let _sweeperStarted = false;

export function getDb(): Database.Database {
  if (_db) return _db;

  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  initSchema(_db);

  // B-04 fix: start expiry sweeper once per process to recover missed timeouts
  if (!_sweeperStarted) {
    _sweeperStarted = true;
    // Lazy import to break circular deps
    const { startExpirySweeper } = require("./expiry");
    startExpirySweeper();
  }

  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      shopId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      area TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      phone TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      hours TEXT NOT NULL,       -- JSON
      reliability REAL DEFAULT 0.9,
      defaultHoldMinutes INTEGER DEFAULT 45,
      areaId TEXT NOT NULL,
      plan TEXT NOT NULL,        -- JSON: ShopPlan
      stats TEXT NOT NULL        -- JSON: ShopStats
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      shopId TEXT NOT NULL,
      productId TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      onlineQty INTEGER NOT NULL DEFAULT 0,
      offlineQty INTEGER NOT NULL DEFAULT 0,
      lastUpdated TEXT NOT NULL,
      lastVerified TEXT NOT NULL,
      unmetRequests7d INTEGER DEFAULT 0,
      imageEmoji TEXT,
      FOREIGN KEY (shopId) REFERENCES shops(shopId)
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_shop ON inventory(shopId);
    CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      requestId TEXT,             -- links back to originating request (B-02 fix)
      shopId TEXT NOT NULL,
      inventoryId TEXT NOT NULL,
      customerPhone TEXT NOT NULL,
      qty INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'HELD',
      source TEXT NOT NULL,
      pickupCode TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      ttl INTEGER NOT NULL,
      FOREIGN KEY (shopId) REFERENCES shops(shopId)
    );

    CREATE INDEX IF NOT EXISTS idx_reservations_phone ON reservations(customerPhone);
    CREATE INDEX IF NOT EXISTS idx_reservations_shop ON reservations(shopId);
    CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(pickupCode);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      shopId TEXT NOT NULL,
      inventoryId TEXT NOT NULL,
      customerPhone TEXT NOT NULL,
      qty INTEGER NOT NULL,
      etaMinutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      expiresAt TEXT NOT NULL,
      ttl INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (shopId) REFERENCES shops(shopId)
    );

    CREATE INDEX IF NOT EXISTS idx_requests_shop ON requests(shopId);
    CREATE INDEX IF NOT EXISTS idx_requests_phone ON requests(customerPhone);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      shopId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      requestId TEXT,
      reservationId TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'IN_APP'
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_shop ON notifications(shopId);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      brandId TEXT NOT NULL,
      productKeys TEXT NOT NULL, -- JSON array
      areaIds TEXT NOT NULL,     -- JSON array
      costPerClickINR REAL NOT NULL,
      budgetINR REAL NOT NULL,
      remainingINR REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      startAt TEXT NOT NULL,
      endAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      role TEXT NOT NULL,
      expiresAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      productKey TEXT,
      shopId TEXT,
      areaId TEXT,
      ts TEXT NOT NULL
    );
  `);
}
