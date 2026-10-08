"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CountdownTimer } from "@/components/CountdownTimer";

export default function ReservationStatusPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  // Poll every 3 seconds to catch status changes (like COLLECTED or EXPIRED)
  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["reservation", id],
    queryFn: async () => {
      const resp = await fetch(`/api/reserve/${id}`);
      if (!resp.ok) throw new Error("Not found");
      return resp.json();
    },
    refetchInterval: 3000,
  });


  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!res) return <div className="min-h-screen flex items-center justify-center">Not found</div>;

  // B-08 fix: calculate effective status locally if sweeper hasn't fired yet
  const effectiveStatus = res.status === 'HELD' && new Date(res.expiresAt) < new Date()
    ? 'EXPIRED' : res.status;

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow based on status */}
      <div className={`absolute inset-0 opacity-10 pointer-events-none blur-[100px] transition-colors duration-1000 ${
        effectiveStatus === 'HELD' ? 'bg-indigo-500' : 
        effectiveStatus === 'COLLECTED' ? 'bg-emerald-500' : 'bg-red-500'
      }`} />

      <button onClick={() => router.push("/")} className="absolute top-6 left-6 btn-ghost !border-none z-10">
        ← Home
      </button>

      <div className="card max-w-md w-full relative z-10 shadow-2xl border-white/10">
        {effectiveStatus === "HELD" && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium">
              <span className="pulse-dot"></span> Active Hold
            </div>
            
            <div className="py-6 border-y border-white/5 bg-slate-900/50 -mx-5 px-5">
              <div className="text-sm text-slate-400 mb-2 uppercase tracking-widest font-semibold">Pickup Code</div>
              <div className="text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-mono">
                {res.pickupCode}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold">{res.productName}</h2>
              <p className="text-slate-400">Qty: {res.qty} • ₹{res.productPrice * res.qty}</p>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 text-left flex items-start gap-3">
              <div className="mt-1">📍</div>
              <div>
                <div className="font-bold">{res.shopName}</div>
                <div className="text-sm text-slate-400 mt-1">{res.shopAddress}</div>
                <div className="text-xs text-indigo-400 mt-2 font-medium">
                  Expires in: <CountdownTimer expiresAt={res.expiresAt} onExpire={refetch} className="countdown-ring" />
                </div>
              </div>
            </div>

            <div className="text-sm text-slate-500 pt-4">
              Show this code to the shopkeeper at the counter.
            </div>
          </div>
        )}

        {effectiveStatus === "COLLECTED" && (
          <div className="text-center space-y-6 py-8">
            <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white">Collected!</h2>
            <p className="text-slate-400">Thank you for shopping locally.</p>
          </div>
        )}

        {(effectiveStatus === "EXPIRED" || effectiveStatus === "CANCELLED") && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Hold {effectiveStatus.toLowerCase()}</h2>
            <p className="text-slate-400">This item has been returned to the shelf.</p>
            <button onClick={() => router.push("/")} className="btn-primary mt-4">Find another</button>
          </div>
        )}
      </div>
    </div>
  );
}
