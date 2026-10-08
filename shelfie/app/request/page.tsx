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

  if (!shopId || !inventoryId) return <div className="p-8 text-center">Invalid link</div>;

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
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
        <div className="card max-w-md w-full text-center space-y-6 py-12">
          <div className="w-20 h-20 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
             <div className="pulse-dot orange !w-6 !h-6"></div>
          </div>
          <h2 className="text-2xl font-bold">Request Sent!</h2>
          <p className="text-slate-400">Pinging the shopkeeper...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <button onClick={() => router.back()} className="absolute top-6 left-6 btn-ghost !border-none">
        ← Back
      </button>

      <div className="card max-w-md w-full border-orange-500/30">
        <div className="flex items-center gap-3 mb-2">
          <span className="badge badge-orange">Ask Shopkeeper</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Request Item</h1>
        <p className="text-slate-400 mb-8 text-sm">
          This item is currently out of stock on the shelf, but the shop might have it in the back room. 
          We'll ping the shopkeeper on WhatsApp right now.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRequest} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input 
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+91..." required pattern="^\+\d{10,15}$" className="input focus:border-orange-500/50"
            />
            <p className="text-xs text-slate-500 mt-1">We'll notify you when they respond.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <select 
                value={qty} onChange={e => setQty(Number(e.target.value))}
                className="input focus:border-orange-500/50 appearance-none bg-slate-800"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">My ETA</label>
              <select 
                value={eta} onChange={e => setEta(Number(e.target.value))}
                className="input focus:border-orange-500/50 appearance-none bg-slate-800"
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
            className="w-full justify-center mt-4 bg-gradient-to-r from-orange-500 to-red-500 text-white border-none padding-12px-24px rounded-xl font-semibold text-sm cursor-pointer transition-all hover:opacity-90 py-3"
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
