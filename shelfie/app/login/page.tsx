"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { SHOPS } from "@/lib/data/shops";

const FEATURES = [
  {
    icon: "📍",
    title: "Live local inventory",
    body: "See what's actually in stock at shops within walking distance — updated in real time.",
  },
  {
    icon: "⏱️",
    title: "Hold it, then go",
    body: "Reserve your item and have the shop set it aside. No more wasted trips.",
  },
  {
    icon: "🏪",
    title: "Support your neighbourhood",
    body: "Every purchase helps indie shops thrive and keeps money in the local economy.",
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"customer" | "shopkeeper">("customer");
  const [phone, setPhone] = useState("+91");
  const [shopId, setShopId] = useState("shop_km_01");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (role === "customer") {
        login({ role: "customer", phone });
        router.push("/");
      } else {
        login({ role: "shopkeeper", shopId });
        router.push("/shop/dashboard");
      }
    }, 350);
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-canvas)]">

      {/* ── Left brand panel ──────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] xl:w-[45%] bg-[#1a1a18] p-12 relative overflow-hidden shrink-0">
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
        {/* Terracotta accent glow — subtle, not burnt */}
        <div className="absolute top-[-120px] right-[-120px] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(181,69,27,0.10) 0%, transparent 65%)" }} />

        {/* Brand */}
        <div className="relative z-10">
          <Link href="/" className="font-extrabold text-2xl tracking-tight text-white">Shelfie</Link>
          <p className="text-[13px] mt-1.5 font-medium" style={{ color: "rgba(255,255,255,0.40)" }}>Live spatial inventory</p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-3">
          {FEATURES.map(f => (
            <div
              key={f.icon}
              className="flex items-start gap-4 p-4 rounded-[var(--radius-lg)]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div
                className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-xl shrink-0"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                {f.icon}
              </div>
              <div className="pt-0.5">
                <div className="font-bold text-[0.9rem] text-white mb-0.5">{f.title}</div>
                <div className="text-[12.5px] leading-[1.5]" style={{ color: "rgba(255,255,255,0.50)" }}>{f.body}</div>
              </div>
            </div>
          ))}

          {/* Social proof */}
          <div className="flex items-center gap-3 pt-2 pl-1">
            <div className="flex -space-x-2">
              {["🧑‍💼", "👩‍🦱", "🧑‍🎤", "👨‍🔧"].map((e, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                  style={{ background: "rgba(255,255,255,0.10)", border: "2px solid #1a1a18" }}
                >
                  {e}
                </div>
              ))}
            </div>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              <span className="text-white font-bold">2,400+</span> residents in Koramangala
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>© 2026 Shelfie Technologies · All rights reserved.</p>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative min-h-screen">
        {/* Mobile brand */}
        <div className="lg:hidden absolute top-6 left-6">
          <Link href="/" className="font-extrabold text-xl tracking-tight text-[var(--accent)]">Shelfie</Link>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-9">
            <h1 className="text-[2rem] font-bold tracking-tight mb-2 text-[var(--text-primary)]">Sign in</h1>
            <p className="text-[var(--text-secondary)] text-[15px]">Access your Shelfie inventory account.</p>
          </div>

          {/* Role tabs */}
          <div className="flex gap-1 p-1 mb-7 bg-[var(--bg-subtle)] rounded-[var(--radius-lg)] border border-[var(--border-light)]">
            {(["customer", "shopkeeper"] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 text-[13.5px] font-semibold rounded-[var(--radius-md)] transition-all ${
                  role === r
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)] border border-[var(--border-light)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {r === "customer" ? "Shopper" : "Merchant"}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {role === "customer" ? (
              <div>
                <label className="eyebrow block mb-2">Mobile Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="input !py-3.5 !text-[1rem]"
                  placeholder="+91 98765 43210"
                  required
                />
                <p className="meta mt-2">Used to identify you at the pickup counter.</p>
              </div>
            ) : (
              <div>
                <label className="eyebrow block mb-2">Select Your Outlet</label>
                <div className="relative">
                  <select
                    value={shopId}
                    onChange={e => setShopId(e.target.value)}
                    className="input !py-3.5 !text-[1rem] appearance-none pr-10 cursor-pointer"
                  >
                    {SHOPS.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                  <svg className="w-4 h-4 absolute right-4 top-[50%] -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full !py-[14px] !text-[0.95rem] !rounded-[var(--radius-lg)] mt-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Continue →"
              )}
            </button>
          </form>

          <div className="mt-8 pt-7 border-t border-[var(--border-light)] text-center">
            <p className="text-[13px] text-[var(--text-tertiary)]">
              {role === "customer" ? (
                <>Are you a shop owner?{" "}
                  <button onClick={() => setRole("shopkeeper")} className="font-semibold text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors">
                    Sign in as Merchant
                  </button>
                </>
              ) : (
                <>Looking to shop?{" "}
                  <button onClick={() => setRole("customer")} className="font-semibold text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors">
                    Sign in as Shopper
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
