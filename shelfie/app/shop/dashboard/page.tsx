"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useSearchParams, useRouter } from "next/navigation";
import { CountdownTimer } from "@/components/CountdownTimer";

export default function ShopDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Read shopId from URL for prototype flexibility, default to the electronics shop
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
  const [historySort, setHistorySort] = useState<"date"|"amount">("date");

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

  // Mark notifs read when opened
  useEffect(() => {
    if (notifs?.unreadCount > 0) {
      fetch(`/api/shop/${shopId}/notifications`, { method: "PATCH" });
    }
  }, [notifs?.unreadCount, shopId]);

  if (!shop) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Header */}
      <header className="bg-slate-800 border-b border-white/5 px-6 py-4 sticky top-0 z-20 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-xl">{shop.name}</h1>
          <p className="text-xs text-slate-400">ID: {shop.shopId} • Plan: {shop.plan?.id}</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm outline-none"
            value={shopId}
            onChange={(e) => router.push(`/shop/dashboard?s=${e.target.value}`)}
          >
            <option value="shop_km_01">Demo: Sri Ganesh Electronics</option>
            <option value="shop_km_02">Demo: Koramangala Pharma</option>
            <option value="shop_km_03">Demo: Daily Needs Store</option>
          </select>
          <button onClick={() => router.push(`/shop/inventory?s=${shopId}`)} className="btn-ghost text-sm hidden md:block">
            Manage Inventory
          </button>
        </div>
      </header>

      {/* Demo Banner */}
      <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-6 py-2 text-center text-xs text-indigo-300">
        Demo Mode Active: WhatsApp notifications are simulated in the notification panel below.
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Actions & Stats */}
        <div className="space-y-6">
          
          {/* Verify Code */}
          <div className="card border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent relative">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Customer Pickup
            </h2>
            <form onSubmit={e => { e.preventDefault(); verifyMutation.mutate(verifyCode); }} className="flex gap-2">
              <input 
                type="text" 
                placeholder="6-digit code" 
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value)}
                maxLength={6}
                className="input text-center text-xl tracking-[0.5em] font-mono"
              />
              <button type="submit" disabled={verifyCode.length !== 6 || verifyMutation.isPending} className="btn-primary">
                Verify
              </button>
            </form>
            {verifyError && (
              <div className="mt-3 text-sm p-2 rounded bg-red-500/20 text-red-400">
                {verifyError}
              </div>
            )}
            {verifyResult && (
              <div className="absolute top-0 left-0 w-full h-full bg-emerald-900/90 backdrop-blur-sm rounded-2xl flex items-center justify-center p-6 z-10 border border-emerald-500 shadow-2xl">
                <div className="text-center w-full">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="font-bold text-emerald-400 text-lg mb-2">Code Verified!</h3>
                  <div className="bg-emerald-950/50 rounded-lg p-3 text-left space-y-2 text-sm border border-emerald-500/30">
                    <div className="flex justify-between border-b border-emerald-500/20 pb-2">
                      <span className="text-emerald-200/60">Customer Phone:</span>
                      <span className="font-mono text-emerald-100">{verifyResult.customerPhone || 'Walk-in'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-200/60">Items ({verifyResult.qty}x):</span>
                      <span className="text-emerald-100 font-medium">Verified in System</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-emerald-500/20 text-emerald-400 font-bold">
                      <span>Total Billing:</span>
                      <span>₹{(verifyResult.qty * (verifyResult.price || 0)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <button onClick={() => setVerifyResult(null)} className="btn-ghost mt-4 w-full text-emerald-400 hover:bg-emerald-500/20">Done</button>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card bg-slate-800/50 text-center">
              <div className="text-3xl font-bold text-white mb-1">₹{(resData?.totalRevenue || 0).toLocaleString('en-IN')}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Total Revenue</div>
            </div>
            <div className="card bg-slate-800/50 text-center">
              <div className="text-3xl font-bold text-white mb-1">{resData?.active?.length || 0}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Active Holds</div>
            </div>
          </div>
        </div>

        {/* Middle Col: Incoming Requests & Active Reservations */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="font-bold text-xl flex items-center gap-2">
            Incoming Requests
            {requests?.requests?.filter((r:any) => r.status === 'PENDING').length > 0 && (
              <span className="pulse-dot orange ml-2"></span>
            )}
          </h2>
          
          <div className="space-y-4">
            {requests?.requests?.length === 0 ? (
              <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-2xl">No new requests.</div>
            ) : (
              requests?.requests?.map((req: any) => (
                <div key={req.id} className={`card ${req.status === 'PENDING' ? 'border-orange-500/50 bg-orange-500/5' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                       <div className="text-4xl">{req.imageEmoji || '📦'}</div>
                       <div>
                         <div className="font-bold text-lg">{req.productName}</div>
                         <div className="text-slate-400 text-sm mt-1">Customer ETA: <span className="text-white font-medium">{req.etaMinutes} mins</span> • Qty: {req.qty}</div>
                         <div className="text-xs text-slate-500 mt-1">{formatDistanceToNow(new Date(req.createdAt))} ago</div>
                       </div>
                    </div>
                    
                    <div className="text-right">
                      {req.status === 'PENDING' && (
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => respondMutation.mutate({ id: req.id, decision: 'ACCEPT' })}
                            className="btn-success text-sm py-1.5 px-4"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => respondMutation.mutate({ id: req.id, decision: 'DECLINE' })}
                            className="btn-ghost text-sm py-1.5 px-4 !text-red-400 !border-red-500/30"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {req.status === 'ACCEPTED' && <span className="badge badge-green">Accepted</span>}
                      {req.status === 'DECLINED' && <span className="badge badge-red">Declined</span>}
                      {req.status === 'EXPIRED' && <span className="badge badge-gray">Expired</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <h2 className="font-bold text-xl mt-12 mb-4">Active Reservations (Awaiting Pickup)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resData?.active?.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-2xl">No items currently held.</div>
            ) : (
              resData?.active?.map((r: any) => (
                <div key={r.id} className="card bg-slate-800/80 border-slate-700">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono bg-slate-700 px-2 py-1 rounded text-slate-300">Code: {r.pickupCode}</span>
                    <span className="text-xs text-slate-400 flex flex-col items-end gap-1">
                      <span>{formatDistanceToNow(new Date(r.createdAt))} ago</span>
                      <span className="text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded">
                        <CountdownTimer 
                          expiresAt={r.expiresAt} 
                          onExpire={() => queryClient.invalidateQueries({ queryKey: ["shop-reservations", shopId] })} 
                        />
                      </span>
                    </span>
                  </div>
                  <div className="font-bold">{r.productName}</div>
                  <div className="text-sm text-slate-400 flex justify-between mt-2">
                    <span>Qty: {r.qty}</span>
                    <span className="text-emerald-400 font-medium">₹{r.productPrice * r.qty}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-end mt-12 mb-4">
            <h2 className="font-bold text-xl">Completed Purchases</h2>
            <select 
              value={historySort} 
              onChange={e => setHistorySort(e.target.value as any)}
              className="bg-slate-800 text-xs border border-slate-700 rounded px-2 py-1 outline-none"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
            </select>
          </div>
          <div className="bg-slate-800/30 rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-400 border-b border-white/5">
                <tr>
                  <th className="p-4 font-medium">Item</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(resData?.history || [])
                  .sort((a: any, b: any) => historySort === 'amount' 
                    ? (b.productPrice * b.qty) - (a.productPrice * a.qty) 
                    : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-200">{r.productName}</div>
                      <div className="text-xs text-slate-500">Qty: {r.qty} • Phone: {r.customerPhone}</div>
                    </td>
                    <td className="p-4 font-medium text-emerald-400">₹{r.productPrice * r.qty}</td>
                    <td className="p-4 text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      {r.status === 'COMPLETED' ? (
                        <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs">Completed</span>
                      ) : (
                        <span className="text-slate-500 bg-slate-500/10 px-2 py-1 rounded text-xs">{r.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {resData?.history?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">No purchase history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Notifications Drawer (Simulated WhatsApp) */}
      <div className="fixed bottom-0 right-0 w-full md:w-96 bg-slate-800 border-t md:border-l md:border-t-0 border-white/10 rounded-tl-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '50vh' }}>
        <div className="bg-slate-900 px-4 py-3 border-b border-white/5 font-semibold text-sm flex justify-between items-center">
          Simulated Notifications
          {notifs?.unreadCount > 0 && (
            <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full">{notifs.unreadCount} New</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0d1525]">
          {notifs?.notifications?.map((n: any) => (
            <div key={n.id} className="bg-[#1e293b] p-3 rounded-lg border border-white/5 shadow-sm text-sm relative">
              <div className="font-semibold text-indigo-300 mb-1">{n.title}</div>
              <div className="text-slate-300 whitespace-pre-wrap">{n.body}</div>
              <div className="text-[10px] text-slate-500 text-right mt-2">{new Date(n.createdAt).toLocaleTimeString()}</div>
            </div>
          ))}
          {notifs?.notifications?.length === 0 && <div className="text-center text-slate-500 text-sm mt-10">No notifications</div>}
        </div>
      </div>
    </div>
  );
}
