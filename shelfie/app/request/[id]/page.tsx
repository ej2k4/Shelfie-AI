"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RequestStatusPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  // Poll every 3 seconds
  const { data: req, isLoading } = useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      const resp = await fetch(`/api/request/${id}`);
      if (!resp.ok) throw new Error("Not found");
      return resp.json();
    },
    refetchInterval: (query) => {
      // Stop polling if we got a terminal state
      const status = (query.state.data as any)?.status;
      if (status === "ACCEPTED" || status === "DECLINED" || status === "EXPIRED") {
        return false;
      }
      return 3000;
    },
  });

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!req || req.status !== "PENDING") return;
    // B-01 fix: initialize from server's expiresAt immediately
    const computeRemaining = () => Math.max(0, Math.floor((new Date(req.expiresAt).getTime() - Date.now()) / 1000));
    setTimeLeft(computeRemaining());
    const interval = setInterval(() => {
      setTimeLeft(computeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, [req?.expiresAt, req?.status]);

  // If request was accepted, redirect to the reservation page
  useEffect(() => {
    if (req?.status === "ACCEPTED" && req?.reservation?.id) {
      setTimeout(() => {
        router.push(`/reserve/${req.reservation.id}`);
      }, 2000);
    }
  }, [req?.status, req?.reservation?.id, router]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!req) return <div className="min-h-screen flex items-center justify-center">Not found</div>;

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden">
      <button onClick={() => router.push("/")} className="absolute top-6 left-6 btn-ghost !border-none z-10">
        ← Home
      </button>

      <div className="card max-w-md w-full relative z-10 shadow-2xl">
        {req.status === "PENDING" && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-sm font-medium">
              <span className="pulse-dot orange"></span> Awaiting Shopkeeper
            </div>
            
            <div className="py-8">
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin mb-6"></div>
              <h2 className="text-2xl font-bold text-white mb-2">Pinging {req.shopName}...</h2>
              <p className="text-slate-400 text-sm">
                They have <span className="font-bold text-orange-400">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span> to respond.
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 text-left">
              <div className="text-sm text-slate-400 mb-1">Requested Item</div>
              <div className="font-bold">{req.productName}</div>
              <div className="text-sm mt-1">Qty: {req.qty}</div>
            </div>
          </div>
        )}

        {req.status === "ACCEPTED" && (
          <div className="text-center space-y-6 py-8">
            <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white">Accepted!</h2>
            <p className="text-slate-400">The shop is holding it for you.<br/>Redirecting to pickup code...</p>
          </div>
        )}

        {req.status === "DECLINED" && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Item Not Available</h2>
            <p className="text-slate-400">The shopkeeper declined the request. They might be out of stock in the back room too.</p>
            <button onClick={() => router.push("/")} className="btn-primary mt-4">Find another shop</button>
          </div>
        )}
        
        {req.status === "EXPIRED" && (
          <div className="text-center space-y-6 py-8">
             <div className="w-20 h-20 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">No Response</h2>
            <p className="text-slate-400">The shop didn't respond in time. They might be busy.</p>
            <button onClick={() => router.push("/")} className="btn-primary mt-4">Find another shop</button>
          </div>
        )}
      </div>
    </div>
  );
}
