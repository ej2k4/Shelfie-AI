"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SHOPS } from "@/lib/data/shops";
import { CountdownTimer } from "@/components/CountdownTimer";
import { PremiumLoader } from "@/components/PremiumLoader";
import { Suspense } from "react";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("s") || "shop_km_03"; 
  const queryClient = useQueryClient();

  const { data: shop } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: async () => (await fetch(`/api/shop/${shopId}`)).json(),
  });

  const { data: notifs } = useQuery({
    queryKey: ["notifications", shopId],
    queryFn: async () => (await fetch(`/api/shop/${shopId}/notifications`)).json(),
    refetchInterval: 5000,
  });

  const { data: resData } = useQuery({
    queryKey: ["shop-reservations", shopId],
    queryFn: async () => (await fetch(`/api/shop/${shopId}/reservations`)).json(),
    refetchInterval: 5000,
  });

  const { data: requests } = useQuery({
    queryKey: ["requests", shopId],
    queryFn: async () => (await fetch(`/api/shop/${shopId}/requests`)).json(),
    refetchInterval: 5000,
  });

  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyError, setVerifyError] = useState("");
  const [isCounterOpen, setIsCounterOpen] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppReply, setWhatsAppReply] = useState("");
  const [activeTab, setActiveTab] = useState<"requests" | "active" | "completed">("active");

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/pickup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid pickup code");
      return data;
    },
    onSuccess: (data) => {
      setVerifyResult(data);
      setVerifyCode("");
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      queryClient.invalidateQueries({ queryKey: ["shop-reservations", shopId] });
    },
    onError: (err: any) => {
      setVerifyError(err.message);
      setTimeout(() => setVerifyError(""), 4000);
    }
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string, decision: "ACCEPT" | "DECLINE" }) => {
      const res = await fetch(`/api/request/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to respond to request");
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["requests", shopId] });
      queryClient.invalidateQueries({ queryKey: ["notifications", shopId] });
      queryClient.invalidateQueries({ queryKey: ["shop-reservations", shopId] });
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
    },
    onError: (err: any) => {
      alert(`Could not process request: ${err.message}`);
    }
  });

  useEffect(() => {
    if (notifs?.unreadCount > 0) {
      fetch(`/api/shop/${shopId}/notifications`, { method: "PATCH" });
    }
  }, [notifs?.unreadCount, shopId]);

  if (!shop) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
        <PremiumLoader text="Loading merchant terminal..." />
      </div>
    );
  }

  const pendingRequests = requests?.requests?.filter((r: any) => r.status === 'PENDING') || [];
  const activeHolds = resData?.active || [];
  const history = resData?.history || [];
  const totalRevenue = resData?.totalRevenue || 0;

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col selection:bg-[var(--brand-100)] selection:text-[var(--brand-500)]">
      
      {/* ── TOP MERCHANT APP BAR ────────────────────────────────────── */}
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border-sm)] sticky top-0 z-30 shadow-[var(--shadow-xs)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Brand + Store Identity */}
          <div className="flex items-center gap-3.5">
            <Link 
              href="/" 
              className="w-10 h-10 rounded-xl bg-[var(--brand-500)] text-white flex items-center justify-center font-display font-black text-xl shadow-[0_4px_14px_var(--brand-glow)] hover:scale-105 transition-transform"
              title="Shelfie Home"
            >
              S
            </Link>
            
            <div className="h-8 w-px bg-[var(--border-sm)] hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-base sm:text-lg tracking-tight text-[var(--text-primary)]">
                  {shop.name}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green-border)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                  Verified Merchant
                </span>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-0.5 flex items-center gap-2">
                <span>ID: <code className="font-mono text-[var(--text-primary)] font-bold">{shop.shopId}</code></span>
                <span>•</span>
                <span>{shop.area || "Bengaluru"}</span>
              </p>
            </div>
          </div>

          {/* Center: Live Operating Status Switcher */}
          <div className="hidden md:flex items-center gap-2 bg-[var(--bg-surface-2)] p-1 rounded-xl border border-[var(--border-sm)]">
            <button
              onClick={() => setIsCounterOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isCounterOpen 
                  ? "bg-[var(--bg-surface)] text-[var(--green)] shadow-sm border border-[var(--border-xs)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isCounterOpen ? "bg-[var(--green)] animate-ping" : "bg-gray-400"}`} />
              Counter Active
            </button>
            <button
              onClick={() => setIsCounterOpen(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isCounterOpen 
                  ? "bg-[var(--bg-surface)] text-[var(--amber)] shadow-sm border border-[var(--border-xs)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[var(--amber)]" />
              Counter Paused
            </button>
          </div>

          {/* Right: Controls & Navigation */}
          <div className="flex items-center gap-2.5">
            {/* Store Switcher Dropdown */}
            <div className="relative group">
              <select 
                className="appearance-none bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] border border-[var(--border-sm)] rounded-xl pl-3.5 pr-8 py-2 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--brand-500)] cursor-pointer transition-all shadow-[var(--shadow-xs)]"
                value={shopId}
                onChange={(e) => router.push(`/shop/dashboard?s=${e.target.value}`)}
                aria-label="Switch Merchant Store"
              >
                {SHOPS.map(s => (
                  <option key={s.id} value={s.id}>🏬 {s.name}</option>
                ))}
              </select>
              <svg className="w-3.5 h-3.5 absolute right-2.5 top-3 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Inventory Management */}
            <Link
              href={`/shop/inventory?s=${shopId}`}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] border border-[var(--border-sm)] transition-all shadow-[var(--shadow-xs)]"
            >
              <span>📦</span>
              <span>Inventory</span>
            </Link>

            {/* Sound alert toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] border border-[var(--border-sm)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-[var(--shadow-xs)]"
              title={soundEnabled ? "Sound Alerts: ON" : "Sound Alerts: MUTED"}
            >
              {soundEnabled ? "🔔" : "🔕"}
            </button>

            {/* Exit to customer storefront */}
            <Link 
              href="/" 
              className="btn btn-secondary !px-3.5 !py-2 !text-xs !font-bold !rounded-xl"
            >
              Storefront →
            </Link>
          </div>
        </div>
      </header>

      {/* ── MOBILE WORKFLOW TABS ──────────────────────────────────── */}
      <div className="lg:hidden flex border-b border-[var(--border-sm)] bg-[var(--bg-surface)] sticky top-[61px] z-20 shadow-[var(--shadow-xs)]">
        <button 
          onClick={() => setActiveTab("requests")} 
          className={`px-4 py-3.5 text-xs font-bold flex-1 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'requests' 
              ? 'border-[var(--brand-500)] text-[var(--brand-500)]' 
              : 'border-transparent text-[var(--text-secondary)]'
          }`}
        >
          <span>💬 Requests</span>
          {pendingRequests.length > 0 && (
            <span className="bg-[var(--amber)] text-white px-1.5 py-0.2 rounded-full text-[10px]">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab("active")} 
          className={`px-4 py-3.5 text-xs font-bold flex-1 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'active' 
              ? 'border-[var(--brand-500)] text-[var(--brand-500)]' 
              : 'border-transparent text-[var(--text-secondary)]'
          }`}
        >
          <span>🔒 Holds</span>
          {activeHolds.length > 0 && (
            <span className="bg-[var(--brand-500)] text-white px-1.5 py-0.2 rounded-full text-[10px]">
              {activeHolds.length}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab("completed")} 
          className={`px-4 py-3.5 text-xs font-bold flex-1 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'completed' 
              ? 'border-[var(--brand-500)] text-[var(--brand-500)]' 
              : 'border-transparent text-[var(--text-secondary)]'
          }`}
        >
          <span>✓ Fulfilled</span>
          <span className="text-[10px] text-[var(--text-muted)]">({history.length})</span>
        </button>
      </div>

      {/* ── MAIN DASHBOARD CONTAINER ──────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">

        {/* ── ROW 1: SHIFT PERFORMANCE & KPI TILES ───────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          
          {/* KPI 1: Shift Revenue */}
          <div className="surface p-4 sm:p-5 border border-[var(--border-sm)] shadow-[var(--shadow-sm)] hover:border-[var(--border-md)] transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Today&apos;s Revenue
              </span>
              <div className="w-8 h-8 rounded-lg bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center text-sm border border-[var(--green-border)]">
                ₹
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black font-display text-[var(--text-primary)]">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] font-semibold text-[var(--green)] mt-1 flex items-center gap-1">
                <span>✓ Physical counter cash & UPI</span>
              </div>
            </div>
          </div>

          {/* KPI 2: Active Shelf Holds */}
          <div className="surface p-4 sm:p-5 border border-[var(--border-sm)] shadow-[var(--shadow-sm)] hover:border-[var(--border-md)] transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Active Shelf Holds
              </span>
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-100)] text-[var(--brand-500)] flex items-center justify-center text-sm border border-[var(--brand-border)]">
                🔒
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black font-display text-[var(--brand-500)]">
                {activeHolds.length}
              </div>
              <div className="text-[11px] font-semibold text-[var(--text-secondary)] mt-1">
                45-min customer guaranteed shelf
              </div>
            </div>
          </div>

          {/* KPI 3: Inbound Inquiries */}
          <div className="surface p-4 sm:p-5 border border-[var(--border-sm)] shadow-[var(--shadow-sm)] hover:border-[var(--border-md)] transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Shopper Inquiries
              </span>
              <div className="w-8 h-8 rounded-lg bg-[var(--amber-bg)] text-[var(--amber)] flex items-center justify-center text-sm border border-[var(--amber-border)]">
                💬
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black font-display text-[var(--amber)]">
                {pendingRequests.length}
              </div>
              <div className="text-[11px] font-semibold text-[var(--text-secondary)] mt-1">
                Avg counter response: ~28s
              </div>
            </div>
          </div>

          {/* KPI 4: Counter Accuracy */}
          <div className="surface p-4 sm:p-5 border border-[var(--border-sm)] shadow-[var(--shadow-sm)] hover:border-[var(--border-md)] transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Fulfillment Rate
              </span>
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface-2)] text-[var(--text-primary)] flex items-center justify-center text-sm border border-[var(--border-md)]">
                ⚡
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black font-display text-[var(--text-primary)]">
                99.2%
              </div>
              <div className="text-[11px] font-semibold text-[var(--text-muted)] mt-1">
                100% genuine counter pickup
              </div>
            </div>
          </div>

        </section>

        {/* ── ROW 2: TACTILE COUNTER PICKUP VERIFICATION TERMINAL ──────── */}
        <section className="surface p-5 sm:p-6 border border-[var(--border-md)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-md)] bg-gradient-to-r from-[var(--bg-surface)] via-[var(--bg-surface-2)] to-[var(--bg-surface)]">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            
            {/* Terminal Context */}
            <div className="max-w-md">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--brand-100)] text-[var(--brand-500)] text-[10px] font-bold uppercase tracking-wider mb-2 border border-[var(--brand-border)]">
                <span>⚡ Counter POS Mode</span>
              </div>
              <h2 className="font-display font-extrabold text-lg sm:text-xl text-[var(--text-primary)]">
                Customer Pickup Verification
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                When a customer arrives at your counter, ask for their 6-digit Shelfie hold code to verify items and collect payment.
              </p>
              
              {/* Active codes helper */}
              {activeHolds.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-[var(--text-muted)]">Tap to test:</span>
                  {activeHolds.slice(0, 3).map((hold: any) => (
                    <button
                      key={hold.id}
                      onClick={() => setVerifyCode(hold.pickupCode)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--brand-100)] hover:text-[var(--brand-500)] border border-[var(--border-sm)] font-mono text-xs font-bold transition-all shadow-[var(--shadow-xs)]"
                      title={`Fill code for ${hold.productName}`}
                    >
                      #{hold.pickupCode} <span className="opacity-70 font-sans font-normal">({hold.productName?.split(" ")[0]})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Terminal Input & Action Form */}
            <div className="flex-1 max-w-lg lg:ml-auto">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (verifyCode.trim().length === 6) {
                    verifyMutation.mutate(verifyCode.trim());
                  }
                }} 
                className="flex flex-col sm:flex-row items-stretch gap-3"
              >
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    placeholder="● ● ● ● ● ●" 
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    autoFocus
                    className="input w-full !text-center !text-2xl !tracking-[0.25em] !font-mono !font-extrabold !h-14 !rounded-xl !border-[var(--border-md)] focus:!border-[var(--brand-500)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]"
                  />
                  {verifyCode.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => setVerifyCode("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={verifyCode.trim().length !== 6 || verifyMutation.isPending} 
                  className="btn btn-primary !h-14 !px-8 !text-base !font-extrabold !rounded-xl whitespace-nowrap shadow-[0_4px_16px_var(--brand-glow)] disabled:opacity-50 disabled:shadow-none"
                >
                  {verifyMutation.isPending ? "Verifying..." : "Verify & Handover →"}
                </button>
              </form>

              {verifyError && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-[var(--red-bg)] border border-[var(--red-border)] text-[var(--red)] text-xs font-bold text-center animate-shake flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{verifyError}</span>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ── ROW 3: THREE KANBAN ORDER WORKFLOW COLUMNS ─────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
          
          {/* ── COLUMN 1: INBOUND REQUESTS ────────────────────────────── */}
          <div className={`space-y-4 ${activeTab !== 'requests' && 'hidden lg:block'}`}>
            {/* Lane Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--amber-bg)] text-[var(--amber)] flex items-center justify-center text-xs font-bold border border-[var(--amber-border)]">
                  💬
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Inbound Requests</h3>
                  <p className="text-[10.5px] text-[var(--text-muted)] font-medium">Customer shelf availability check</p>
                </div>
              </div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] border border-[var(--amber-border)]">
                {pendingRequests.length}
              </span>
            </div>

            {/* Requests List */}
            <div className="space-y-3 min-h-[460px] flex flex-col">
              {pendingRequests.length === 0 ? (
                <div className="surface flex-1 border-dashed border-[var(--border-sm)] bg-transparent flex flex-col items-center justify-center p-8 text-center text-[var(--text-muted)]">
                  <div className="w-14 h-14 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center text-2xl mb-3 shadow-[var(--shadow-xs)] animate-pulse">
                    📡
                  </div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">Shopper Radar Active</h4>
                  <p className="text-xs max-w-[240px] mt-1 text-[var(--text-secondary)] leading-relaxed">
                    Shoppers within 3 km looking for items in your area will pop up here with instant audio chimes.
                  </p>
                </div>
              ) : (
                pendingRequests.map((req: any) => (
                  <div 
                    key={req.id} 
                    className="surface p-4 border border-[var(--amber-border)] bg-[var(--amber-bg)]/20 shadow-[var(--shadow-sm)] rounded-[var(--radius-xl)] space-y-3.5 hover:shadow-[var(--shadow-md)] transition-all"
                  >
                    {/* Item info */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-13 h-13 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-3xl shrink-0 border border-[var(--border-sm)] shadow-[var(--shadow-xs)]">
                        {req.imageEmoji || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">
                            {req.productName}
                          </h4>
                          <span className="text-xs font-bold text-[var(--text-primary)] shrink-0">
                            ₹{(req.productPrice || 0) * (req.qty || 1)}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                          Qty: <span className="font-bold text-[var(--text-primary)]">{req.qty}</span> · ₹{req.productPrice} each
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-1">
                          Requested {formatDistanceToNow(new Date(req.createdAt))} ago
                        </div>
                      </div>
                    </div>

                    {/* ETA Bar */}
                    <div className="bg-[var(--bg-surface)] px-3 py-2 rounded-lg border border-[var(--border-xs)] flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Customer Arrival ETA:</span>
                      <span className="font-bold text-[var(--amber)] bg-[var(--amber-bg)] px-2 py-0.5 rounded-md border border-[var(--amber-border)]">
                        🚶 {req.etaMinutes || 10} mins away
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2.5 pt-1">
                      <button 
                        onClick={() => respondMutation.mutate({ id: req.id, decision: 'DECLINE' })}
                        disabled={respondMutation.isPending}
                        className="btn btn-secondary !py-2 !px-3 !text-xs !font-bold flex-1"
                      >
                        Decline
                      </button>
                      <button 
                        onClick={() => respondMutation.mutate({ id: req.id, decision: 'ACCEPT' })}
                        disabled={respondMutation.isPending}
                        className="btn btn-primary !py-2 !px-4 !text-xs !font-bold flex-[2] shadow-sm"
                      >
                        ✓ Accept & Hold Item
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── COLUMN 2: ACTIVE HOLDS ─────────────────────────────────── */}
          <div className={`space-y-4 ${activeTab !== 'active' && 'hidden lg:block'}`}>
            {/* Lane Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--brand-100)] text-[var(--brand-500)] flex items-center justify-center text-xs font-bold border border-[var(--brand-border)]">
                  🔒
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Active Shelf Holds</h3>
                  <p className="text-[10.5px] text-[var(--text-muted)] font-medium">Reserved at counter · 45m clock</p>
                </div>
              </div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-[var(--brand-100)] text-[var(--brand-500)] border border-[var(--brand-border)]">
                {activeHolds.length}
              </span>
            </div>

            {/* Holds List */}
            <div className="space-y-3 min-h-[460px] flex flex-col">
              {activeHolds.length === 0 ? (
                <div className="surface flex-1 border-dashed border-[var(--border-sm)] bg-transparent flex flex-col items-center justify-center p-8 text-center text-[var(--text-muted)]">
                  <div className="w-14 h-14 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center text-2xl mb-3 shadow-[var(--shadow-xs)]">
                    ✨
                  </div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">Shelf Space Ready</h4>
                  <p className="text-xs max-w-[240px] mt-1 text-[var(--text-secondary)] leading-relaxed">
                    All reserved items have been picked up. New counter reservations will appear here in real time.
                  </p>
                </div>
              ) : (
                activeHolds.map((hold: any) => (
                  <div 
                    key={hold.id} 
                    className="surface p-0 overflow-hidden border border-[var(--border-sm)] shadow-[var(--shadow-sm)] hover:border-[var(--brand-300)] transition-all rounded-[var(--radius-xl)]"
                  >
                    {/* Top bar with Code and Countdown */}
                    <div className="bg-[var(--bg-surface-2)] px-4 py-2.5 flex items-center justify-between border-b border-[var(--border-sm)]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-[var(--text-primary)] tracking-widest bg-[var(--bg-surface)] px-2.5 py-0.5 rounded-md border border-[var(--border-sm)]">
                          #{hold.pickupCode}
                        </span>
                      </div>
                      
                      <div className="text-[11px] font-bold text-[var(--amber)] bg-[var(--amber-bg)] px-2.5 py-0.5 rounded-md border border-[var(--amber-border)] flex items-center gap-1.5">
                        <span>⏱️</span>
                        <CountdownTimer 
                          expiresAt={hold.expiresAt} 
                          onExpire={() => queryClient.invalidateQueries({ queryKey: ["shop-reservations", shopId] })} 
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-[var(--bg-surface-3)] flex items-center justify-center text-2xl shrink-0 border border-[var(--border-xs)]">
                          {hold.imageEmoji || '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">
                            {hold.productName}
                          </h4>
                          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                            Qty: <span className="font-bold text-[var(--text-primary)]">{hold.qty}</span> · ₹{hold.productPrice}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-sm text-[var(--text-primary)]">
                            ₹{(hold.productPrice || 0) * (hold.qty || 1)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-xs)] text-xs">
                        <span className="font-mono text-[11px] text-[var(--text-muted)] font-medium">
                          📞 {hold.customerPhone || "Walk-in"}
                        </span>
                        
                        {/* Quick verify button on card */}
                        <button
                          onClick={() => {
                            setVerifyCode(hold.pickupCode);
                            verifyMutation.mutate(hold.pickupCode);
                          }}
                          className="btn btn-primary !py-1 !px-3 !text-[11px] !font-bold !rounded-lg"
                        >
                          Verify Pickup
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── COLUMN 3: FULFILLED / COMPLETED ────────────────────────── */}
          <div className={`space-y-4 ${activeTab !== 'completed' && 'hidden lg:block'}`}>
            {/* Lane Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center text-xs font-bold border border-[var(--green-border)]">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Completed Pickups</h3>
                  <p className="text-[10.5px] text-[var(--text-muted)] font-medium">Counter handovers verified today</p>
                </div>
              </div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green-border)]">
                {history.length}
              </span>
            </div>

            {/* History List */}
            <div className="space-y-3 min-h-[460px] flex flex-col">
              {history.length === 0 ? (
                <div className="surface flex-1 border-dashed border-[var(--border-sm)] bg-transparent flex flex-col items-center justify-center p-8 text-center text-[var(--text-muted)]">
                  <div className="w-14 h-14 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center text-2xl mb-3 shadow-[var(--shadow-xs)]">
                    🧾
                  </div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">No Pickups Yet This Shift</h4>
                  <p className="text-xs max-w-[240px] mt-1 text-[var(--text-secondary)] leading-relaxed">
                    Customer handovers will be automatically archived here with receipts and timestamps.
                  </p>
                </div>
              ) : (
                history.map((order: any) => (
                  <div 
                    key={order.id} 
                    className="surface p-3.5 border border-[var(--border-sm)] shadow-[var(--shadow-xs)] rounded-[var(--radius-xl)] flex items-center justify-between gap-3 hover:border-[var(--border-md)] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center text-base shrink-0 border border-[var(--green-border)]">
                        ✓
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                          {order.productName}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {order.qty}x · {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {order.customerPhone || "Walk-in"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-sm text-[var(--text-primary)]">
                        ₹{(order.productPrice || 0) * (order.qty || 1)}
                      </div>
                      <span className="text-[10px] font-bold text-[var(--green)] bg-[var(--green-bg)] px-1.5 py-0.5 rounded border border-[var(--green-border)] inline-block mt-0.5">
                        Fulfilled
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </section>
      </main>

      {/* ── FLOATING WHATSAPP CUSTOMER DISPATCH COMPANION ────────────── */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isWhatsAppOpen ? (
          <button
            onClick={() => setIsWhatsAppOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#128C7E] text-white font-bold text-xs shadow-[0_8px_24px_rgba(18,140,126,0.35)] hover:bg-[#0f7a6d] hover:scale-105 active:scale-95 transition-all"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span>WhatsApp Connect</span>
            {notifs?.notifications?.length > 0 && (
              <span className="px-1.5 py-0.5 bg-white text-[#128C7E] rounded-full text-[10px] font-black">
                {notifs.notifications.length}
              </span>
            )}
          </button>
        ) : (
          <div className="w-[360px] max-w-[90vw] h-[460px] bg-[var(--bg-surface)] border border-[var(--border-md)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-xl)] flex flex-col overflow-hidden animate-scaleIn">
            {/* Header */}
            <div className="bg-[#128C7E] px-4 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                  💬
                </div>
                <div>
                  <h4 className="font-bold text-xs">Customer WhatsApp Line</h4>
                  <p className="text-[10px] text-white/80">Online · Koramangala Hub</p>
                </div>
              </div>
              <button 
                onClick={() => setIsWhatsAppOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#ece5dd] relative">
              <div className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider my-1">
                Direct Shelfie Inquiries
              </div>

              {notifs?.notifications?.map((n: any) => (
                <div 
                  key={n.id} 
                  className="bg-[#dcf8c6] p-3 rounded-2xl rounded-tr-sm shadow-sm text-xs relative max-w-[88%] ml-auto text-[var(--text-primary)]"
                >
                  <div className="font-bold mb-0.5">{n.title}</div>
                  <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{n.body}</div>
                  <div className="text-[9px] text-gray-500 text-right mt-1 font-mono">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}

              {(!notifs?.notifications || notifs.notifications.length === 0) && (
                <div className="text-center py-16 text-gray-500 text-xs font-medium">
                  Awaiting shopper messages...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (whatsAppReply.trim()) {
                  setWhatsAppReply("");
                }
              }}
              className="p-2.5 bg-[var(--bg-surface)] border-t border-[var(--border-sm)] flex gap-2"
            >
              <input 
                type="text" 
                placeholder="Reply to customer..." 
                value={whatsAppReply}
                onChange={(e) => setWhatsAppReply(e.target.value)}
                className="input flex-1 !text-xs !py-2 !h-9"
              />
              <button 
                type="submit" 
                className="px-3 py-1.5 rounded-lg bg-[#128C7E] text-white text-xs font-bold hover:bg-[#0f7a6d]"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── FULL SCREEN COUNTER VERIFICATION SUCCESS MODAL ──────────── */}
      {verifyResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="surface max-w-md w-full p-6 sm:p-8 text-center rounded-[var(--radius-2xl)] border border-[var(--border-md)] shadow-[var(--shadow-xl)] space-y-5 animate-scaleIn">
            
            <div className="w-20 h-20 bg-[var(--green-bg)] text-[var(--green)] rounded-full flex items-center justify-center mx-auto border-2 border-[var(--green-border)] shadow-[var(--shadow-md)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--green)] bg-[var(--green-bg)] px-2.5 py-0.5 rounded-full border border-[var(--green-border)]">
                Hold Verified
              </span>
              <h3 className="text-2xl font-black font-display text-[var(--text-primary)] mt-2">
                Release Item to Customer
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Pickup Code <span className="font-mono font-bold text-[var(--text-primary)]">#{verifyResult.code || verifyCode}</span> confirmed
              </p>
            </div>

            {/* Receipt Summary Box */}
            <div className="bg-[var(--bg-surface-2)] p-4 rounded-xl border border-[var(--border-sm)] text-left space-y-2.5 text-xs">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Customer Mobile:</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">
                  {verifyResult.customerPhone || "Walk-in Counter"}
                </span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Quantity Released:</span>
                <span className="font-bold text-[var(--text-primary)]">{verifyResult.qty} Units</span>
              </div>
              <div className="pt-2 border-t border-[var(--border-sm)] flex justify-between items-baseline">
                <span className="font-bold text-sm text-[var(--text-primary)]">Collect at Counter:</span>
                <span className="font-black text-2xl text-[var(--green)] font-display">
                  ₹{((verifyResult.qty || 1) * (verifyResult.price || 0)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setVerifyResult(null)}
              className="btn btn-primary w-full !py-3.5 !text-base !font-extrabold !rounded-xl shadow-[var(--shadow-md)]"
            >
              ✓ Handover Completed
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ShopDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
        <PremiumLoader text="Loading merchant terminal..." />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
