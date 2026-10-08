"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useSearchParams, useRouter } from "next/navigation";
import { SHOPS } from "@/lib/data/shops";
import { CountdownTimer } from "@/components/CountdownTimer";
import { PremiumLoader } from "@/components/PremiumLoader";

export default function ShopDashboard() {
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
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border-light)] px-4 md:px-6 py-4 sticky top-0 z-20 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="font-bold text-lg text-[var(--text-primary)] flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--status-green)] animate-pulse shadow-[var(--shadow-xs)] relative">
               <div className="absolute inset-0 rounded-full bg-[var(--status-green)] opacity-50 animate-ping"></div>
            </div>
            {shop.name}
          </h1>
          <p className="eyebrow mt-1">Merchant ID: {shop.shopId}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group hidden sm:block">
            <select 
              className="appearance-none bg-[var(--bg-subtle)] border border-[var(--border-light)] rounded-[var(--radius-md)] pl-4 pr-10 py-2.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--border-dark)] cursor-pointer transition-all shadow-[var(--shadow-xs)]"
              value={shopId}
              onChange={(e) => router.push(`/shop/dashboard?s=${e.target.value}`)}
            >
              {SHOPS.map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </select>
            <svg className="w-4 h-4 absolute right-3.5 top-2.5 text-[var(--text-tertiary)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </div>
          <button onClick={() => router.push("/")} className="btn btn-ghost !px-3 !py-2.5 ml-2 border border-transparent hover:border-[var(--border-light)]">Exit</button>
        </div>
      </header>

      {/* Mobile Tabs */}
      <div className="lg:hidden flex border-b border-[var(--border-light)] bg-[var(--bg-surface)]/95 backdrop-blur-md sticky top-[69px] z-10 overflow-x-auto hide-scrollbar shadow-[var(--shadow-xs)]">
        <button onClick={() => setActiveTab("requests")} className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-[3px] flex-1 text-center ${activeTab === 'requests' ? 'border-[var(--text-primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
          Requests {pendingRequests.length > 0 && <span className="ml-1.5 bg-[var(--status-amber)] text-[var(--text-inverse)] px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[10px]">{pendingRequests.length}</span>}
        </button>
        <button onClick={() => setActiveTab("active")} className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-[3px] flex-1 text-center ${activeTab === 'active' ? 'border-[var(--text-primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
          Holds {activeHolds.length > 0 && <span className="ml-1.5 bg-[var(--text-primary)] text-[var(--text-inverse)] px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[10px]">{activeHolds.length}</span>}
        </button>
        <button onClick={() => setActiveTab("completed")} className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-[3px] flex-1 text-center ${activeTab === 'completed' ? 'border-[var(--text-primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
          History
        </button>
      </div>

      <div className="container mx-auto px-4 lg:px-6 pt-6 pb-12 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Column 1: Requests */}
        <div className={`space-y-4 ${activeTab !== 'requests' && 'hidden lg:block'}`}>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--status-amber-bg)] text-[var(--status-amber)] flex items-center justify-center border border-[var(--status-amber-border)]">💬</div>
              Inbound Requests
            </h2>
            <span className="text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-[var(--shadow-xs)] px-2.5 py-1 rounded-[var(--radius-pill)] text-[var(--text-secondary)]">{pendingRequests.length}</span>
          </div>
          
          {pendingRequests.length === 0 ? (
            <div className="surface bg-transparent border-dashed flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)] shadow-none">
              <div className="text-3xl mb-3 opacity-60">☕</div>
              <p className="text-sm font-medium">No pending requests</p>
            </div>
          ) : (
            pendingRequests.map((req: any) => (
              <div key={req.id} className="surface border-[var(--status-amber-border)] bg-[var(--status-amber-bg)]/30 shadow-[var(--shadow-sm)] p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4 w-full">
                     <div className="w-14 h-14 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] flex items-center justify-center text-3xl shrink-0 border border-[var(--border-light)] shadow-[var(--shadow-xs)]">{req.imageEmoji || '📦'}</div>
                     <div className="flex-1 min-w-0">
                       <div className="font-bold text-[1.05rem] text-[var(--text-primary)] leading-tight mb-1 truncate">{req.productName}</div>
                       <div className="text-sm text-[var(--text-secondary)] font-medium">Qty: {req.qty} • {formatDistanceToNow(new Date(req.createdAt))} ago</div>
                     </div>
                  </div>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] p-3 rounded-[var(--radius-md)] mb-5 flex items-center justify-between text-sm shadow-[var(--shadow-xs)]">
                  <span className="text-[var(--text-secondary)] font-semibold">Customer ETA:</span>
                  <span className="font-bold text-[var(--status-amber)] bg-[var(--status-amber-bg)] px-2.5 py-0.5 rounded-[var(--radius-xs)]">{req.etaMinutes} mins</span>
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
                    className="flex-[2] btn btn-primary !py-2.5 !text-[13px] bg-[var(--text-primary)] border-[var(--text-primary)] shadow-md"
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
              <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] text-[var(--text-primary)] flex items-center justify-center border border-[var(--border-medium)]">🔒</div>
              Active Holds
            </h2>
            <span className="text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-[var(--shadow-xs)] px-2.5 py-1 rounded-[var(--radius-pill)] text-[var(--text-secondary)]">{activeHolds.length}</span>
          </div>
          
          {activeHolds.length === 0 ? (
            <div className="surface bg-transparent border-dashed flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)] shadow-none">
              <div className="text-3xl mb-3 opacity-60">✨</div>
              <p className="text-sm font-medium">All caught up</p>
            </div>
          ) : (
            activeHolds.map((r: any) => (
              <div key={r.id} className="surface overflow-hidden !p-0 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow">
                <div className="bg-[var(--bg-subtle)] px-5 py-3 flex justify-between items-center border-b border-[var(--border-light)]">
                  <span className="text-sm font-mono font-bold text-[var(--text-primary)] tracking-widest">#{r.pickupCode}</span>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-[var(--shadow-xs)] px-2.5 py-1 rounded-[var(--radius-sm)] flex items-center gap-1.5 uppercase tracking-wider">
                    ⏱️ <CountdownTimer 
                      expiresAt={r.expiresAt} 
                      onExpire={() => queryClient.invalidateQueries({ queryKey: ["shop-reservations", shopId] })} 
                    />
                  </span>
                </div>
                <div className="p-5">
                  <div className="font-bold text-[1.05rem] text-[var(--text-primary)] mb-4">{r.productName}</div>
                  <div className="flex justify-between items-end border-t border-[var(--border-light)] pt-4">
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
              <div className="w-8 h-8 rounded-full bg-[var(--status-green-bg)] text-[var(--status-green)] flex items-center justify-center border border-[var(--status-green-border)]">✓</div>
              Completed
            </h2>
            <div className="text-[13px] font-bold text-[var(--text-primary)] bg-[var(--bg-surface)] px-3 py-1.5 rounded-[var(--radius-pill)] border border-[var(--border-medium)] shadow-[var(--shadow-xs)]">
              ₹{(resData?.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
          </div>
          
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-10 text-[var(--text-tertiary)] text-sm font-medium">No history yet.</div>
            ) : (
              history.map((r: any) => (
                <div key={r.id} className="surface !p-5 flex justify-between items-center shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow">
                  <div className="min-w-0 pr-4">
                    <div className="font-bold text-sm text-[var(--text-primary)] truncate">{r.productName}</div>
                    <div className="eyebrow mt-1.5">{new Date(r.createdAt).toLocaleDateString()} • {r.customerPhone || 'Walk-in'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-[1.05rem] text-[var(--text-primary)]">₹{r.productPrice * r.qty}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Mobile Sticky Bottom Action Bar (Scanner) */}
      <div className="fixed bottom-0 left-0 w-full bg-[var(--bg-surface)] border-t border-[var(--border-light)] p-4 z-30 lg:hidden shadow-[0_-8px_30px_rgba(60,50,40,0.06)]">
        {showScanner ? (
          <div className="flex gap-2">
             <input 
                type="text" 
                placeholder="6-digit code" 
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value)}
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
              <button onClick={() => setShowScanner(false)} className="btn btn-ghost shrink-0 px-4 !py-4 bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)]">✕</button>
          </div>
        ) : (
          <button onClick={() => setShowScanner(true)} className="btn btn-primary w-full py-4 text-[1.05rem] flex justify-center items-center gap-2 shadow-[var(--shadow-md)]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Scan Customer Code
          </button>
        )}
        
        {verifyError && <div className="text-center text-[13px] text-[var(--status-red)] mt-3 font-bold animate-pulse">{verifyError}</div>}
      </div>

      {/* Desktop Floating Action Bar (Scanner) */}
      <div className="hidden lg:block fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-[var(--radius-xl)] p-2.5 shadow-[var(--shadow-xl)] z-30">
         <form onSubmit={e => { e.preventDefault(); verifyMutation.mutate(verifyCode); }} className="flex gap-3">
           <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-lg)] px-5 flex items-center justify-center border border-[var(--border-light)] shadow-[var(--shadow-xs)] inset">
             <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
           </div>
           <input 
              type="text" 
              placeholder="Enter pickup code..." 
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value)}
              maxLength={6}
              className="input flex-1 !text-center !text-2xl !tracking-[0.25em] !font-mono !border-transparent !bg-transparent !shadow-none focus:!ring-0 placeholder:tracking-normal placeholder:font-sans placeholder:text-[1rem] placeholder:font-medium"
            />
            <button type="submit" disabled={verifyCode.length !== 6 || verifyMutation.isPending} className="btn btn-primary px-8 text-lg rounded-[var(--radius-lg)]">
              Verify
            </button>
         </form>
         {verifyError && <div className="text-center text-[13px] text-[var(--status-red)] mt-3 font-bold">{verifyError}</div>}
      </div>

      {/* Notifications Drawer (Simulated WhatsApp) */}
      <div className="hidden lg:flex fixed bottom-8 right-8 w-[340px] bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] overflow-hidden flex-col h-[400px] z-40">
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
          <div className="surface max-w-sm w-full text-center py-12 relative overflow-hidden shadow-[var(--shadow-xl)]">
            <div className="absolute top-0 left-0 w-full h-[6px] bg-[var(--text-primary)]"></div>
            <div className="w-20 h-20 bg-[var(--text-primary)] text-[var(--text-inverse)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[var(--shadow-md)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="font-bold text-3xl text-[var(--text-primary)] mb-2 tracking-tight">Verified</h3>
            <p className="text-[var(--text-secondary)] font-mono font-bold tracking-widest mb-10 bg-[var(--bg-subtle)] inline-block px-5 py-2 rounded-full border border-[var(--border-light)]">{verifyResult.customerPhone || 'Walk-in'}</p>
            
            <div className="bg-[var(--bg-canvas)] rounded-[var(--radius-lg)] p-6 text-left mx-8 mb-10 border border-[var(--border-light)] shadow-[var(--shadow-xs)]">
              <div className="eyebrow mb-5 text-center">Receipt Summary</div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[var(--text-secondary)] font-semibold">Total Items</span>
                <span className="font-bold text-[var(--text-primary)] text-lg">{verifyResult.qty}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-[var(--border-light)]">
                <span className="text-[var(--text-secondary)] font-semibold">Collect Amount</span>
                <span className="font-bold text-[var(--text-primary)] text-2xl">₹{(verifyResult.qty * (verifyResult.price || 0)).toLocaleString('en-IN')}</span>
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
