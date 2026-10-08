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
      // For MVP, we bulk create requests by calling the API for each item
      const promises = items.map(item => 
        fetch("/api/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            shopId: item.shopId, 
            inventoryId: item.inventoryId, 
            qty: item.qty, 
            phone 
          }),
        }).then(res => {
          if (!res.ok) throw new Error("Some items could not be reserved");
          return res.json();
        })
      );

      await Promise.all(promises);
      
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
        <div className="card max-w-md w-full text-center space-y-6 py-12">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Items Reserved!</h2>
          <p className="text-slate-400">You can find your pickup codes in your Active Reservations on the home page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-6 bg-slate-900">
      <header className="max-w-2xl mx-auto w-full mb-8 relative flex items-center justify-center">
        <button onClick={() => router.back()} className="absolute left-0 btn-ghost text-sm">← Back</button>
        <h1 className="text-2xl font-bold">Shopping Bag</h1>
      </header>

      <div className="max-w-2xl mx-auto w-full flex-1">
        {items.length === 0 ? (
          <div className="text-center py-20 text-slate-500 space-y-4">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-lg">Your bag is empty.</p>
            <Link href="/" className="btn-primary inline-flex">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.inventoryId} className="card p-4 flex gap-4 items-center">
                  <div className="text-4xl bg-slate-800 w-16 h-16 rounded-xl flex items-center justify-center">
                    {item.imageEmoji}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{item.productName}</h3>
                    <p className="text-sm text-slate-400 mb-1">{item.shopName}</p>
                    <div className="text-sm font-medium text-emerald-400">₹{item.price} x {item.qty}</div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="font-bold text-lg">₹{item.price * item.qty}</div>
                    <button onClick={() => removeItem(item.inventoryId)} className="text-xs text-red-400 hover:bg-red-500/10 px-2 py-1 rounded">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="card p-6 border-indigo-500/30 bg-indigo-500/5">
              <div className="flex justify-between items-center mb-6 text-lg font-bold">
                <span>Total to Pay at Pickup:</span>
                <span className="text-2xl text-emerald-400">₹{total}</span>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleCheckout} className="space-y-4 border-t border-white/5 pt-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Confirm Phone Number</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91..."
                    required
                    pattern="^\+\d{10,15}$"
                    className="input"
                  />
                  <p className="text-xs text-slate-500 mt-1">We'll use this to verify your pickup.</p>
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary w-full justify-center py-3 text-lg mt-4 shadow-lg shadow-indigo-500/20"
                >
                  {loading ? "Reserving..." : `Reserve ${items.reduce((s, i) => s + i.qty, 0)} Items Now`}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
