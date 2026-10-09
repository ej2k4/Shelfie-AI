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
    <div className="min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden bg-[var(--bg-canvas)]">
      <button onClick={() => router.push("/")} className="absolute top-6 left-6 btn btn-secondary !px-4 !py-2 !rounded-full shadow-sm z-10 font-bold">
        ← Home
      </button>

      <div className="card max-w-md w-full relative z-10 shadow-[var(--shadow-xl)] bg-[var(--bg-surface)] border border-[var(--border-sm)]">
        {req.status === "PENDING" && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 text-orange-600 text-sm font-semibold">
              <span className="pulse-dot orange"></span> Awaiting Shopkeeper
            </div>
            
            <div className="py-6">
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin mb-5"></div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Pinging {req.shopName}...</h2>
              <p className="text-[var(--text-secondary)] text-sm">
                They have <span className="font-bold text-orange-600">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span> to respond.
              </p>
            </div>

            <div className="bg-[var(--bg-surface-2)] border border-[var(--border-sm)] rounded-[var(--radius-lg)] p-4 text-left">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Requested Item</div>
              <div className="font-bold text-[var(--text-primary)] text-base">{req.productName}</div>
              <div className="text-sm font-medium text-[var(--text-secondary)] mt-1">Qty: {req.qty}</div>
            </div>
          </div>
        )}

        {req.status === "ACCEPTED" && (
          <div className="text-center space-y-6 py-6">
            <div className="w-20 h-20 bg-[var(--green-bg)] text-[var(--green)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--green-border)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Request Accepted!</h2>
            <p className="text-[var(--text-secondary)] text-sm">The shop is holding it for you.<br/>Redirecting to your pickup code...</p>
          </div>
        )}

        {req.status === "DECLINED" && (
          <div className="text-center space-y-6 py-6">
            <div className="w-20 h-20 bg-[var(--bg-surface-3)] text-[var(--text-muted)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-sm)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Item Not Available</h2>
            <p className="text-[var(--text-secondary)] text-sm">The shopkeeper declined the request. They might be out of stock in the back room too.</p>
            <button onClick={() => router.push("/")} className="btn btn-secondary w-full py-3 mt-2">Find another shop</button>
          </div>
        )}
        
        {req.status === "EXPIRED" && (
          <div className="text-center space-y-6 py-6">
             <div className="w-20 h-20 bg-[var(--bg-surface-3)] text-[var(--text-muted)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-sm)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">No Response</h2>
            <p className="text-[var(--text-secondary)] text-sm">The shop didn't respond in time. They might be busy with customers.</p>
            <button onClick={() => router.push("/")} className="btn btn-secondary w-full py-3 mt-2">Find another shop</button>
          </div>
        )}
      </div>
    </div>
  );
}
