"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { PremiumLoader } from "@/components/PremiumLoader";

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


  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)]"><PremiumLoader text="Retrieving hold..." /></div>;
  if (!res) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-tertiary)] font-medium">Not found</div>;

  const effectiveStatus = res.status === 'HELD' && new Date(res.expiresAt) < new Date()
    ? 'EXPIRED' : res.status;

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden bg-[var(--bg-canvas)]">
      
      <button onClick={() => router.push("/")} className="absolute top-6 left-6 md:top-8 md:left-8 btn btn-secondary !px-4 !py-2 !rounded-full shadow-sm z-10 font-bold">
        ← Return Home
      </button>

      <div className="surface max-w-sm w-full relative z-10 shadow-[var(--shadow-xl)] overflow-hidden !p-0">
        
        {effectiveStatus === "HELD" && (
          <div className="text-center">
            {/* Top Status Bar */}
            <div className="bg-[var(--status-amber)] text-[var(--text-inverse)] py-3 px-6 flex items-center justify-center gap-2 text-sm font-bold tracking-wide">
              <span className="status-dot bg-white"></span> Active Hold
            </div>
            
            {/* Code Section */}
            <div className="py-10 px-8 bg-[var(--bg-surface)]">
              <div className="eyebrow mb-2">Pickup Code</div>
              <div className="text-5xl md:text-6xl font-black tracking-[0.2em] text-[var(--text-primary)] font-mono leading-none">
                {res.pickupCode}
              </div>
            </div>

            <div className="h-px bg-dashed border-b-2 border-dashed border-[var(--border-light)] mx-6 my-2"></div>

            {/* Details */}
            <div className="px-6 py-8 bg-[var(--bg-canvas)]/30 text-left">
              <div className="flex justify-between items-start mb-6 gap-4">
                <div>
                  <h2 className="text-[1.15rem] font-bold text-[var(--text-primary)] leading-tight">{res.productName}</h2>
                  <p className="meta mt-1">Qty: {res.qty}</p>
                </div>
                <div className="font-bold text-lg whitespace-nowrap">₹{res.productPrice * res.qty}</div>
              </div>

              <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-[var(--radius-md)] p-4 flex items-start gap-3 shadow-[var(--shadow-xs)]">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-light)] flex items-center justify-center shrink-0">📍</div>
                <div>
                  <div className="font-bold text-[0.95rem] text-[var(--text-primary)]">{res.shopName}</div>
                  <div className="text-[13px] text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">{res.shopAddress}</div>
                  <div className="text-[13px] font-bold mt-3 pt-3 border-t border-[var(--border-light)] text-[var(--status-amber)] flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Expires in <CountdownTimer expiresAt={res.expiresAt} onExpire={refetch} className="countdown-ring ml-1" />
                  </div>
                </div>
              </div>

              <div className="meta text-center mt-6">
                Show this code to the merchant.
              </div>
            </div>
          </div>
        )}

        {effectiveStatus === "COLLECTED" && (
          <div className="text-center space-y-6 py-12 px-6">
            <div className="w-20 h-20 bg-[var(--status-green-bg)] text-[var(--status-green)] rounded-full flex items-center justify-center mx-auto mb-2 border border-[var(--status-green-border)] shadow-[var(--shadow-xs)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Collected</h2>
            <p className="meta max-w-[200px] mx-auto">Thank you for supporting your local neighbourhood.</p>
          </div>
        )}

        {(effectiveStatus === "EXPIRED" || effectiveStatus === "CANCELLED") && (
          <div className="text-center space-y-6 py-12 px-6">
            <div className="w-20 h-20 bg-[var(--bg-subtle)] text-[var(--text-tertiary)] rounded-full flex items-center justify-center mx-auto mb-2 border border-[var(--border-medium)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Hold {effectiveStatus.toLowerCase()}</h2>
            <p className="meta max-w-[200px] mx-auto">This item is no longer reserved and has been returned to the shelf.</p>
            <button onClick={() => router.push("/")} className="btn btn-secondary w-full py-3 mt-4">Find another</button>
          </div>
        )}
      </div>
    </div>
  );
}
