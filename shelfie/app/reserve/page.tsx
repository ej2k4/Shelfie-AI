"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

function ReserveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shopId = searchParams.get("s");
  const inventoryId = searchParams.get("i");

  const [phone, setPhone] = useState("+91");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);

  if (!shopId || !inventoryId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-canvas)]">
        <div className="card max-w-md w-full text-center space-y-6 py-12 bg-[var(--bg-surface)] border border-[var(--border-sm)] shadow-[var(--shadow-md)]">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-sm)] flex items-center justify-center text-3xl mx-auto">
            🛒
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Reservation Link Expired</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-xs mx-auto">
              This reservation link has missing parameters. Please find the item nearby to reserve it.
            </p>
          </div>
          <button 
            onClick={() => router.push("/")}
            className="btn btn-primary !rounded-[var(--radius-lg)] !px-6 !py-2.5 mx-auto"
          >
            Explore Nearby Items
          </button>
        </div>
      </div>
    );
  }

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, inventoryId, qty, phone }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reserve");
      
      setSuccess(data);
      // Wait a moment then redirect to status page
      setTimeout(() => {
        router.push(`/reserve/${data.reservationId}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-canvas)]">
        <div className="card max-w-md w-full text-center space-y-6 py-12 bg-[var(--bg-surface)] border border-[var(--border-sm)] shadow-[var(--shadow-xl)]">
          <div className="w-20 h-20 bg-[var(--green-bg)] text-[var(--green)] rounded-full flex items-center justify-center mx-auto mb-2 border border-[var(--green-border)]">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Item Reserved!</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Redirecting to your pickup code...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative bg-[var(--bg-canvas)]">
      <button onClick={() => router.back()} className="absolute top-6 left-6 btn btn-secondary !px-4 !py-2 !rounded-full shadow-sm z-10 font-bold">
        ← Back
      </button>

      <div className="card max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-sm)] shadow-[var(--shadow-xl)]">
        <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Reserve Item</h1>
        <p className="text-[var(--text-secondary)] mb-6 text-sm">We will hold this item for 45 minutes at the store counter.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-3.5 rounded-xl mb-6 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleReserve} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">Phone Number</label>
            <input 
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91..."
              required
              pattern="^\+\d{10,15}$"
              className="input"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1.5">Needed to verify you at pickup counter.</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">Quantity</label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setQty(Math.max(1, qty-1))} className="w-10 h-10 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-sm)] text-[var(--text-primary)] font-bold flex items-center justify-center hover:bg-[var(--bg-surface-3)] transition-colors">-</button>
              <span className="font-bold text-lg w-8 text-center text-[var(--text-primary)]">{qty}</span>
              <button type="button" onClick={() => setQty(Math.min(5, qty+1))} className="w-10 h-10 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-sm)] text-[var(--text-primary)] font-bold flex items-center justify-center hover:bg-[var(--bg-surface-3)] transition-colors">+</button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary w-full justify-center mt-4 py-3.5 text-base !rounded-[var(--radius-lg)]"
          >
            {loading ? "Reserving..." : "Confirm Reservation"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ReservePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <ReserveContent />
    </Suspense>
  );
}
