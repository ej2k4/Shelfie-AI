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
    return <div className="p-8 text-center">Invalid link</div>;
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
        <div className="card max-w-md w-full text-center space-y-6 py-12">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Item Reserved!</h2>
          <p className="text-slate-400">Redirecting to your pickup code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <button onClick={() => router.back()} className="absolute top-6 left-6 btn-ghost !border-none">
        ← Back
      </button>

      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Reserve Item</h1>
        <p className="text-slate-400 mb-8">We will hold this item for 45 minutes.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleReserve} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input 
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91..."
              required
              pattern="^\+\d{10,15}$"
              className="input"
            />
            <p className="text-xs text-slate-500 mt-1">Needed to verify you at pickup.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setQty(Math.max(1, qty-1))} className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">-</button>
              <span className="font-bold text-lg w-8 text-center">{qty}</span>
              <button type="button" onClick={() => setQty(Math.min(5, qty+1))} className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">+</button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full justify-center mt-4"
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
