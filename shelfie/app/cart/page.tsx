"use client";

import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function CartPage() {
  const { items, removeItem, clearCart, total, isHydrated } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  
  const [phone, setPhone] = useState(user?.phone || "+91");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);

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
          phone,
          items: items.map(i => ({
            shopId: i.shopId,
            inventoryId: i.inventoryId,
            qty: i.qty,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Some items could not be reserved");
      
      setSuccess(true);
      clearCart();
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isHydrated) return null;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-canvas)]">
        <div className="surface max-w-md w-full text-center space-y-6 py-12 shadow-[var(--shadow-xl)] border border-[var(--border-sm)]">
          <div className="w-20 h-20 bg-[var(--green-bg)] text-[var(--green)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--green-border)]">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Hold Confirmed!</h2>
          <p className="text-[var(--text-secondary)] text-sm max-w-xs mx-auto">
            Your items are held at the merchant counters. You can find your 6-digit pickup codes in your Active Holds on the home page.
          </p>
          <div className="pt-2">
            <Link href="/" className="btn btn-primary !rounded-[var(--radius-lg)] !px-8 !py-3">
              Go to Active Holds
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] pb-24">
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
              <h1 className="text-sm font-bold text-[var(--text-secondary)]">Your Hold Bag</h1>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--brand-100)] text-[var(--brand-500)] border border-[var(--brand-border)]">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </span>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto w-full flex-1 px-4 sm:px-6 pt-8">
        {items.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-4xl border border-[var(--border-sm)] shadow-[var(--shadow-xs)]">
              🛒
            </div>
            <h3 className="text-2xl font-bold mb-2 tracking-tight text-[var(--text-primary)]">Your bag is empty</h3>
            <p className="max-w-[320px] text-[var(--text-secondary)] mb-8 text-sm">
              Explore local stores in your neighbourhood and reserve items for instant counter pickup.
            </p>
            <Link href="/" className="btn btn-primary !rounded-[var(--radius-lg)] !px-8 !py-3">
              Explore items nearby
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Store Groupings & Items */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
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
                  <h3 className="font-bold text-lg text-[var(--text-primary)]">Order Summary</h3>
                  <span className="text-xs font-bold text-[var(--green)] bg-[var(--green-bg)] px-2 py-0.5 rounded-full border border-[var(--green-border)]">
                    Hold at Counter
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
                    <span className="font-bold text-base text-[var(--text-primary)]">Total to Pay at Store</span>
                    <span className="font-black text-2xl text-[var(--brand-500)] font-display">₹{total}</span>
                  </div>
                </div>

                {error && (
                  <div className="notification-banner border-[var(--red-border)] bg-[var(--red-bg)] text-[var(--red)] text-xs font-semibold p-3 rounded-lg flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleCheckout} className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 text-[var(--text-secondary)]">
                      Customer Phone Number
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
                      Your 6-digit pickup code will be generated for this mobile number.
                    </p>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="btn btn-primary w-full py-3.5 text-base font-bold shadow-[var(--shadow-md)] mt-2"
                  >
                    {loading ? "Confirming Holds..." : `Hold ${totalItems} ${totalItems === 1 ? 'Item' : 'Items'} Now`}
                  </button>
                </form>

                {/* Trust guarantee */}
                <div className="bg-[var(--bg-surface-2)] rounded-[var(--radius-md)] p-3 border border-[var(--border-xs)] space-y-2 text-[11px] text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--green)]">✓</span>
                    <span>No advance payment · Pay physically at counter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--brand-500)]">⏱</span>
                    <span>45-minute guaranteed hold upon confirmation</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
