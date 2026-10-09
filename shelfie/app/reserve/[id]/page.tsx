"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { CountdownTimer } from "@/components/CountdownTimer";
import { PremiumLoader } from "@/components/PremiumLoader";

export default function ReservationStatusPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  // Poll every 3 seconds to catch status changes in real time (e.g. COLLECTED or EXPIRED)
  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["reservation", id],
    queryFn: async () => {
      const resp = await fetch(`/api/reserve/${id}`);
      if (!resp.ok) throw new Error("Not found");
      return resp.json();
    },
    refetchInterval: 3000,
  });

  const handleCopyCode = () => {
    if (!res?.pickupCode) return;
    navigator.clipboard.writeText(res.pickupCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const shareData = {
      title: `Shelfie Pickup Pass #${res?.pickupCode}`,
      text: `My pickup pass for ${res?.productName} at ${res?.shopName}. Code: ${res?.pickupCode}`,
      url: window.location.href,
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)]">
        <PremiumLoader text="Retrieving pickup pass..." />
      </div>
    );
  }

  if (!res) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-canvas)] p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface-2)] flex items-center justify-center text-3xl mb-4 border border-[var(--border-sm)]">
          🔍
        </div>
        <h2 className="text-xl font-black font-display text-[var(--text-primary)]">Pass Not Found</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-xs">
          This reservation may have expired or was removed.
        </p>
        <Link href="/" className="btn btn-primary mt-6 !px-6 !py-2.5 !text-sm !font-bold">
          Explore Local Inventory →
        </Link>
      </div>
    );
  }

  const effectiveStatus =
    res.status === "HELD" && new Date(res.expiresAt) < new Date()
      ? "EXPIRED"
      : res.status;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${res.shopName} ${res.shopAddress || ""}`
  )}`;

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col selection:bg-[var(--brand-100)] selection:text-[var(--brand-500)] relative overflow-x-hidden">
      
      {/* ── ATMOSPHERIC AMBIENT BACKDROP (Breaks the flat-void feeling) ── */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        {/* Subtle radial spotlight at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-indigo-100/50 via-purple-50/20 to-transparent blur-3xl opacity-80" />
        {/* Subtle geometric dot grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(var(--text-primary) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* ── TOP UTILITY NAVIGATION BAR ───────────────────────────────── */}
      <header className="relative z-10 border-b border-[var(--border-xs)] bg-[var(--bg-surface)]/80 backdrop-blur-md sticky top-0 shadow-[var(--shadow-xs)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] border border-[var(--border-sm)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-[var(--shadow-xs)]"
            >
              <span>←</span>
              <span className="hidden sm:inline">Back to</span>
              <span>Shelfie Storefront</span>
            </Link>

            <span className="text-[var(--border-sm)] hidden sm:inline">|</span>

            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
              <span>Express Counter Pass</span>
              <span>•</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">#{res.pickupCode}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] border border-[var(--border-sm)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-[var(--shadow-xs)]"
              title="Share pass or copy link"
            >
              <span>↗</span>
              <span>Share Pass</span>
            </button>
          </div>
        </div>
      </header>

      {/* Share Toast */}
      {showShareToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[var(--text-primary)] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl animate-fadeIn flex items-center gap-2">
          <span>✓</span>
          <span>Pickup Pass link copied to clipboard!</span>
        </div>
      )}

      {/* ── RESPONSIVE 2-COLUMN VIEWPORT LAYOUT (Grounds the page on desktop) ── */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* ════════════════════════════════════════════════════════════════
            STATE 1: ACTIVE HOLD (SPLIT SCREEN EXPERIENCE)
           ════════════════════════════════════════════════════════════════ */}
        {effectiveStatus === "HELD" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* ── LEFT DESKTOP COLUMN: CONTEXT, LIVE TIMELINE & DIRECTIONS (lg:col-span-7) ── */}
            <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
              
              {/* Header Hero */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs font-extrabold mb-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Item Locked at Counter</span>
                </div>
                <h1 className="font-display font-black text-2xl sm:text-3xl text-[var(--text-primary)] tracking-tight">
                  Your Shelf Hold is Active
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed max-w-xl">
                  {res.shopName} has physically reserved this item for you. Present your 6-digit code at the checkout counter before the timer expires.
                </p>
              </div>

              {/* Live Pickup Timeline */}
              <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-sm)] p-5 sm:p-6 shadow-[var(--shadow-sm)] space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Live Pickup Progress
                </h3>

                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[var(--border-sm)]">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4 relative">
                    <div className="w-7 h-7 rounded-full bg-[var(--green-bg)] text-[var(--green)] border-2 border-[var(--green-border)] flex items-center justify-center text-xs font-bold shrink-0 z-10">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">Hold Confirmed & Locked</div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Inventory quantity deducted from live shelf to prevent other shoppers from buying it.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 (Active) */}
                  <div className="flex items-start gap-4 relative">
                    <div className="w-7 h-7 rounded-full bg-[var(--brand-500)] text-white shadow-[0_0_12px_var(--brand-glow)] flex items-center justify-center text-xs font-black shrink-0 z-10 animate-pulse">
                      2
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[var(--brand-500)] flex items-center gap-2">
                        <span>Head to {res.shopName}</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--brand-100)] text-[var(--brand-500)]">
                          Active Now
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Walk into the store. Show your 6-digit PIN pass to the shopkeeper.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4 relative opacity-60">
                    <div className="w-7 h-7 rounded-full bg-[var(--bg-surface-2)] text-[var(--text-muted)] border border-[var(--border-md)] flex items-center justify-center text-xs font-bold shrink-0 z-10">
                      3
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">Collect & Pay at Counter</div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Pay ₹{(res.productPrice || 0) * (res.qty || 1)} via UPI or Cash directly to the cashier.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Identity & Navigation Hub */}
              <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-sm)] p-5 sm:p-6 shadow-[var(--shadow-sm)] space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-sm)] flex items-center justify-center text-2xl shrink-0 shadow-[var(--shadow-xs)]">
                      🏬
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-extrabold text-base text-[var(--text-primary)]">
                          {res.shopName}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green-border)]">
                          Verified Partner
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {res.shopAddress}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Store Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[var(--border-xs)]">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary !py-2.5 !text-xs !font-bold !rounded-xl shadow-[var(--shadow-xs)] flex items-center justify-center gap-2"
                  >
                    <span>📍</span>
                    <span>Get Directions in Google Maps</span>
                  </a>

                  {res.shopPhone ? (
                    <a
                      href={`tel:${res.shopPhone}`}
                      className="btn btn-secondary !py-2.5 !text-xs !font-bold !rounded-xl flex items-center justify-center gap-2"
                    >
                      <span>📞</span>
                      <span>Call Store ({res.shopPhone})</span>
                    </a>
                  ) : (
                    <div className="btn btn-secondary !py-2.5 !text-xs !font-bold !rounded-xl opacity-75 cursor-default flex items-center justify-center gap-2">
                      <span>🏪</span>
                      <span>Walk-in Counter Ready</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Zero-Risk Reassurance Note */}
              <div className="p-4 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-xs)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-2">
                  <span className="text-base">🛡️</span>
                  <span><strong>Zero cancellation penalty:</strong> If you don&apos;t arrive in time, the hold expires harmlessly.</span>
                </span>
              </div>

            </div>

            {/* ── RIGHT COLUMN: THE BOARDING PASS TICKET CARD (lg:col-span-5) ── */}
            <div className="lg:col-span-5 order-1 lg:order-2 w-full max-w-md mx-auto">
              
              {/* Ticket Outer Wrapper with Elevation */}
              <div className="bg-[var(--bg-surface)] rounded-[26px] border border-[var(--border-md)] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] overflow-hidden transition-all">
                
                {/* 1. Ticket Header with Live Countdown Banner */}
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-3.5 text-white flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Shelf Hold Clock
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs font-black bg-black/25 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                    <span>⏱️</span>
                    <CountdownTimer
                      expiresAt={res.expiresAt}
                      onExpire={refetch}
                      className="font-mono tracking-wider text-sm"
                    />
                  </div>
                </div>

                {/* 2. Hero 6-Digit PIN Display Area */}
                <div className="p-6 text-center bg-gradient-to-b from-[var(--bg-surface)] via-[var(--bg-surface-2)]/60 to-[var(--bg-surface)]">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">
                    Express Counter PIN
                  </div>

                  {/* Tactile Digit Cells */}
                  <div className="my-4 flex items-center justify-center gap-2 sm:gap-2.5">
                    {res.pickupCode?.split("").map((digit: string, i: number) => (
                      <div
                        key={i}
                        className="w-11 h-14 sm:w-12 sm:h-16 rounded-xl bg-[var(--bg-surface)] border-2 border-[var(--border-md)] shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex items-center justify-center font-mono text-2xl sm:text-3xl font-black text-[var(--text-primary)] transition-transform hover:scale-105"
                      >
                        {digit}
                      </div>
                    ))}
                  </div>

                  {/* Interactive Copy Button */}
                  <button
                    onClick={handleCopyCode}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-[var(--shadow-xs)] ${
                      copied
                        ? "bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green-border)] scale-105"
                        : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-sm)] hover:border-[var(--brand-500)]"
                    }`}
                  >
                    <span>{copied ? "✓ Copied PIN to Clipboard" : "📋 Tap to Copy PIN"}</span>
                  </button>

                  {/* Retail Scanner Barcode Simulation */}
                  <div className="mt-5 pt-4 border-t border-[var(--border-xs)] flex flex-col items-center">
                    <div className="h-8 w-52 flex items-stretch justify-center gap-[3px] opacity-75">
                      <div className="w-[3px] bg-current" />
                      <div className="w-[1px] bg-current" />
                      <div className="w-[4px] bg-current" />
                      <div className="w-[1px] bg-current" />
                      <div className="w-[2px] bg-current" />
                      <div className="w-[4px] bg-current" />
                      <div className="w-[1px] bg-current" />
                      <div className="w-[5px] bg-current" />
                      <div className="w-[2px] bg-current" />
                      <div className="w-[3px] bg-current" />
                      <div className="w-[1px] bg-current" />
                      <div className="w-[4px] bg-current" />
                      <div className="w-[2px] bg-current" />
                      <div className="w-[1px] bg-current" />
                      <div className="w-[3px] bg-current" />
                    </div>
                    <span className="font-mono text-[9px] text-[var(--text-muted)] tracking-[0.3em] mt-1.5 font-bold">
                      HOLD #{res.id?.slice(-8).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* 3. Authentic Ticket Perforated Divider (Dual Notches) */}
                <div className="relative flex items-center justify-between px-0 my-[-1px]">
                  <div className="w-5 h-10 rounded-r-full bg-[var(--bg-canvas)] border-r border-t border-b border-[var(--border-md)] -ml-px shadow-inner" />
                  <div className="flex-1 border-b-2 border-dashed border-[var(--border-md)] mx-3" />
                  <div className="w-5 h-10 rounded-l-full bg-[var(--bg-canvas)] border-l border-t border-b border-[var(--border-md)] -mr-px shadow-inner" />
                </div>

                {/* 4. Ticket Lower Section: Product & Payment Breakdown */}
                <div className="p-6 space-y-5 bg-[var(--bg-surface)]">
                  
                  {/* Product Details */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface-2)] flex items-center justify-center text-3xl shrink-0 border border-[var(--border-sm)] shadow-[var(--shadow-xs)]">
                      {res.productEmoji || "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-black text-base text-[var(--text-primary)] truncate">
                        {res.productName}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Qty: <strong className="text-[var(--text-primary)]">{res.qty}</strong> · ₹{res.productPrice} each
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Pay at Counter</div>
                      <div className="font-display font-black text-xl text-[var(--brand-500)]">
                        ₹{(res.productPrice || 0) * (res.qty || 1)}
                      </div>
                    </div>
                  </div>

                  {/* Payment Reassurance Box */}
                  <div className="p-3.5 rounded-xl bg-[var(--green-bg)] border border-[var(--green-border)] flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--green)] flex items-center gap-1.5">
                      <span>✓ Pay at Counter</span>
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                      Cash or UPI accepted
                    </span>
                  </div>

                  {/* Pass Instruction Footer */}
                  <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
                    Show this pass on your phone screen when you arrive at the store counter.
                  </p>

                </div>
              </div>

            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STATE 2: COLLECTED / FULFILLED (CELEBRATION DIGITAL RECEIPT)
           ════════════════════════════════════════════════════════════════ */}
        {effectiveStatus === "COLLECTED" && (
          <div className="max-w-xl mx-auto bg-[var(--bg-surface)] rounded-[26px] border border-[var(--border-md)] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] p-6 sm:p-10 text-center space-y-6 animate-scaleIn">
            
            <div className="w-20 h-20 bg-[var(--green-bg)] text-[var(--green)] rounded-full flex items-center justify-center mx-auto border-2 border-[var(--green-border)] shadow-[var(--shadow-md)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--green)] bg-[var(--green-bg)] px-3 py-1 rounded-full border border-[var(--green-border)]">
                Handover Confirmed
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-display text-[var(--text-primary)] mt-3">
                Order Collected & Paid!
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 max-w-sm mx-auto">
                Thank you for shopping local and supporting <strong>{res.shopName}</strong>.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-[var(--bg-surface-2)] p-5 rounded-2xl border border-[var(--border-sm)] text-left space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Item:</span>
                <span className="font-bold text-[var(--text-primary)]">{res.productName}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Quantity:</span>
                <span className="font-bold text-[var(--text-primary)]">{res.qty} Units</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Store:</span>
                <span className="font-bold text-[var(--text-primary)]">{res.shopName}</span>
              </div>
              <div className="pt-3 border-t border-[var(--border-sm)] flex justify-between items-baseline">
                <span className="font-bold text-sm text-[var(--text-primary)]">Total Paid:</span>
                <span className="font-black text-2xl text-[var(--green)] font-display">
                  ₹{((res.productPrice || 0) * (res.qty || 1)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/"
                className="btn btn-primary flex-1 !py-3.5 !text-sm !font-bold !rounded-xl shadow-[var(--shadow-md)]"
              >
                Explore More Local Stores →
              </Link>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STATE 3: EXPIRED / CANCELLED
           ════════════════════════════════════════════════════════════════ */}
        {(effectiveStatus === "EXPIRED" || effectiveStatus === "CANCELLED") && (
          <div className="max-w-md mx-auto bg-[var(--bg-surface)] rounded-[26px] border border-[var(--border-md)] shadow-[var(--shadow-xl)] p-6 sm:p-10 text-center space-y-6 animate-scaleIn">
            
            <div className="w-20 h-20 bg-[var(--bg-surface-2)] text-[var(--text-muted)] rounded-full flex items-center justify-center mx-auto border-2 border-[var(--border-md)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface-2)] px-3 py-1 rounded-full border border-[var(--border-sm)]">
                Hold Window Closed
              </span>
              <h2 className="text-2xl font-black font-display text-[var(--text-primary)] mt-3">
                Hold Expired
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-xs mx-auto leading-relaxed">
                Because this 45-minute hold wasn&apos;t claimed at the counter, <strong>{res.productName}</strong> was safely returned to {res.shopName}&apos;s shelf.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="btn btn-primary w-full !py-3.5 !text-sm !font-bold !rounded-xl"
              >
                Find Available Items Nearby →
              </Link>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
