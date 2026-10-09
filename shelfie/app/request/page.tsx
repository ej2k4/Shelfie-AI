"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

function RequestContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shopId = searchParams.get("s");
  const inventoryId = searchParams.get("i");

  const [phone, setPhone] = useState("+91");
  const [qty, setQty] = useState(1);
  const [eta, setEta] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);

  if (!shopId || !inventoryId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-canvas)]">
        <div className="card max-w-md w-full text-center space-y-6 py-12 bg-[var(--bg-surface)] border border-[var(--border-sm)] shadow-[var(--shadow-md)]">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-sm)] flex items-center justify-center text-3xl mx-auto">
            🔍
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Item Request Not Found</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-xs mx-auto">
              This request link is missing item or shop information. Please select an item from local inventory.
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

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, inventoryId, qty, phone, etaMinutes: eta }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request");
      
      setSuccess(data);
      setTimeout(() => {
        router.push(`/request/${data.requestId}`);
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
          <div className="w-20 h-20 bg-orange-500/10 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2 border border-orange-500/20">
             <div className="pulse-dot orange !w-6 !h-6"></div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Request Sent!</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Pinging the shopkeeper on WhatsApp...</p>
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

      <div className="card max-w-md w-full bg-[var(--bg-surface)] border border-orange-500/30 shadow-[var(--shadow-xl)]">
        <div className="flex items-center gap-3 mb-2">
          <span className="badge badge-orange font-semibold">Ask Shopkeeper</span>
        </div>
        <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Request Item</h1>
        <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">
          This item is currently out of stock on the shelf, but the shop might have it in the back room. 
          We'll ping the shopkeeper on WhatsApp right now.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-3.5 rounded-xl mb-6 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleRequest} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">Phone Number</label>
            <input 
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+91..." required pattern="^\+\d{10,15}$" className="input focus:border-orange-500"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1.5">We'll notify you when the shopkeeper responds.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">Quantity</label>
              <select 
                value={qty} onChange={e => setQty(Number(e.target.value))}
                className="input focus:border-orange-500 appearance-none bg-[var(--bg-surface)]"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">My ETA</label>
              <select 
                value={eta} onChange={e => setEta(Number(e.target.value))}
                className="input focus:border-orange-500 appearance-none bg-[var(--bg-surface)]"
              >
                <option value={5}>5 mins</option>
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full justify-center mt-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-[var(--radius-lg)] font-bold text-sm cursor-pointer transition-all hover:opacity-95 shadow-md py-3.5 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Ping Shopkeeper"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RequestPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <RequestContent />
    </Suspense>
  );
}
