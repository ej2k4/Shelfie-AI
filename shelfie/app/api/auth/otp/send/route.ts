import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import twilio from "twilio";
import { z } from "zod";
import { otpStore } from "@/lib/otpStore";

const sendSchema = z.object({
  phone: z.string().min(10),
  role: z.enum(["CUSTOMER", "SHOPKEEPER"]),
  shopId: z.string().optional(), // Used if role is SHOPKEEPER to verify ownership
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = sendSchema.parse(body);

    const db = getDb();

    if (data.role === "SHOPKEEPER") {
      if (!data.shopId) {
        return NextResponse.json({ error: "ShopId required for shopkeeper login" }, { status: 400 });
      }
      const shop = db.prepare("SELECT phone FROM shops WHERE shopId = ?").get(data.shopId) as any;
      if (!shop) {
        return NextResponse.json({ error: "Shop not found" }, { status: 404 });
      }
      // Strip non-digits before comparing
      if (shop.phone.replace(/\D/g, "") !== data.phone.replace(/\D/g, "")) {
        return NextResponse.json({ error: "Phone number does not match shop owner" }, { status: 403 });
      }
    }

    const DEMO_MODE = process.env.DEMO_MODE === "true";
    const otp = DEMO_MODE ? "123456" : Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(data.phone, {
      code: otp,
      expires: Date.now() + 5 * 60 * 1000, // 5 mins
      role: data.role,
      shopId: data.shopId,
    });

    if (
      !DEMO_MODE &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_ACCOUNT_SID !== "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    ) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN!);
      await client.messages.create({
        body: `Your Shelfie verification code is ${otp}`,
        from: process.env.TWILIO_WHATSAPP_NUMBER!,
        to: `whatsapp:${data.phone}`,
      });
    }

    return NextResponse.json({ success: true, message: "OTP sent" });
  } catch (e: any) {
    if (e.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: e.errors }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "Invalid request" }, { status: 400 });
  }
}
