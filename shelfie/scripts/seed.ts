#!/usr/bin/env node
// scripts/seed.ts
// Seeds the SQLite database with realistic data for 5 Bengaluru areas.
// Run with: npx tsx scripts/seed.ts
// Safe to run multiple times (clears existing data first).

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import ngeohash from "ngeohash";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "shelfie.db");

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY, shopId TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    address TEXT NOT NULL, area TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
    phone TEXT NOT NULL, whatsapp TEXT NOT NULL, hours TEXT NOT NULL,
    reliability REAL DEFAULT 0.9, defaultHoldMinutes INTEGER DEFAULT 45,
    areaId TEXT NOT NULL, plan TEXT NOT NULL, stats TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY, shopId TEXT NOT NULL, productId TEXT NOT NULL,
    name TEXT NOT NULL, category TEXT NOT NULL, price REAL NOT NULL,
    onlineQty INTEGER NOT NULL DEFAULT 0, offlineQty INTEGER NOT NULL DEFAULT 0,
    lastUpdated TEXT NOT NULL, lastVerified TEXT NOT NULL,
    unmetRequests7d INTEGER DEFAULT 0, imageEmoji TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_inventory_shop ON inventory(shopId);
  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY, shopId TEXT NOT NULL, inventoryId TEXT NOT NULL,
    customerPhone TEXT NOT NULL, qty INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'HELD',
    source TEXT NOT NULL, pickupCode TEXT NOT NULL, createdAt TEXT NOT NULL,
    expiresAt TEXT NOT NULL, ttl INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_reservations_phone ON reservations(customerPhone);
  CREATE INDEX IF NOT EXISTS idx_reservations_shop ON reservations(shopId);
  CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(pickupCode);
  CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY, shopId TEXT NOT NULL, inventoryId TEXT NOT NULL,
    customerPhone TEXT NOT NULL, qty INTEGER NOT NULL, etaMinutes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', expiresAt TEXT NOT NULL,
    ttl INTEGER NOT NULL, createdAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_requests_shop ON requests(shopId);
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, shopId TEXT NOT NULL, type TEXT NOT NULL,
    title TEXT NOT NULL, body TEXT NOT NULL, requestId TEXT, reservationId TEXT,
    read INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'IN_APP'
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY, brandId TEXT NOT NULL, productKeys TEXT NOT NULL,
    areaIds TEXT NOT NULL, costPerClickINR REAL NOT NULL, budgetINR REAL NOT NULL,
    remainingINR REAL NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE',
    startAt TEXT NOT NULL, endAt TEXT NOT NULL
  );
`);

// ── Clear existing data ──────────────────────────────────────────────────────
db.exec(`DELETE FROM notifications; DELETE FROM requests; DELETE FROM reservations; DELETE FROM inventory; DELETE FROM shops; DELETE FROM campaigns;`);
console.log("Cleared existing data.");

// ── Helpers ──────────────────────────────────────────────────────────────────
const weekdayHours = { mon: ["09:00","21:30"], tue: ["09:00","21:30"], wed: ["09:00","21:30"], thu: ["09:00","21:30"], fri: ["09:00","22:00"], sat: ["09:00","22:00"], sun: ["10:00","20:00"] };
const shortHours = { mon: ["10:00","20:00"], tue: ["10:00","20:00"], wed: ["10:00","20:00"], thu: ["10:00","20:00"], fri: ["10:00","21:00"], sat: ["09:00","21:00"], sun: ["10:00","18:00"] };
const defaultStats = { requestsReceived: 0, requestsAccepted: 0, avgResponseSec: 0, pickupsConfirmed: 0, pickupsFulfilled: 0 };
const defaultPlan = { id: "FREE", status: "ACTIVE", currentPeriodEnd: null, razorpaySubscriptionId: null };

function addShop(shop: {
  id: string; name: string; address: string; area: string;
  lat: number; lng: number; phone: string;
  reliability: number; hours: object; plan?: object; stats?: object;
}) {
  const areaId = ngeohash.encode(shop.lat, shop.lng, 6);
  db.prepare(`
    INSERT INTO shops (id, shopId, name, address, area, lat, lng, phone, whatsapp, hours,
      reliability, defaultHoldMinutes, areaId, plan, stats)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 45, ?, ?, ?)
  `).run(
    shop.id, shop.id, shop.name, shop.address, shop.area,
    shop.lat, shop.lng, shop.phone, shop.phone,
    JSON.stringify(shop.hours),
    shop.reliability, areaId,
    JSON.stringify(shop.plan ?? defaultPlan),
    JSON.stringify(shop.stats ?? defaultStats)
  );
}

function addProduct(product: {
  shopId: string; category: string; name: string; price: number;
  onlineQty: number; offlineQty: number; emoji?: string; productId?: string;
}) {
  const productId = product.productId ?? `prod_${randomUUID().slice(0,8)}`;
  const id = `inv_${product.shopId}_${productId}`;
  const now = new Date(Date.now() - Math.floor(Math.random() * 120) * 60000).toISOString();
  db.prepare(`
    INSERT INTO inventory (id, shopId, productId, name, category, price, onlineQty, offlineQty, lastUpdated, lastVerified, unmetRequests7d, imageEmoji)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, product.shopId, productId, product.name, product.category, product.price, product.onlineQty, product.offlineQty, now, now, 0, product.emoji ?? "📦");
}

