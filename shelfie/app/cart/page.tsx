"use client";

import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
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
        <div className="surface max-w-md w-full text-center space-y-6 py-12">
          <div className="w-20 h-20 bg-[var(--status-green-bg)] text-[var(--status-green)] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Hold Confirmed</h2>
          <p className="text-[var(--text-secondary)] meta">You can find your pickup codes in your Active Holds on the home page.</p>
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
      <header className="px-4 py-4 border-b border-[var(--border-light)] bg-[var(--bg-surface)] sticky top-0 z-20 flex items-center shadow-[var(--shadow-xs)]">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <h1 className="text-lg font-bold ml-2">Checkout Summary</h1>
      </header>

      <div className="max-w-2xl mx-auto w-full flex-1 px-4 pt-10">
        {items.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-4xl border border-[var(--border-light)] shadow-[var(--shadow-xs)]">
              🛒
            </div>
            <h3 className="text-2xl font-bold mb-2 tracking-tight">Your bag is empty</h3>
            <p className="max-w-[280px] text-[var(--text-secondary)] mb-8 meta">Looks like you haven't added anything to your bag yet.</p>
            <Link href="/" className="btn btn-primary !rounded-[var(--radius-lg)] !px-8 !py-3">Explore items nearby</Link>
          </div>
        ) : (
          <div className="space-y-8">
            
            <h2 className="text-2xl font-bold px-2 tracking-tight">Hold Summary</h2>

            {shopGroups.map((group, idx) => (
              <div key={idx} className="surface !p-0 overflow-hidden">
                <div className="bg-[var(--bg-subtle)] px-6 py-4 flex items-center gap-4 border-b border-[var(--border-light)]">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-[var(--shadow-xs)] flex items-center justify-center text-lg">
                    🏬
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)]">{group.shopName}</h3>
                    <p className="eyebrow mt-1">Pickup Location {idx + 1} of {shopGroups.length}</p>
                  </div>
                </div>
                
                <div className="divide-y divide-[var(--border-light)] px-6">
                  {group.items.map(item => (
                    <div key={item.inventoryId} className="py-5 flex gap-4 items-center">
                      <div className="text-3xl bg-[var(--bg-subtle)] w-16 h-16 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 border border-[var(--border-light)]">
                        {item.imageEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[1.05rem] truncate">{item.productName}</h4>
                        <div className="text-sm font-semibold text-[var(--text-secondary)] mt-1">₹{item.price} <span className="font-normal opacity-70">x {item.qty}</span></div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                        <div className="font-bold text-lg">₹{item.price * item.qty}</div>
                        <button onClick={() => removeItem(item.inventoryId)} className="text-[13px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--status-red)] transition-colors">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-[var(--bg-surface)] px-6 py-4 text-right text-sm border-t border-[var(--border-light)] flex justify-between items-center">
                   <span className="text-[var(--text-secondary)] font-semibold">Subtotal</span>
                   <span className="font-bold text-lg">₹{group.total}</span>
                </div>
              </div>
            ))}

            <div className="border-t border-[var(--border-medium)] pt-10 mt-10 px-2">
              <div className="flex justify-between items-center mb-8 font-bold">
                <span className="text-xl">Total to Pay at Pickup:</span>
                <span className="text-3xl tracking-tight">₹{total}</span>
              </div>

              {error && (
                <div className="notification-banner border-[var(--status-red-border)] bg-[var(--status-red-bg)] text-[var(--status-red)] mb-6 text-sm font-semibold">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleCheckout} className="space-y-6">
                <div>
                  <label className="eyebrow block mb-2">Confirm Identity</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91..."
                    required
                    pattern="^\+\d{10,15}$"
                    className="input"
                  />
                  <p className="meta mt-2 font-medium">Used to verify you at the location.</p>
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn-primary w-full py-4 text-lg mt-2"
                >
                  {loading ? "Confirming..." : `Hold ${items.reduce((s, i) => s + i.qty, 0)} Items Now`}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
