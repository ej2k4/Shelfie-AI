"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useSearchParams, useRouter } from "next/navigation";
import { SHOPS } from "@/lib/data/shops";
import { CountdownTimer } from "@/components/CountdownTimer";
import { PremiumLoader } from "@/components/PremiumLoader";

import { Suspense } from "react";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("s") || "shop_km_01"; 
  const queryClient = useQueryClient();

  const { data: shop } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: async () => (await fetch(`/api/shop/${shopId}`)).json(),
  });

  const { data: notifs } = useQuery({
    queryKey: ["notifications", shopId],
    queryFn: async () => (await fetch(`/api/shop/${shopId}/notifications`)).json(),
    refetchInterval: 5000,
  });

  const { data: resData } = useQuery({
    queryKey: ["shop-reservations", shopId],
    queryFn: async () => (await fetch(`/api/shop/${shopId}/reservations`)).json(),
    refetchInterval: 5000,
  });

  const { data: requests } = useQuery({
    queryKey: ["requests", shopId],
    queryFn: async () => (await fetch(`/api/shop/${shopId}/requests`)).json(),
    refetchInterval: 5000,
  });

  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyError, setVerifyError] = useState("");
  
  // Mobile tab state
  const [activeTab, setActiveTab] = useState<"requests" | "active" | "completed">("active");
  const [showScanner, setShowScanner] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/pickup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setVerifyResult(data);
      setVerifyCode("");
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      queryClient.invalidateQueries({ queryKey: ["shop-reservations", shopId] });
      setTimeout(() => setVerifyResult(null), 8000);
    },
    onError: (err: any) => {
      setVerifyError(err.message);
      setTimeout(() => setVerifyError(""), 3000);
    }
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string, decision: "ACCEPT" | "DECLINE" }) => {
      const res = await fetch(`/api/request/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, decision }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests", shopId] });
      queryClient.invalidateQueries({ queryKey: ["notifications", shopId] });
    }
  });

  useEffect(() => {
    if (notifs?.unreadCount > 0) {
      fetch(`/api/shop/${shopId}/notifications`, { method: "PATCH" });
    }
  }, [notifs?.unreadCount, shopId]);

  if (!shop) return <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center"><PremiumLoader text="Loading dashboard..." /></div>;

  const pendingRequests = requests?.requests?.filter((r:any) => r.status === 'PENDING') || [];
  const activeHolds = resData?.active || [];
  const history = resData?.history || [];

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] pb-32">
      {/* Header */}
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border-sm)] px-4 md:px-6 py-4 sticky top-0 z-20 flex justify-between items-center shadow-[var(--shadow-xs)]">
        <div>
          <h1 className="font-bold text-lg text-[var(--text-primary)] flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--green)] animate-pulse shadow-[var(--shadow-xs)] relative">
               <div className="absolute inset-0 rounded-full bg-[var(--green)] opacity-50 animate-ping"></div>
            </div>
            {shop.name}
          </h1>
          <p className="eyebrow mt-1">Merchant ID: {shop.shopId}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group hidden sm:block">
            <select 
              className="appearance-none bg-[var(--bg-surface-2)] border border-[var(--border-sm)] rounded-[var(--radius-md)] pl-4 pr-10 py-2.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--brand-500)] cursor-pointer transition-all shadow-[var(--shadow-xs)]"
              value={shopId}
              onChange={(e) => router.push(`/shop/dashboard?s=${e.target.value}`)}
            >
              {SHOPS.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <svg className="w-4 h-4 absolute right-3.5 top-3 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <button 
            onClick={() => router.push("/")} 
            className="btn btn-ghost !px-3 !py-2.5 ml-2 border border-[var(--border-sm)] hover:bg-[var(--bg-surface-2)] text-xs font-bold"
          >
            Exit to Store
          </button>
        </div>
      </header>

      {/* Mobile Tabs */}
      <div className="lg:hidden flex border-b border-[var(--border-sm)] bg-[var(--bg-surface)]/95 backdrop-blur-md sticky top-[69px] z-10 overflow-x-auto hide-scrollbar shadow-[var(--shadow-xs)]">
        <button onClick={() => setActiveTab("requests")} className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-[3px] flex-1 text-center ${activeTab === 'requests' ? 'border-[var(--text-primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
          Requests {pendingRequests.length > 0 && <span className="ml-1.5 bg-[var(--amber)] text-white px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[10px]">{pendingRequests.length}</span>}
        </button>
        <button onClick={() => setActiveTab("active")} className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-[3px] flex-1 text-center ${activeTab === 'active' ? 'border-[var(--text-primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
          Holds {activeHolds.length > 0 && <span className="ml-1.5 bg-[var(--text-primary)] text-[var(--text-inverse)] px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[10px]">{activeHolds.length}</span>}
        </button>
        <button onClick={() => setActiveTab("completed")} className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-[3px] flex-1 text-center ${activeTab === 'completed' ? 'border-[var(--text-primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
          History
        </button>
      </div>

      {/* Merchant Quick Verification Banner (Desktop & Tablet) */}
      <div className="container mx-auto px-4 lg:px-6 pt-6">
        <div className="surface p-4 sm:p-5 border border-[var(--border-sm)] shadow-[var(--shadow-sm)] flex flex-col md:flex-row items-center justify-between gap-4 bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-100)] text-[var(--brand-500)] flex items-center justify-center text-lg border border-[var(--brand-border)] shrink-0">
              🔍
            </div>
            <div>
              <h2 className="font-bold text-sm text-[var(--text-primary)]">Quick Pickup Verification</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Enter the customer&apos;s 6-digit pickup code to release held inventory</p>
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); if (verifyCode.length === 6) verifyMutation.mutate(verifyCode); }} className="flex items-center gap-2 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="6-digit code" 
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              className="input !text-center !text-lg !tracking-[0.2em] !font-mono !py-2.5 !w-44 !h-11 font-bold"
            />
            <button 
              type="submit" 
              disabled={verifyCode.length !== 6 || verifyMutation.isPending} 
              className="btn btn-primary px-6 !py-2.5 text-sm h-11 whitespace-nowrap"
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify Code"}
            </button>
          </form>
        </div>
        {verifyError && (
          <div className="mt-2 text-xs font-bold text-[var(--red)] bg-[var(--red-bg)] border border-[var(--red-border)] p-2.5 rounded-lg text-center animate-shake">
            {verifyError}
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 lg:px-6 pt-6 pb-12 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Column 1: Requests */}
        <div className={`space-y-4 ${activeTab !== 'requests' && 'hidden lg:block'}`}>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] flex items-center justify-center border border-[var(--amber-border)]">💬</div>
              Inbound Requests
            </h2>
            <span className="text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-sm)] shadow-[var(--shadow-xs)] px-2.5 py-1 rounded-[var(--radius-pill)] text-[var(--text-secondary)]">{pendingRequests.length}</span>
          </div>
          
          {pendingRequests.length === 0 ? (
            <div className="surface bg-transparent border-dashed flex flex-col items-center justify-center py-16 text-[var(--text-muted)] shadow-none">
              <div className="text-3xl mb-3 opacity-60">☕</div>
              <p className="text-sm font-medium">No pending requests</p>
            </div>
          ) : (
            pendingRequests.map((req: any) => (
              <div key={req.id} className="surface border-[var(--amber-border)] bg-[var(--amber-bg)]/30 shadow-[var(--shadow-sm)] p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4 w-full">
                     <div className="w-14 h-14 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] flex items-center justify-center text-3xl shrink-0 border border-[var(--border-sm)] shadow-[var(--shadow-xs)]">{req.imageEmoji || '📦'}</div>
                     <div className="flex-1 min-w-0">
                       <div className="font-bold text-[1.05rem] text-[var(--text-primary)] leading-tight mb-1 truncate">{req.productName}</div>
                       <div className="text-sm text-[var(--text-secondary)] font-medium">Qty: {req.qty} • {formatDistanceToNow(new Date(req.createdAt))} ago</div>
                     </div>
                  </div>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-sm)] p-3 rounded-[var(--radius-md)] mb-5 flex items-center justify-between text-sm shadow-[var(--shadow-xs)]">
                  <span className="text-[var(--text-secondary)] font-semibold">Customer ETA:</span>
                  <span className="font-bold text-[var(--amber)] bg-[var(--amber-bg)] px-2.5 py-0.5 rounded-[var(--radius-xs)] border border-[var(--amber-border)]">{req.etaMinutes} mins</span>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => respondMutation.mutate({ id: req.id, decision: 'DECLINE' })}
                    className="flex-1 btn btn-secondary !py-2.5 !text-[13px]"
                  >
                    Decline
                  </button>
                  <button 
                    onClick={() => respondMutation.mutate({ id: req.id, decision: 'ACCEPT' })}
                    className="flex-[2] btn btn-primary !py-2.5 !text-[13px]"
                  >
                    Accept Request
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Column 2: Active Holds */}
        <div className={`space-y-4 ${activeTab !== 'active' && 'hidden lg:block'}`}>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-surface-2)] text-[var(--text-primary)] flex items-center justify-center border border-[var(--border-md)]">🔒</div>
              Active Holds
            </h2>
            <span className="text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-sm)] shadow-[var(--shadow-xs)] px-2.5 py-1 rounded-[var(--radius-pill)] text-[var(--text-secondary)]">{activeHolds.length}</span>
          </div>
          
          {activeHolds.length === 0 ? (
            <div className="surface bg-transparent border-dashed flex flex-col items-center justify-center py-16 text-[var(--text-muted)] shadow-none">
              <div className="text-3xl mb-3 opacity-60">✨</div>
              <p className="text-sm font-medium">All caught up</p>
            </div>
          ) : (
            activeHolds.map((r: any) => (
              <div key={r.id} className="surface overflow-hidden !p-0 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow border border-[var(--border-sm)]">
                <div className="bg-[var(--bg-surface-2)] px-5 py-3 flex justify-between items-center border-b border-[var(--border-sm)]">
                  <span className="text-sm font-mono font-bold text-[var(--text-primary)] tracking-widest">#{r.pickupCode}</span>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-sm)] shadow-[var(--shadow-xs)] px-2.5 py-1 rounded-[var(--radius-sm)] flex items-center gap-1.5 uppercase tracking-wider">
                    ⏱️ <CountdownTimer 
                      expiresAt={r.expiresAt} 
                      onExpire={() => queryClient.invalidateQueries({ queryKey: ["shop-reservations", shopId] })} 
                    />
                  </span>
                </div>
                <div className="p-5">
                  <div className="font-bold text-[1.05rem] text-[var(--text-primary)] mb-4">{r.productName}</div>
                  <div className="flex justify-between items-end border-t border-[var(--border-sm)] pt-4">
                    <div className="text-sm font-semibold text-[var(--text-secondary)]">Qty: {r.qty}</div>
                    <div className="font-bold text-[1.1rem] text-[var(--text-primary)]">₹{r.productPrice * r.qty}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Column 3: History */}
        <div className={`space-y-4 ${activeTab !== 'completed' && 'hidden lg:block'}`}>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center border border-[var(--green-border)]">✓</div>
              Completed
            </h2>
            <div className="text-[13px] font-bold text-[var(--text-primary)] bg-[var(--bg-surface)] px-3 py-1.5 rounded-[var(--radius-pill)] border border-[var(--border-sm)] shadow-[var(--shadow-xs)]">
              ₹{(resData?.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
          </div>
          
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="surface bg-transparent border-dashed flex flex-col items-center justify-center py-16 text-[var(--text-muted)] shadow-none">
                <div className="text-3xl mb-3 opacity-60">🧾</div>
                <p className="text-sm font-medium">No completed pickups yet</p>
              </div>
            ) : (
              history.map((r: any) => (
                <div key={r.id} className="surface !p-4 flex justify-between items-center shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow border border-[var(--border-sm)]">
                  <div className="min-w-0 pr-4">
                    <div className="font-bold text-sm text-[var(--text-primary)] truncate">{r.productName}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">{new Date(r.createdAt).toLocaleDateString()} • {r.customerPhone || 'Walk-in'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-[var(--text-primary)]">₹{r.productPrice * r.qty}</div>
                    <span className="text-[10px] font-semibold text-[var(--green)] bg-[var(--green-bg)] px-1.5 py-0.5 rounded border border-[var(--green-border)]">Fulfilled</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Mobile Sticky Bottom Action Bar (Scanner) */}
      <div className="fixed bottom-0 left-0 w-full bg-[var(--bg-surface)] border-t border-[var(--border-sm)] p-4 z-30 lg:hidden shadow-[0_-8px_30px_rgba(60,50,40,0.06)]">
        {showScanner ? (
          <div className="flex gap-2">
             <input 
                type="text" 
                placeholder="6-digit code" 
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                autoFocus
                className="input flex-1 !text-center !text-xl !tracking-[0.25em] !font-mono !py-4"
              />
              <button 
                onClick={() => {
                  if(verifyCode.length === 6) verifyMutation.mutate(verifyCode);
                }}
                disabled={verifyCode.length !== 6 || verifyMutation.isPending} 
                className="btn btn-primary shrink-0 px-6 !py-4 text-[15px]"
              >
                Verify
              </button>
              <button onClick={() => setShowScanner(false)} className="btn btn-ghost shrink-0 px-4 !py-4 bg-[var(--bg-surface-2)]">✕</button>
          </div>
        ) : (
          <button onClick={() => setShowScanner(true)} className="btn btn-primary w-full py-4 text-[1.05rem] flex justify-center items-center gap-2 shadow-[var(--shadow-md)]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Scan Customer Code
          </button>
        )}
        
        {verifyError && <div className="text-center text-[13px] text-[var(--red)] mt-3 font-bold animate-pulse">{verifyError}</div>}
      </div>

      {/* Notifications Drawer (Simulated WhatsApp) */}
      <div className="hidden lg:flex fixed bottom-8 right-8 w-[340px] bg-[var(--bg-surface)] border border-[var(--border-md)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] overflow-hidden flex-col h-[380px] z-40">
        <div className="bg-[#128C7E] px-4 py-3.5 font-bold text-sm flex justify-between items-center text-white">
          <div className="flex items-center gap-2.5">
             <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
             WhatsApp Connect
          </div>
          {notifs?.unreadCount > 0 && (
            <span className="bg-white text-[#128C7E] font-bold text-[10px] px-2 py-0.5 rounded-full shadow-[var(--shadow-xs)]">{notifs.unreadCount} New</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#ece5dd] relative">
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none bg-repeat" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/az-subtle.png")' }}></div>
          
          {notifs?.notifications?.map((n: any) => (
            <div key={n.id} className="bg-[#dcf8c6] p-3.5 rounded-[var(--radius-md)] rounded-tr-sm shadow-[var(--shadow-xs)] text-[13px] relative z-10 w-11/12 ml-auto">
              <div className="font-bold text-[var(--text-primary)] mb-1">{n.title}</div>
              <div className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed font-medium">{n.body}</div>
              <div className="text-[10px] text-gray-500 text-right mt-2 font-bold uppercase tracking-wider">{new Date(n.createdAt).toLocaleTimeString()}</div>
            </div>
          ))}
          {notifs?.notifications?.length === 0 && <div className="text-center text-[#7c8286] font-semibold text-sm mt-12">System active. Awaiting messages.</div>}
        </div>
      </div>

      {/* Full Screen Success Overlay */}
      {verifyResult && (
        <div className="fixed inset-0 bg-[var(--bg-surface)]/95 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="surface max-w-sm w-full text-center py-12 relative overflow-hidden shadow-[var(--shadow-xl)] border border-[var(--border-sm)]">
            <div className="absolute top-0 left-0 w-full h-[6px] bg-[var(--brand-500)]"></div>
            <div className="w-20 h-20 bg-[var(--green-bg)] text-[var(--green)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[var(--shadow-md)] border border-[var(--green-border)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="font-bold text-3xl text-[var(--text-primary)] mb-2 tracking-tight">Verified</h3>
            <p className="text-[var(--text-secondary)] font-mono font-bold tracking-widest mb-10 bg-[var(--bg-surface-2)] inline-block px-5 py-2 rounded-full border border-[var(--border-sm)]">{verifyResult.customerPhone || 'Walk-in'}</p>
            
            <div className="bg-[var(--bg-canvas)] rounded-[var(--radius-lg)] p-6 text-left mx-8 mb-10 border border-[var(--border-sm)] shadow-[var(--shadow-xs)]">
              <div className="eyebrow mb-5 text-center">Receipt Summary</div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[var(--text-secondary)] font-semibold">Total Items</span>
                <span className="font-bold text-[var(--text-primary)] text-lg">{verifyResult.qty}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-[var(--border-sm)]">
                <span className="text-[var(--text-secondary)] font-semibold">Collect Amount</span>
                <span className="font-bold text-[var(--brand-500)] text-2xl">₹{(verifyResult.qty * (verifyResult.price || 0)).toLocaleString('en-IN')}</span>
              </div>
            </div>
            
            <button onClick={() => setVerifyResult(null)} className="btn btn-primary w-[calc(100%-4rem)] mx-auto py-4 justify-center text-lg shadow-[var(--shadow-md)]">
              Complete Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShopDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center"><PremiumLoader text="Loading dashboard..." /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