// ── ─── AREA 1: Koramangala ──────────────────────────────────────────────────
// ~12.9352, 77.6245

addShop({ id: "shop_km_01", name: "Sri Ganesh Electronics", area: "Koramangala",
  address: "80 Feet Rd, 4th Block, Koramangala", lat: 12.9352, lng: 77.6245,
  phone: "+919845000001", reliability: 0.94, hours: weekdayHours,
  stats: { requestsReceived: 24, requestsAccepted: 19, avgResponseSec: 38, pickupsConfirmed: 42, pickupsFulfilled: 40 }
});
addProduct({ shopId: "shop_km_01", category: "electronics", name: "Dell 65W Laptop Charger", price: 1299, onlineQty: 4, offlineQty: 8, emoji: "🔌" });
addProduct({ shopId: "shop_km_01", category: "electronics", name: "USB-C to USB-A Cable (1m)", price: 299, onlineQty: 10, offlineQty: 15, emoji: "🔌" });
addProduct({ shopId: "shop_km_01", category: "electronics", name: "Wireless Mouse (Logitech M185)", price: 849, onlineQty: 3, offlineQty: 5, emoji: "🖱️" });
addProduct({ shopId: "shop_km_01", category: "electronics", name: "HDMI Cable (2m)", price: 349, onlineQty: 6, offlineQty: 4, emoji: "📺" });
addProduct({ shopId: "shop_km_01", category: "electronics", name: "Laptop Stand (Aluminium)", price: 999, onlineQty: 2, offlineQty: 3, emoji: "💻" });
addProduct({ shopId: "shop_km_01", category: "electronics", name: "Pendrive 32GB (SanDisk)", price: 499, onlineQty: 8, offlineQty: 10, emoji: "💾" });
addProduct({ shopId: "shop_km_01", category: "electronics", name: "Power Bank 10000mAh (Ambrane)", price: 1199, onlineQty: 0, offlineQty: 4, emoji: "🔋" });
addProduct({ shopId: "shop_km_01", category: "electronics", name: "Earphones Wired (boAt BassHeads)", price: 599, onlineQty: 5, offlineQty: 7, emoji: "🎧" });

