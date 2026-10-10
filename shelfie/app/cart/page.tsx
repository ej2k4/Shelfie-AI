"use client";

import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CountdownTimer } from "@/components/CountdownTimer";
import { PremiumLoader } from "@/components/PremiumLoader";

function CartContent() {
  const { items, removeItem, clearCart, total, isHydrated } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initialTab = searchParams.get("tab") === "reservations" ? "reservations" : "cart";
  const [activeTab, setActiveTab] = useState<"cart" | "reservations">(initialTab);
  
  const [phone, setPhone] = useState(user?.phone || "+91");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmedHolds, setConfirmedHolds] = useState<any[] | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Sync phone from user or localStorage
  useEffect(() => {
    if (user?.phone) {
      setPhone(user.phone);
    } else if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shelfie_last_phone");
      if (saved) setPhone(saved);
    }
  }, [user]);

  // Read stored reservation IDs from localStorage
  const getStoredIds = (): string[] => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("shelfie_my_reservations") || "[]");
    } catch {
      return [];
    }
  };

  const activeCustomerPhone = user?.phone || (typeof window !== "undefined" ? localStorage.getItem("shelfie_last_phone") : null) || "";
  const storedIds = getStoredIds();

  // Query reservations by customer phone or stored IDs
  const { data: resData, isLoading: resLoading, refetch: refetchReservations } = useQuery({
    queryKey: ["customer-reservations", activeCustomerPhone, storedIds.join(",")],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCustomerPhone && activeCustomerPhone.length >= 7) {
        params.set("phone", activeCustomerPhone);
      }
      if (storedIds.length > 0) {
        params.set("ids", storedIds.join(","));
      }
      if (!params.has("phone") && !params.has("ids")) {
        return { reservations: [] };
      }
      const res = await fetch(`/api/reservations?${params.toString()}`);
      if (!res.ok) return { reservations: [] };
      return res.json();
    },
    enabled: !!activeCustomerPhone || storedIds.length > 0,
    refetchInterval: 5000,
  });

  const allReservations: any[] = resData?.reservations || [];
  const activeReservations = allReservations.filter((r) => r.status === "HELD");
  const pastReservations = allReservations.filter((r) => r.status !== "HELD");

  // Automatically switch to reservations tab if cart is empty but active holds exist
  useEffect(() => {
    if (isHydrated && items.length === 0 && activeReservations.length > 0 && !searchParams.get("tab") && !confirmedHolds) {
      setActiveTab("reservations");
    }
  }, [isHydrated, items.length, activeReservations.length, searchParams, confirmedHolds]);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm("Are you sure you want to release this shelf hold back to the store?")) return;
    setCancellingId(reservationId);
    try {
      const res = await fetch(`/api/reserve/${reservationId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: activeCustomerPhone }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Could not cancel reservation");
      } else {
        refetchReservations();
        queryClient.invalidateQueries({ queryKey: ["customer-reservations"] });
      }
    } catch {
      alert("Network error cancelling reservation");
    } finally {
      setCancellingId(null);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/reserve/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          items: items.map(i => ({
            shopId: i.shopId,
            inventoryId: i.inventoryId,
            qty: i.qty,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Some items could not be reserved");
      
      const newReservations = data.reservations || [];

      // Save phone and reservation IDs to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("shelfie_last_phone", phone.trim());
        const existing = getStoredIds();
        const newIds = newReservations.map((r: any) => r.reservationId);
        const combined = Array.from(new Set([...newIds, ...existing]));
        localStorage.setItem("shelfie_my_reservations", JSON.stringify(combined));
      }

      setConfirmedHolds(newReservations);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["customer-reservations"] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isHydrated) return null;

  // ── CONFIRMATION SCREEN (IMMEDIATELY DISPLAY CODES) ───────────
  if (confirmedHolds && confirmedHolds.length > 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-6 animate-scaleIn">
          {/* Success Banner */}
          <div className="bg-[var(--bg-surface)] border border-[var(--green-border)] rounded-3xl p-6 sm:p-8 text-center shadow-[var(--shadow-xl)] relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center text-3xl mx-auto mb-4 border border-[var(--green-border)] shadow-xs">
              ✓
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green-border)] mb-2 uppercase tracking-wider">
              Stock Reserved At Counter
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Your 6-Digit Pickup Codes
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto mt-2 leading-relaxed">
              Show your 6-digit code at the store counter. Pay physically when you collect your items.
            </p>
          </div>

          {/* Cards for each confirmed reservation */}
          <div className="space-y-4">
            {confirmedHolds.map((r: any, idx: number) => (
              <div
                key={r.reservationId || idx}
                className="bg-[var(--bg-surface)] border border-[var(--border-md)] rounded-2xl p-5 shadow-[var(--shadow-md)] space-y-4"
              >
                {/* Store & Item Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-sm)] flex items-center justify-center text-2xl shrink-0">
                      {r.imageEmoji || "📦"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                        {r.productName}
                      </h3>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Qty: <span className="font-bold text-[var(--text-primary)]">{r.qty}</span> · To Pay: <span className="font-bold text-[var(--brand-600)]">₹{r.productPrice * r.qty}</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1 truncate">
                        <span>🏬</span>
                        <span className="font-semibold text-[var(--text-secondary)]">{r.shopName}</span>
                        {r.shopAddress && <span>· {r.shopAddress}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-[10px] font-bold uppercase text-[var(--brand-600)] bg-[var(--brand-50)] px-2 py-0.5 rounded-md border border-[var(--brand-100)]">
                      Hold Active
                    </div>
                    <div className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
                      <CountdownTimer expiresAt={r.expiresAt} /> left
                    </div>
                  </div>
                </div>

                {/* 6-DIGIT CODE HERO BOX */}
                <div className="bg-gradient-to-r from-[var(--brand-50)] to-[var(--bg-surface-2)] border-2 border-[var(--brand-400)] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--brand-700)] text-center sm:text-left">
                      Pickup PIN Code (Show at Counter)
                    </div>
                    <div className="font-mono text-3xl sm:text-4xl font-black text-[var(--brand-600)] tracking-[0.25em] text-center sm:text-left my-0.5">
                      {r.pickupCode}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleCopyCode(r.pickupCode)}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-3)] text-[var(--text-primary)] border border-[var(--border-sm)] shadow-[var(--shadow-xs)] transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>{copiedCode === r.pickupCode ? "✓" : "📋"}</span>
                      <span>{copiedCode === r.pickupCode ? "Copied!" : "Copy PIN"}</span>
                    </button>
                    <Link
                      href={`/reserve/${r.reservationId}`}
                      className="flex-1 sm:flex-none btn btn-primary !px-4 !py-2.5 !text-xs !font-bold !rounded-xl text-center whitespace-nowrap"
                    >
                      Open Pass →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Navigation */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => {
                setConfirmedHolds(null);
                setActiveTab("reservations");
              }}
              className="w-full sm:w-1/2 py-3.5 px-4 rounded-xl font-bold text-xs bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] text-[var(--text-primary)] border border-[var(--border-sm)] shadow-[var(--shadow-xs)] transition-all text-center"
            >
              🎟️ View All My Active Holds
            </button>
            <Link
              href="/"
              className="w-full sm:w-1/2 btn btn-primary !py-3.5 !text-xs !font-bold !rounded-xl text-center"
            >
              🛍️ Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN BAG & RESERVATIONS INTERFACE ───────────────────────────
  // Group items by shop
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.shopId]) {
      acc[item.shopId] = { shopName: item.shopName, items: [], total: 0 };
    }
    acc[item.shopId].items.push(item);
    acc[item.shopId].total += item.price * item.qty;
    return acc;
  }, {} as Record<string, { shopName: string, items: typeof items, total: number }>);

  const shopGroups = Object.values(groupedItems);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] pb-24 text-[var(--text-primary)]">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 border-b border-[var(--border-sm)] bg-[var(--bg-surface)] sticky top-0 z-20 flex items-center justify-between shadow-[var(--shadow-xs)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-surface-3)] transition-colors border border-[var(--border-xs)]"
            title="Go back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Link href="/" className="font-display font-extrabold text-base tracking-tight text-[var(--text-primary)]">
                shelfie<span className="text-[var(--brand-500)]">.</span>
              </Link>
              <span className="text-[var(--border-md)]">/</span>
              <h1 className="text-sm font-bold text-[var(--text-secondary)]">My Bag & Reservations</h1>
            </div>
          </div>
        </div>

        {/* Top Tab Switcher */}
        <div className="flex items-center gap-1 bg-[var(--bg-surface-2)] p-1 rounded-xl border border-[var(--border-sm)]">
          <button
            onClick={() => setActiveTab("cart")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "cart"
                ? "bg-[var(--bg-surface)] text-[var(--brand-600)] shadow-[var(--shadow-xs)] border border-[var(--border-xs)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>🛍️ Bag</span>
            {items.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[var(--brand-500)] text-white text-[10px] flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("reservations")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "reservations"
                ? "bg-[var(--bg-surface)] text-[var(--brand-600)] shadow-[var(--shadow-xs)] border border-[var(--border-xs)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>🎟️ Holds & Codes</span>
            {activeReservations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[var(--green)] text-white text-[10px]">
                {activeReservations.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── TAB 1: RESERVATIONS & CODES ────────────────────────────── */}
      {activeTab === "reservations" && (
        <div className="max-w-4xl mx-auto w-full flex-1 px-4 sm:px-6 pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)]">
                Active Reservations & Pickup PINs
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Present your 6-digit PIN at the store counter to collect items and pay physically.
              </p>
            </div>
            <button
              onClick={() => refetchReservations()}
              className="text-xs font-bold text-[var(--brand-600)] hover:underline flex items-center gap-1"
            >
              <span>↻</span>
              <span>Refresh</span>
            </button>
          </div>

          {resLoading && allReservations.length === 0 ? (
            <div className="py-20 flex justify-center">
              <PremiumLoader text="Retrieving your reservation passes..." />
            </div>
          ) : activeReservations.length === 0 ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-sm)] rounded-3xl p-10 text-center max-w-md mx-auto shadow-[var(--shadow-xs)] space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center text-3xl mx-auto border border-[var(--brand-100)]">
                🎟️
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">No Active Reservations</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  When you hold items from local stores or your bag, your 6-digit pickup passes and countdown timers will appear right here.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab("cart")}
                  className="btn btn-primary !px-6 !py-2.5 !text-xs !font-bold !rounded-xl"
                >
                  {items.length > 0 ? "Review Items in Bag →" : "Explore Nearby Items →"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeReservations.map((r: any) => (
                <div
                  key={r.id}
                  className="bg-[var(--bg-surface)] border-2 border-[var(--brand-200)] hover:border-[var(--brand-400)] rounded-3xl p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all space-y-4"
                >
                  {/* Top Bar: Store & Status */}
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-xs)]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] animate-ping" />
                      <span className="text-xs font-bold text-[var(--green)] uppercase tracking-wider">
                        Active Shelf Hold
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">•</span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        🏬 {r.shopName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--brand-600)] bg-[var(--brand-50)] px-2.5 py-1 rounded-lg border border-[var(--brand-100)]">
                      <span>⏱</span>
                      <CountdownTimer expiresAt={r.expiresAt} />
                      <span className="text-[10px] font-normal text-[var(--brand-500)]">left</span>
                    </div>
                  </div>

                  {/* Main Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Item Details */}
                    <div className="md:col-span-6 flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-sm)] flex items-center justify-center text-3xl shrink-0">
                        {r.imageEmoji || "📦"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-sm text-[var(--text-primary)] truncate">
                          {r.productName}
                        </h4>
                        <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                          Qty: <span className="font-bold text-[var(--text-primary)]">{r.qty}</span> · Price: <span className="font-bold text-[var(--brand-600)]">₹{r.productPrice * r.qty}</span>
                        </div>
                        {r.shopAddress && (
                          <div className="text-[11px] text-[var(--text-muted)] mt-1 truncate">
                            📍 {r.shopAddress}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* HERO 6-DIGIT CODE DISPLAY */}
                    <div className="md:col-span-6 bg-gradient-to-r from-[var(--brand-50)] to-[var(--bg-surface-2)] border border-[var(--brand-300)] rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
                          Counter Pickup PIN
                        </div>
                        <div className="font-mono text-2xl sm:text-3xl font-black text-[var(--brand-600)] tracking-[0.2em] my-0.5">
                          {r.pickupCode}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyCode(r.pickupCode)}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-3)] text-[var(--text-primary)] border border-[var(--border-sm)] shadow-[var(--shadow-xs)] transition-all flex items-center gap-1"
                          title="Copy pickup code"
                        >
                          <span>{copiedCode === r.pickupCode ? "✓" : "📋"}</span>
                          <span>{copiedCode === r.pickupCode ? "Copied" : "Copy"}</span>
                        </button>
                        <Link
                          href={`/reserve/${r.id}`}
                          className="btn btn-primary !px-3.5 !py-2 !text-xs !font-bold !rounded-xl whitespace-nowrap"
                        >
                          Pass →
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-xs)] text-xs text-[var(--text-muted)]">
                    <span>Present PIN at counter when collecting</span>
                    <button
                      onClick={() => handleCancelReservation(r.id)}
                      disabled={cancellingId === r.id}
                      className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--red)] transition-colors disabled:opacity-50"
                    >
                      {cancellingId === r.id ? "Cancelling..." : "Cancel Hold"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Past Reservations (if any) */}
          {pastReservations.length > 0 && (
            <div className="pt-6 border-t border-[var(--border-sm)] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Completed & Past Holds ({pastReservations.length})
              </h3>
              <div className="space-y-2">
                {pastReservations.map((r: any) => (
                  <div
                    key={r.id}
                    className="bg-[var(--bg-surface)] border border-[var(--border-xs)] rounded-2xl p-3.5 flex items-center justify-between text-xs opacity-75"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{r.imageEmoji || "📦"}</span>
                      <div>
                        <span className="font-bold text-[var(--text-primary)]">{r.productName}</span>
                        <span className="text-[var(--text-muted)] ml-2">at {r.shopName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        r.status === "COLLECTED"
                          ? "bg-[var(--green-bg)] text-[var(--green)]"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {r.status}
                      </span>
                      <span className="font-mono text-xs font-bold text-[var(--text-muted)]">
                        #{r.pickupCode}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: CURRENT BAG ────────────────────────────────────── */}
      {activeTab === "cart" && (
        <div className="max-w-6xl mx-auto w-full flex-1 px-4 sm:px-6 pt-6">
          {items.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center">
              <div className="w-20 h-20 mb-4 rounded-3xl bg-[var(--bg-surface)] flex items-center justify-center text-3xl border border-[var(--border-sm)] shadow-[var(--shadow-xs)]">
                🛒
              </div>
              <h3 className="text-xl font-bold mb-1.5 tracking-tight text-[var(--text-primary)]">Your bag is empty</h3>
              <p className="max-w-[320px] text-[var(--text-secondary)] mb-6 text-xs leading-relaxed">
                Explore local stores in your neighbourhood and reserve items for instant counter pickup.
              </p>
              <div className="flex items-center gap-3">
                <Link href="/" className="btn btn-primary !rounded-xl !px-6 !py-2.5 !text-xs !font-bold">
                  Explore items nearby
                </Link>
                {activeReservations.length > 0 && (
                  <button
                    onClick={() => setActiveTab("reservations")}
                    className="btn btn-secondary !rounded-xl !px-6 !py-2.5 !text-xs !font-bold"
                  >
                    View Active Holds ({activeReservations.length})
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Store Groupings & Items */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                    Pickup Locations ({shopGroups.length})
                  </h2>
                  <button
                    onClick={clearCart}
                    className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--red)] transition-colors"
                  >
                    Clear Bag
                  </button>
                </div>

                {shopGroups.map((group, idx) => (
                  <div key={idx} className="surface !p-0 overflow-hidden border border-[var(--border-sm)] shadow-[var(--shadow-sm)]">
                    {/* Shop header */}
                    <div className="bg-[var(--bg-surface-2)] px-5 py-3.5 flex items-center justify-between border-b border-[var(--border-sm)]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--bg-surface)] border border-[var(--border-sm)] shadow-[var(--shadow-xs)] flex items-center justify-center text-base shrink-0">
                          🏬
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-[var(--text-primary)]">{group.shopName}</h3>
                          <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                            Pickup Station {idx + 1} · Ready in ~15 mins
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-sm)]">
                        {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    
                    {/* Item list */}
                    <div className="divide-y divide-[var(--border-xs)] px-5">
                      {group.items.map(item => (
                        <div key={item.inventoryId} className="py-4 flex gap-4 items-center">
                          <div className="text-2xl bg-[var(--bg-surface-2)] w-14 h-14 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 border border-[var(--border-sm)]">
                            {item.imageEmoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{item.productName}</h4>
                            <div className="text-xs font-medium text-[var(--text-secondary)] mt-1">
                              ₹{item.price} <span className="opacity-70">× {item.qty}</span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                            <div className="font-bold text-base text-[var(--text-primary)]">
                              ₹{item.price * item.qty}
                            </div>
                            <button 
                              onClick={() => removeItem(item.inventoryId)} 
                              className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--red)] transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Subtotal */}
                    <div className="bg-[var(--bg-surface)] px-5 py-3 border-t border-[var(--border-sm)] flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-semibold">Store Subtotal</span>
                      <span className="font-bold text-sm text-[var(--text-primary)]">₹{group.total}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Sticky Summary & Checkout */}
              <div className="lg:col-span-5 sticky top-24">
                <div className="surface border border-[var(--border-sm)] shadow-[var(--shadow-md)] p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-[var(--border-xs)] pb-4">
                    <h3 className="font-bold text-base text-[var(--text-primary)]">Hold Summary</h3>
                    <span className="text-xs font-bold text-[var(--green)] bg-[var(--green-bg)] px-2.5 py-0.5 rounded-full border border-[var(--green-border)]">
                      Instant Counter Hold
                    </span>
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Total Items</span>
                      <span className="font-semibold text-[var(--text-primary)]">{totalItems}</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Store Locations</span>
                      <span className="font-semibold text-[var(--text-primary)]">{shopGroups.length}</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Shelf Hold Fee</span>
                      <span className="font-bold text-[var(--green)]">FREE</span>
                    </div>
                    <div className="border-t border-[var(--border-sm)] pt-3 flex justify-between items-baseline">
                      <span className="font-bold text-sm text-[var(--text-primary)]">Total to Pay at Store</span>
                      <span className="font-black text-2xl text-[var(--brand-500)] font-display">₹{total}</span>
                    </div>
                  </div>

                  {error && (
                    <div className="notification-banner border-[var(--red-border)] bg-[var(--red-bg)] text-[var(--red)] text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleCheckout} className="space-y-4 pt-1">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-[var(--text-secondary)]">
                        Customer Mobile Number
                      </label>
                      <input 
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+91..."
                        required
                        pattern="^\+\d{10,15}$"
                        className="input w-full text-sm font-semibold"
                      />
                      <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                        Your 6-digit pickup PINs will be generated and saved for this mobile number.
                      </p>
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="btn btn-primary w-full py-3.5 text-sm font-bold shadow-[var(--shadow-md)] mt-2"
                    >
                      {loading ? "Generating Pickup Codes..." : `Hold ${totalItems} ${totalItems === 1 ? 'Item' : 'Items'} & Get Codes`}
                    </button>
                  </form>

                  {/* Trust guarantee */}
                  <div className="bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] p-3.5 border border-[var(--border-xs)] space-y-2 text-[11px] text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--green)]">✓</span>
                      <span>No advance payment · Pay physically at counter</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--brand-500)]">⏱</span>
                      <span>45-minute guaranteed shelf lock upon confirmation</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
          <PremiumLoader text="Loading your bag & reservations..." />
        </div>
      }
    >
      <CartContent />
    </Suspense>
  );
}
