// lib/notify.ts
// Notification layer — Twilio WhatsApp sandbox + in-app fallback.
//
// When DEMO_MODE=true or NEXT_PUBLIC_TWILIO_ENABLED=false:
//   Writes a notification record to SQLite. The shopkeeper dashboard polls for it.
//   A visible "Demo mode: WhatsApp notification simulated" banner is shown.
//
// When Twilio is configured:
//   Sends a real WhatsApp message via Twilio sandbox.
//   The /api/whatsapp/webhook route handles replies (ACCEPT/DECLINE).

import { getDb } from "./db";
import { randomUUID } from "crypto";

const DEMO_MODE = process.env.DEMO_MODE === "true";

interface NotifyShopArgs {
  shopId: string;
  shopWhatsapp: string;
  requestId: string;
  productName: string;
  customerPhone: string;
  qty: number;
  etaMinutes: number;
}

interface NotifyCustomerArgs {
  customerPhone: string;
  shopName: string;
  productName: string;
  pickupCode: string;
  expiresAt: string;
  shopAddress: string;
}

export async function notifyShopOfRequest(args: NotifyShopArgs): Promise<void> {
  const { shopId, shopWhatsapp, requestId, productName, customerPhone, qty, etaMinutes } = args;

  const title = `🛎️ New Request: ${productName}`;
  const body = `Customer (${customerPhone}) wants ${qty}x ${productName}. ETA: ${etaMinutes} min.\n\nReply 1 to Accept, 2 to Decline.\n\nCode: ${requestId}`;

  // Always write in-app notification
  const db = getDb();
  db.prepare(`
    INSERT INTO notifications (id, shopId, type, title, body, requestId, read, createdAt, channel)
    VALUES (?, ?, 'NEW_REQUEST', ?, ?, ?, 0, ?, ?)
  `).run(
    `notif_${randomUUID()}`,
    shopId,
    title,
    body,
    requestId,
    new Date().toISOString(),
    DEMO_MODE ? "WHATSAPP_SIMULATED" : "IN_APP"
  );

  // Send real WhatsApp if Twilio is configured
  if (!DEMO_MODE && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx") {
    await sendTwilioWhatsApp(
      shopWhatsapp,
      `🛎️ *Shelfie* - New Request\n\nCustomer wants *${qty}x ${productName}*\nETA: ${etaMinutes} minutes\n\nReply *1* to Accept\nReply *2* to Decline\n\n(Ref: ${requestId.slice(-8)})`
    );
  }
}

export async function notifyCustomerOfAccept(args: NotifyCustomerArgs): Promise<void> {
  const { customerPhone, shopName, productName, pickupCode, expiresAt, shopAddress } = args;

  const expiryTime = new Date(expiresAt).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit"
  });

  const message =
    `✅ *Shelfie* - Item Reserved!\n\n` +
    `*${productName}* is ready at *${shopName}*\n` +
    `📍 ${shopAddress}\n\n` +
    `🔑 Pickup Code: *${pickupCode}*\n` +
    `⏰ Valid until: ${expiryTime}\n\n` +
    `Show this code at the counter when you arrive.`;

  if (!DEMO_MODE && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx") {
    await sendTwilioWhatsApp(customerPhone, message);
  }

  // Log to console in demo mode
  console.log(`[notify] Customer ${customerPhone} notified: pickup code ${pickupCode}`);
}

async function sendTwilioWhatsApp(to: string, body: string): Promise<void> {
  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

    const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER!,
      to: toFormatted,
      body,
    });
    console.log(`[twilio] Sent WhatsApp to ${to}`);
  } catch (err) {
    console.error("[twilio] Failed to send WhatsApp:", err);
    // Don't throw — notifications should never break the core flow
  }
}