addShop({ id: "shop_km_02", name: "Koramangala Pharma Plus", area: "Koramangala",
  address: "1st Block, 1st Cross, Koramangala", lat: 12.9340, lng: 77.6210,
  phone: "+919845000002", reliability: 0.97, hours: { ...weekdayHours, mon: ["08:00","22:00"], fri: ["08:00","22:00"] },
  stats: { requestsReceived: 56, requestsAccepted: 52, avgResponseSec: 22, pickupsConfirmed: 88, pickupsFulfilled: 87 }
});
addProduct({ shopId: "shop_km_02", category: "pharmacy", name: "Paracetamol 500mg (Strip of 10)", price: 25, onlineQty: 50, offlineQty: 100, emoji: "💊" });
addProduct({ shopId: "shop_km_02", category: "pharmacy", name: "Dolo 650mg (Strip of 15)", price: 38, onlineQty: 30, offlineQty: 80, emoji: "💊" });
addProduct({ shopId: "shop_km_02", category: "pharmacy", name: "Vitamin C 500mg (30 tabs)", price: 149, onlineQty: 15, offlineQty: 30, emoji: "🍊" });
addProduct({ shopId: "shop_km_02", category: "pharmacy", name: "Betadine Antiseptic (30ml)", price: 89, onlineQty: 20, offlineQty: 40, emoji: "🩺" });
addProduct({ shopId: "shop_km_02", category: "pharmacy", name: "Disprin (Strip of 10)", price: 18, onlineQty: 40, offlineQty: 60, emoji: "💊" });
addProduct({ shopId: "shop_km_02", category: "pharmacy", name: "Digital Thermometer", price: 199, onlineQty: 5, offlineQty: 10, emoji: "🌡️" });
addProduct({ shopId: "shop_km_02", category: "pharmacy", name: "Bandage Crepe 10cm", price: 45, onlineQty: 12, offlineQty: 20, emoji: "🩹" });
addProduct({ shopId: "shop_km_02", category: "pharmacy", name: "Hand Sanitizer 100ml (Dettol)", price: 99, onlineQty: 25, offlineQty: 50, emoji: "🧴" });

addShop({ id: "shop_km_03", name: "Daily Needs Store", area: "Koramangala",
  address: "Jyoti Nivas College Rd, 5th Block, Koramangala", lat: 12.9372, lng: 77.6268,
  phone: "+919845000003", reliability: 0.88, hours: weekdayHours,
});
addProduct({ shopId: "shop_km_03", category: "grocery", name: "Maggi Noodles (72g × 4 pack)", price: 68, onlineQty: 30, offlineQty: 70, emoji: "🍜" });
addProduct({ shopId: "shop_km_03", category: "grocery", name: "Amul Butter (500g)", price: 275, onlineQty: 8, offlineQty: 15, emoji: "🧈" });
addProduct({ shopId: "shop_km_03", category: "grocery", name: "Aashirvaad Atta (5kg)", price: 239, onlineQty: 5, offlineQty: 10, emoji: "🌾" });
addProduct({ shopId: "shop_km_03", category: "grocery", name: "Tata Salt (1kg)", price: 28, onlineQty: 20, offlineQty: 30, emoji: "🧂" });
addProduct({ shopId: "shop_km_03", category: "grocery", name: "Surf Excel (1kg)", price: 195, onlineQty: 10, offlineQty: 20, emoji: "🧺" });
addProduct({ shopId: "shop_km_03", category: "grocery", name: "Parle-G Biscuit (Pack of 6)", price: 40, onlineQty: 30, offlineQty: 60, emoji: "🍪" });
addProduct({ shopId: "shop_km_03", category: "grocery", name: "Fortune Sunflower Oil (1L)", price: 148, onlineQty: 6, offlineQty: 12, emoji: "🌻" });
addProduct({ shopId: "shop_km_03", category: "grocery", name: "Nescafé Classic (50g)", price: 149, onlineQty: 10, offlineQty: 20, emoji: "☕" });

// ── AREA 2: Indiranagar ─────────────────────────────────────────────────────
// ~12.9784, 77.6408

