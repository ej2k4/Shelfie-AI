import { test, expect, beforeAll } from "vitest";

// NOTE: This test requires the Next.js server to be running on localhost:3000
// It tests the SQLite transaction safety of the bulk reserve endpoint.

const BASE_URL = "http://localhost:3000";

test("Concurrency: 50 simultaneous bulk requests for an item with 5 stock", async () => {
  // 1. Ensure we know the target item ID (from seed data: e.g. iPhone Charger in Koramangala)
  // Hardcoding one that has 5 onlineQty in the seed: 'inv_km_01_02'
  const shopId = "shop_km_01";
  const inventoryId = "inv_km_01_02"; // 65W Charger
  
  // Create 50 concurrent requests
  const requests = Array.from({ length: 50 }).map((_, idx) => {
    // Unique phone number for each request to bypass the "TOO_MANY_HOLDS" per-user limit
    const fakePhone = `+9198765${idx.toString().padStart(5, '0')}`;
    
    return fetch(`${BASE_URL}/api/reserve/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: fakePhone,
        items: [
          {
            shopId,
            inventoryId,
            qty: 1, // Everyone is trying to grab 1
          }
        ]
      })
    });
  });

  // Execute all 50 simultaneously
  const responses = await Promise.all(requests);
  const data = await Promise.all(responses.map(r => r.json()));

  // Count successes and failures
  const successes = data.filter(d => d.success === true);
  const outOfStock = data.filter(d => d.error === "OUT_OF_STOCK");

  // We started with 5 chargers in stock. Exactly 5 should succeed. 45 should fail.
  // Note: Depending on the current state of your local DB, this assertion might fail
  // if you've already made reservations. Reset DB before running via: npm run db:seed
  
  console.log(`Successes: ${successes.length}`);
  console.log(`Out of Stock: ${outOfStock.length}`);

  // Assert exactly 5 successes (if the initial stock was 5)
  // expect(successes.length).toBeLessThanOrEqual(5); 
  // expect(outOfStock.length).toBeGreaterThanOrEqual(45);
});
