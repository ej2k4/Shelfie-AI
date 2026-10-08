import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, Role } from "@/lib/auth";
import { otpStore } from "@/lib/otpStore";

const verifySchema = z.object({
  phone: z.string().min(10),
  code: z.string().length(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = verifySchema.parse(body);

    const record = otpStore.get(data.phone);
    if (!record) {
      return NextResponse.json({ error: "No OTP requested for this number" }, { status: 400 });
    }

    if (Date.now() > record.expires) {
      otpStore.delete(data.phone);
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    if (record.code !== data.code) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    otpStore.delete(data.phone);

    // For SHOPKEEPER: userId is the shopId; for CUSTOMER: userId is the phone number
    const userId = record.role === "SHOPKEEPER" ? record.shopId! : data.phone;

    await createSession(userId, record.role as Role);

    return NextResponse.json({ success: true, message: "Verified", role: record.role, userId });
  } catch (e: any) {
    if (e.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: e.errors }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "Invalid request" }, { status: 400 });
  }
}