addShop({ id: "shop_in_01", name: "Tech Galaxy Indiranagar", area: "Indiranagar",
  address: "100 Feet Rd, HAL 2nd Stage, Indiranagar", lat: 12.9784, lng: 77.6408,
  phone: "+919845000011", reliability: 0.91, hours: weekdayHours,
  stats: { requestsReceived: 31, requestsAccepted: 25, avgResponseSec: 55, pickupsConfirmed: 60, pickupsFulfilled: 57 }
});
addProduct({ shopId: "shop_in_01", category: "electronics", name: "iPhone 14 Lightning Cable (1m)", price: 1299, onlineQty: 5, offlineQty: 8, emoji: "🔌" });
addProduct({ shopId: "shop_in_01", category: "electronics", name: "MacBook 96W USB-C Charger", price: 4999, onlineQty: 1, offlineQty: 3, emoji: "🔌" });
addProduct({ shopId: "shop_in_01", category: "electronics", name: "AirPods Case Replacement", price: 999, onlineQty: 2, offlineQty: 4, emoji: "🎧" });
addProduct({ shopId: "shop_in_01", category: "electronics", name: "Samsung 45W Fast Charger", price: 1899, onlineQty: 3, offlineQty: 5, emoji: "🔌" });
addProduct({ shopId: "shop_in_01", category: "electronics", name: "Anker 20W USB-C Charger", price: 1499, onlineQty: 4, offlineQty: 6, emoji: "🔌" });
addProduct({ shopId: "shop_in_01", category: "electronics", name: "Screen Protector (iPhone 14)", price: 399, onlineQty: 8, offlineQty: 12, emoji: "📱" });
addProduct({ shopId: "shop_in_01", category: "electronics", name: "Phone Case (iPhone 14 Pro)", price: 499, onlineQty: 6, offlineQty: 10, emoji: "📱" });
addProduct({ shopId: "shop_in_01", category: "electronics", name: "Mini Bluetooth Speaker (JBL Go)", price: 2499, onlineQty: 2, offlineQty: 3, emoji: "🔊" });

addShop({ id: "shop_in_02", name: "Indiranagar Medical Centre", area: "Indiranagar",
  address: "12th Main, 1st Stage, Indiranagar", lat: 12.9768, lng: 77.6383,
  phone: "+919845000012", reliability: 0.96, hours: { ...weekdayHours, sun: ["09:00","19:00"] },
  stats: { requestsReceived: 44, requestsAccepted: 42, avgResponseSec: 28, pickupsConfirmed: 70, pickupsFulfilled: 69 }
});
addProduct({ shopId: "shop_in_02", category: "pharmacy", name: "Azithromycin 500mg (3 tabs)", price: 85, onlineQty: 20, offlineQty: 50, emoji: "💊" });
addProduct({ shopId: "shop_in_02", category: "pharmacy", name: "ORS Sachet (Electral, 5 pack)", price: 35, onlineQty: 40, offlineQty: 80, emoji: "💧" });
addProduct({ shopId: "shop_in_02", category: "pharmacy", name: "BP Monitor (Omron Digital)", price: 1899, onlineQty: 2, offlineQty: 5, emoji: "🩺" });
addProduct({ shopId: "shop_in_02", category: "pharmacy", name: "Cetirizine 10mg (Strip)", price: 28, onlineQty: 35, offlineQty: 70, emoji: "💊" });
addProduct({ shopId: "shop_in_02", category: "pharmacy", name: "Ibuprofen 400mg (Strip of 15)", price: 42, onlineQty: 25, offlineQty: 55, emoji: "💊" });
addProduct({ shopId: "shop_in_02", category: "pharmacy", name: "Glucometer Strips (25 count)", price: 349, onlineQty: 5, offlineQty: 10, emoji: "🩸" });
addProduct({ shopId: "shop_in_02", category: "pharmacy", name: "Nebulizer (Dr. Morepen)", price: 1499, onlineQty: 0, offlineQty: 3, emoji: "🏥" });

addShop({ id: "shop_in_03", name: "FreshMart Superstore", area: "Indiranagar",
  address: "CMH Rd, Indiranagar", lat: 12.9801, lng: 77.6425,
  phone: "+919845000013", reliability: 0.85, hours: shortHours,
});
addProduct({ shopId: "shop_in_03", category: "grocery", name: "Basmati Rice (India Gate, 5kg)", price: 480, onlineQty: 4, offlineQty: 8, emoji: "🍚" });
addProduct({ shopId: "shop_in_03", category: "grocery", name: "Toor Dal (1kg)", price: 130, onlineQty: 10, offlineQty: 20, emoji: "🫘" });
addProduct({ shopId: "shop_in_03", category: "grocery", name: "Amul Milk 500ml Tetra", price: 32, onlineQty: 25, offlineQty: 50, emoji: "🥛" });
addProduct({ shopId: "shop_in_03", category: "grocery", name: "Britannia Brown Bread", price: 55, onlineQty: 8, offlineQty: 15, emoji: "🍞" });
addProduct({ shopId: "shop_in_03", category: "grocery", name: "MTR Sambar Powder (200g)", price: 79, onlineQty: 12, offlineQty: 20, emoji: "🍛" });
addProduct({ shopId: "shop_in_03", category: "grocery", name: "Haldiram's Mixture (400g)", price: 99, onlineQty: 15, offlineQty: 25, emoji: "🍿" });
addProduct({ shopId: "shop_in_03", category: "grocery", name: "Colgate MaxFresh Toothpaste (200g)", price: 138, onlineQty: 10, offlineQty: 20, emoji: "🪥" });

