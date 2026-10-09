"use client";

import { useAuth } from "@/lib/auth-context";
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
      <div className="hidden lg:flex flex-col justify-between w-[44%] xl:w-[46%] bg-[#0f172a] p-12 relative overflow-hidden shrink-0">
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
        {/* Subtle brand glow */}
        <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)" }} />

        {/* Brand */}
        <div className="relative z-10 pt-2">
          <Link href="/" className="inline-flex items-center gap-2 group text-decoration-none">
            <span className="font-extrabold text-2xl tracking-tight text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Shelfie</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-400)] group-hover:scale-125 transition-transform"></span>
          </Link>
          <p className="text-xs mt-1 font-semibold tracking-wide text-slate-400 uppercase">Hyperlocal Spatial Inventory Engine</p>
        </div>

        {/* Value Proposition Showcase — Centered */}
        <div className="relative z-10 my-auto py-8 space-y-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2 leading-tight">Instant pickup from neighborhood shelves.</h2>
            <p className="text-sm text-slate-400">Never walk into a store hoping an item is in stock again.</p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(f => (
              <div
                key={f.icon}
                className="flex items-start gap-4 p-4 rounded-[var(--radius-xl)] bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm"
              >
                <div
                  className="w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center text-xl shrink-0 bg-white/[0.08] border border-white/[0.12]"
                >
                  {f.icon}
                </div>
                <div className="pt-0.5">
                  <div className="font-bold text-sm text-white mb-0.5">{f.title}</div>
                  <div className="text-xs leading-relaxed text-slate-400">{f.body}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 pt-3 pl-1">
            <div className="flex -space-x-2">
              {["🧑‍💼", "👩‍🦱", "🧑‍🎤", "👨‍🔧"].map((e, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-white/10 border-2 border-[#0f172a]"
                >
                  {e}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              <span className="text-white font-bold">2,400+</span> residents actively using in Koramangala
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pb-2">
          <p className="text-[11px] text-slate-500 font-medium">© 2026 Shelfie Technologies · Built for local commerce</p>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative min-h-screen">
        {/* Mobile brand */}
        <div className="lg:hidden absolute top-6 left-6">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="font-extrabold text-xl tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Shelfie</span>
            <span className="w-2 h-2 rounded-full bg-[var(--brand-500)]"></span>
          </Link>
        </div>

        <div className="w-full max-w-[420px] bg-[var(--bg-surface)] p-8 md:p-10 rounded-[var(--radius-2xl)] border border-[var(--border-sm)] shadow-[var(--shadow-lg)]">
          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight mb-1 text-[var(--text-primary)]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Welcome to Shelfie</h1>
            <p className="text-[var(--text-secondary)] text-sm">Sign in to your inventory and reservation account.</p>
          </div>

          {/* Role tabs */}
          <div className="flex gap-1 p-1 mb-6 bg-[var(--bg-surface-2)] rounded-[var(--radius-lg)] border border-[var(--border-sm)]">
            {(["customer", "shopkeeper"] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 text-xs font-bold rounded-[var(--radius-md)] transition-all ${
                  role === r
                    ? "bg-[var(--bg-surface)] text-[var(--brand-600)] shadow-[var(--shadow-xs)] border border-[var(--border-sm)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {r === "customer" ? "Shopper" : "Merchant"}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {role === "customer" ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Mobile Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="input !py-3 !text-sm focus:border-[var(--brand-500)]"
                  placeholder="+91 98765 43210"
                  required
                />
                <p className="text-xs text-[var(--text-muted)] mt-1.5 font-medium">Used to verify holds at store pickup.</p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Select Your Outlet</label>
                <div className="relative">
                  <select
                    value={shopId}
                    onChange={e => setShopId(e.target.value)}
                    className="input !py-3 !text-sm appearance-none pr-10 cursor-pointer focus:border-[var(--brand-500)]"
                  >
                    {SHOPS.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                  <svg className="w-4 h-4 absolute right-4 top-[50%] -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full !py-3 !text-sm !rounded-[var(--radius-lg)] mt-2 font-bold shadow-sm"
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

          <div className="mt-6 pt-5 border-t border-[var(--border-sm)] text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              {role === "customer" ? (
                <>Are you a shop owner?{" "}
                  <button onClick={() => setRole("shopkeeper")} className="font-bold text-[var(--brand-600)] hover:underline underline-offset-2 transition-colors">
                    Sign in as Merchant
                  </button>
                </>
              ) : (
                <>Looking to shop?{" "}
                  <button onClick={() => setRole("customer")} className="font-bold text-[var(--brand-600)] hover:underline underline-offset-2 transition-colors">
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