// ── AREA 3: JP Nagar ────────────────────────────────────────────────────────
// ~12.9069, 77.5850

addShop({ id: "shop_jp_01", name: "JP Nagar Electronics World", area: "JP Nagar",
  address: "24th Main, JP Nagar 1st Phase", lat: 12.9080, lng: 77.5855,
  phone: "+919845000021", reliability: 0.89, hours: weekdayHours,
});
addProduct({ shopId: "shop_jp_01", category: "electronics", name: "Realme Narzo 65W Charger", price: 799, onlineQty: 5, offlineQty: 8, emoji: "🔌" });
addProduct({ shopId: "shop_jp_01", category: "electronics", name: "USB Hub 4-Port (TP-Link)", price: 699, onlineQty: 4, offlineQty: 6, emoji: "🔌" });
addProduct({ shopId: "shop_jp_01", category: "electronics", name: "Mechanical Keyboard (Portronics)", price: 1599, onlineQty: 1, offlineQty: 3, emoji: "⌨️" });
addProduct({ shopId: "shop_jp_01", category: "electronics", name: "CCTV Camera (1080p, Hikvision)", price: 2499, onlineQty: 0, offlineQty: 5, emoji: "📷" });
addProduct({ shopId: "shop_jp_01", category: "electronics", name: "Extension Cord (3m, 4 socket)", price: 449, onlineQty: 6, offlineQty: 8, emoji: "🔌" });
addProduct({ shopId: "shop_jp_01", category: "electronics", name: "Laptop Cooling Pad", price: 849, onlineQty: 3, offlineQty: 4, emoji: "💻" });
addProduct({ shopId: "shop_jp_01", category: "electronics", name: "Webcam 1080p (Logitech C270)", price: 3299, onlineQty: 1, offlineQty: 2, emoji: "📹" });

addShop({ id: "shop_jp_02", name: "JP Nagar Medicals", area: "JP Nagar",
  address: "Outer Ring Rd, JP Nagar 7th Phase", lat: 12.9055, lng: 77.5870,
  phone: "+919845000022", reliability: 0.93, hours: weekdayHours,
});
addProduct({ shopId: "shop_jp_02", category: "pharmacy", name: "Metformin 500mg (Strip of 10)", price: 32, onlineQty: 30, offlineQty: 60, emoji: "💊" });
addProduct({ shopId: "shop_jp_02", category: "pharmacy", name: "Vicks VapoRub (25g)", price: 89, onlineQty: 18, offlineQty: 40, emoji: "🤧" });
addProduct({ shopId: "shop_jp_02", category: "pharmacy", name: "Burnol Cream (10g)", price: 65, onlineQty: 15, offlineQty: 30, emoji: "🩹" });
addProduct({ shopId: "shop_jp_02", category: "pharmacy", name: "Glucose-D Powder (500g)", price: 135, onlineQty: 8, offlineQty: 20, emoji: "🍭" });
addProduct({ shopId: "shop_jp_02", category: "pharmacy", name: "Baby Diaper (Pampers, 20 count)", price: 399, onlineQty: 5, offlineQty: 15, emoji: "👶" });
addProduct({ shopId: "shop_jp_02", category: "pharmacy", name: "Moov Pain Relief Spray (80g)", price: 185, onlineQty: 10, offlineQty: 25, emoji: "💪" });

addShop({ id: "shop_jp_03", name: "Kiran General Store", area: "JP Nagar",
  address: "15th Cross, JP Nagar 2nd Phase", lat: 12.9095, lng: 77.5830,
  phone: "+919845000023", reliability: 0.87, hours: { ...weekdayHours, sun: ["08:00","14:00"] },
});
addProduct({ shopId: "shop_jp_03", category: "grocery", name: "Bru Coffee (50g)", price: 99, onlineQty: 12, offlineQty: 20, emoji: "☕" });
addProduct({ shopId: "shop_jp_03", category: "grocery", name: "Lipton Yellow Label Tea (100g)", price: 95, onlineQty: 10, offlineQty: 18, emoji: "🍵" });
addProduct({ shopId: "shop_jp_03", category: "grocery", name: "Kurkure (85g)", price: 30, onlineQty: 25, offlineQty: 50, emoji: "🍿" });
addProduct({ shopId: "shop_jp_03", category: "grocery", name: "Thums Up (750ml PET bottle)", price: 48, onlineQty: 15, offlineQty: 30, emoji: "🥤" });
addProduct({ shopId: "shop_jp_03", category: "grocery", name: "Vim Dishwash Bar (200g)", price: 24, onlineQty: 20, offlineQty: 35, emoji: "🍽️" });
addProduct({ shopId: "shop_jp_03", category: "grocery", name: "Dove Soap (75g)", price: 58, onlineQty: 18, offlineQty: 30, emoji: "🧼" });

// ── AREA 4: HSR Layout ─────────────────────────────────────────────────────
// ~12.9116, 77.6389

addShop({ id: "shop_hsr_01", name: "HSR Tech Corner", area: "HSR Layout",
  address: "27th Main, Sector 1, HSR Layout", lat: 12.9116, lng: 77.6389,
  phone: "+919845000031", reliability: 0.92, hours: weekdayHours,
  stats: { requestsReceived: 15, requestsAccepted: 12, avgResponseSec: 48, pickupsConfirmed: 28, pickupsFulfilled: 26 }
});
addProduct({ shopId: "shop_hsr_01", category: "electronics", name: "OnePlus 65W SUPERVOOC Charger", price: 1299, onlineQty: 3, offlineQty: 5, emoji: "⚡" });
addProduct({ shopId: "shop_hsr_01", category: "electronics", name: "Mi 33W Fast Charger", price: 699, onlineQty: 5, offlineQty: 8, emoji: "🔌" });
addProduct({ shopId: "shop_hsr_01", category: "electronics", name: "Noise Cancelling Earbuds (boAt Airdopes)", price: 2999, onlineQty: 2, offlineQty: 4, emoji: "🎧" });
addProduct({ shopId: "shop_hsr_01", category: "electronics", name: "SmartWatch Strap (Fire-Boltt)", price: 399, onlineQty: 8, offlineQty: 12, emoji: "⌚" });
addProduct({ shopId: "shop_hsr_01", category: "electronics", name: "Ring Light 6-inch (USB)", price: 799, onlineQty: 2, offlineQty: 4, emoji: "💡" });
addProduct({ shopId: "shop_hsr_01", category: "electronics", name: "Gaming Mouse (Ant Esports)", price: 1299, onlineQty: 1, offlineQty: 3, emoji: "🖱️" });
addProduct({ shopId: "shop_hsr_01", category: "electronics", name: "Laptop Bag 15.6\" (Skybags)", price: 999, onlineQty: 3, offlineQty: 5, emoji: "💼" });
addProduct({ shopId: "shop_hsr_01", category: "electronics", name: "Desk Lamp LED (Philips)", price: 1499, onlineQty: 2, offlineQty: 3, emoji: "💡" });

addShop({ id: "shop_hsr_02", name: "24/7 Pharmacy HSR", area: "HSR Layout",
  address: "Sector 7, HSR Layout", lat: 12.9132, lng: 77.6403,
  phone: "+919845000032", reliability: 0.98, hours: { mon: ["00:00","23:59"], tue: ["00:00","23:59"], wed: ["00:00","23:59"], thu: ["00:00","23:59"], fri: ["00:00","23:59"], sat: ["00:00","23:59"], sun: ["00:00","23:59"] },
  stats: { requestsReceived: 80, requestsAccepted: 78, avgResponseSec: 18, pickupsConfirmed: 140, pickupsFulfilled: 139 }
});
addProduct({ shopId: "shop_hsr_02", category: "pharmacy", name: "Clonazepam 0.5mg (need prescription)", price: 55, onlineQty: 0, offlineQty: 30, emoji: "💊" });
addProduct({ shopId: "shop_hsr_02", category: "pharmacy", name: "Allegra M (Strip of 10)", price: 120, onlineQty: 25, offlineQty: 50, emoji: "💊" });
addProduct({ shopId: "shop_hsr_02", category: "pharmacy", name: "Protein Shake (MuscleBlaze, 1kg)", price: 1299, onlineQty: 3, offlineQty: 7, emoji: "💪" });
addProduct({ shopId: "shop_hsr_02", category: "pharmacy", name: "Pulse Oximeter (Dr. Gene)", price: 899, onlineQty: 4, offlineQty: 8, emoji: "❤️" });
addProduct({ shopId: "shop_hsr_02", category: "pharmacy", name: "N95 Mask (10 count)", price: 199, onlineQty: 20, offlineQty: 50, emoji: "😷" });
addProduct({ shopId: "shop_hsr_02", category: "pharmacy", name: "Eno Sachet (Lemon, 30 count)", price: 120, onlineQty: 15, offlineQty: 40, emoji: "🍋" });

addShop({ id: "shop_hsr_03", name: "HSR Kirana & More", area: "HSR Layout",
  address: "BTM 2nd Stage, near HSR border", lat: 12.9098, lng: 77.6370,
  phone: "+919845000033", reliability: 0.86, hours: weekdayHours,
});
addProduct({ shopId: "shop_hsr_03", category: "grocery", name: "Good Day Cashew Cookies (600g)", price: 145, onlineQty: 10, offlineQty: 20, emoji: "🍪" });
addProduct({ shopId: "shop_hsr_03", category: "grocery", name: "Paper Napkins (100 count)", price: 70, onlineQty: 15, offlineQty: 30, emoji: "🧻" });
addProduct({ shopId: "shop_hsr_03", category: "grocery", name: "Ariel Matic Liquid (1L)", price: 299, onlineQty: 6, offlineQty: 12, emoji: "🧺" });
addProduct({ shopId: "shop_hsr_03", category: "grocery", name: "Lays American Style Cream (52g × 6)", price: 180, onlineQty: 12, offlineQty: 25, emoji: "🥔" });
addProduct({ shopId: "shop_hsr_03", category: "grocery", name: "Red Bull Energy (250ml)", price: 125, onlineQty: 18, offlineQty: 35, emoji: "⚡" });

// ── AREA 5: Jayanagar ─────────────────────────────────────────────────────
// ~12.9299, 77.5830

addShop({ id: "shop_jn_01", name: "Sapna Electronics Jayanagar", area: "Jayanagar",
  address: "11th Main, 4th T Block, Jayanagar", lat: 12.9299, lng: 77.5830,
  phone: "+919845000041", reliability: 0.90, hours: weekdayHours,
});
addProduct({ shopId: "shop_jn_01", category: "electronics", name: "HP 45W Laptop Charger", price: 1499, onlineQty: 2, offlineQty: 5, emoji: "🔌" });
addProduct({ shopId: "shop_jn_01", category: "electronics", name: "Pen Drive 64GB (HP)", price: 549, onlineQty: 6, offlineQty: 10, emoji: "💾" });
addProduct({ shopId: "shop_jn_01", category: "electronics", name: "External HDD 1TB (WD)", price: 4499, onlineQty: 1, offlineQty: 2, emoji: "💿" });
addProduct({ shopId: "shop_jn_01", category: "electronics", name: "LED Bulb 9W (Syska, pack of 2)", price: 249, onlineQty: 10, offlineQty: 20, emoji: "💡" });
addProduct({ shopId: "shop_jn_01", category: "electronics", name: "Electric Mosquito Bat", price: 299, onlineQty: 5, offlineQty: 10, emoji: "🦟" });
addProduct({ shopId: "shop_jn_01", category: "electronics", name: "Bluetooth Keyboard (iClever)", price: 1899, onlineQty: 1, offlineQty: 3, emoji: "⌨️" });
addProduct({ shopId: "shop_jn_01", category: "electronics", name: "Smart Plug WiFi (Wipro)", price: 799, onlineQty: 4, offlineQty: 6, emoji: "🔌" });

addShop({ id: "shop_jn_02", name: "Jayanagar Super Pharma", area: "Jayanagar",
  address: "30th Cross, Jayanagar 4th Block", lat: 12.9285, lng: 77.5810,
  phone: "+919845000042", reliability: 0.94, hours: weekdayHours,
  stats: { requestsReceived: 38, requestsAccepted: 35, avgResponseSec: 32, pickupsConfirmed: 65, pickupsFulfilled: 63 }
});
addProduct({ shopId: "shop_jn_02", category: "pharmacy", name: "Insulin Syringe 1ml (BD, 10 count)", price: 85, onlineQty: 10, offlineQty: 30, emoji: "💉" });
addProduct({ shopId: "shop_jn_02", category: "pharmacy", name: "Pregabalin 75mg (Strip of 10)", price: 125, onlineQty: 15, offlineQty: 40, emoji: "💊" });
addProduct({ shopId: "shop_jn_02", category: "pharmacy", name: "Multivitamin Capsules (30 count)", price: 299, onlineQty: 10, offlineQty: 25, emoji: "💊" });
addProduct({ shopId: "shop_jn_02", category: "pharmacy", name: "Eye Drops (Refresh, 10ml)", price: 149, onlineQty: 8, offlineQty: 20, emoji: "👁️" });
addProduct({ shopId: "shop_jn_02", category: "pharmacy", name: "Accu-Chek Strips (25 count)", price: 499, onlineQty: 4, offlineQty: 10, emoji: "🩸" });
addProduct({ shopId: "shop_jn_02", category: "pharmacy", name: "Dermi Cool Prickly Heat Powder (150g)", price: 79, onlineQty: 12, offlineQty: 30, emoji: "❄️" });

addShop({ id: "shop_jn_03", name: "Srinivasa General Merchants", area: "Jayanagar",
  address: "Ashoka Pillar, Jayanagar 9th Block", lat: 12.9310, lng: 77.5850,
  phone: "+919845000043", reliability: 0.91, hours: shortHours,
});
addProduct({ shopId: "shop_jn_03", category: "grocery", name: "Sunfeast Yippee Noodles (75g × 4)", price: 60, onlineQty: 25, offlineQty: 50, emoji: "🍜" });
addProduct({ shopId: "shop_jn_03", category: "grocery", name: "Tiger Glucose Biscuit (300g)", price: 30, onlineQty: 30, offlineQty: 60, emoji: "🍪" });
addProduct({ shopId: "shop_jn_03", category: "grocery", name: "Horlicks Health Drink (500g)", price: 249, onlineQty: 5, offlineQty: 12, emoji: "🥛" });
addProduct({ shopId: "shop_jn_03", category: "grocery", name: "Pedigree Dog Food (400g)", price: 135, onlineQty: 6, offlineQty: 10, emoji: "🐕" });
addProduct({ shopId: "shop_jn_03", category: "grocery", name: "Agarbatti (Cycle Brand, 100 sticks)", price: 65, onlineQty: 20, offlineQty: 40, emoji: "🕯️" });
addProduct({ shopId: "shop_jn_03", category: "grocery", name: "Puja Camphor (50g)", price: 45, onlineQty: 15, offlineQty: 30, emoji: "🪔" });

// ── Seed campaigns ──────────────────────────────────────────────────────────
db.prepare(`
  INSERT INTO campaigns (id, brandId, productKeys, areaIds, costPerClickINR, budgetINR, remainingINR, status, startAt, endAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
`).run(
  "camp_dell_001", "brand_dell",
  JSON.stringify(["dell 65w laptop charger", "laptop charger"]),
  JSON.stringify(["tdr1vq", "tdr1vr"]),
  5, 500, 500,
  new Date().toISOString(),
  new Date(Date.now() + 30 * 86400000).toISOString()
);

// Count final records
const shopCount = (db.prepare("SELECT COUNT(*) as c FROM shops").get() as any).c;
const invCount = (db.prepare("SELECT COUNT(*) as c FROM inventory").get() as any).c;
console.log(`\n✅ Seed complete!`);
console.log(`   ${shopCount} shops across 5 areas (Koramangala, Indiranagar, JP Nagar, HSR Layout, Jayanagar)`);
console.log(`   ${invCount} products`);
console.log(`   1 demo campaign`);
console.log(`\nRun: npm run dev`);
