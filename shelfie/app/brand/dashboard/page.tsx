"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, Suspense } from "react";
import Link from "next/link";

function BrandDashboardContent() {
  const brandId = "brand_dell"; // Hardcoded for demo
  const queryClient = useQueryClient();

  const { data: campaignData, isLoading } = useQuery({
    queryKey: ["campaigns", brandId],
    queryFn: async () => (await fetch(`/api/brand/campaigns?brandId=${brandId}`)).json(),
  });

  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ productKey: "", budget: "1000", cpc: "5" });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/brand/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          productKeys: [form.productKey.toLowerCase()],
          areaIds: ["tdr1vq"],
          budgetINR: Number(form.budget),
          costPerClickINR: Number(form.cpc)
        })
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", brandId] });
      setIsCreating(false);
      setForm({ productKey: "", budget: "1000", cpc: "5" });
    }
  });

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <header className="bg-slate-800 border-b border-white/5 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn-ghost !border-none !px-2 text-slate-400">← Home</Link>
          <div className="flex flex-col">
            <h1 className="font-bold text-xl text-white">Dell India</h1>
            <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Brand Portal</span>
          </div>
        </div>
        <button onClick={() => setIsCreating(true)} className="btn-primary py-2 text-sm">
          New Campaign
        </button>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-slate-800/50">
            <div className="text-sm text-slate-400 uppercase tracking-wider mb-2 font-medium">Active Campaigns</div>
            <div className="text-4xl font-bold text-white">{campaignData?.campaigns?.filter((c:any) => c.status === 'ACTIVE').length || 0}</div>
          </div>
          <div className="card bg-slate-800/50">
            <div className="text-sm text-slate-400 uppercase tracking-wider mb-2 font-medium">Unmet Local Demand</div>
            <div className="text-4xl font-bold text-orange-400">847 <span className="text-sm font-normal text-slate-500 lowercase tracking-normal">misses this week</span></div>
          </div>
          <div className="card bg-slate-800/50">
            <div className="text-sm text-slate-400 uppercase tracking-wider mb-2 font-medium">Pickups Driven</div>
            <div className="text-4xl font-bold text-emerald-400">142 <span className="text-sm font-normal text-slate-500 lowercase tracking-normal">via promoted listings</span></div>
          </div>
        </div>

        {/* Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-md bg-slate-800 border-indigo-500/30">
              <h2 className="text-xl font-bold mb-4">Create Sponsored Campaign</h2>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1 text-slate-300">Product Keyword</label>
                  <input type="text" required value={form.productKey} onChange={e => setForm({...form, productKey: e.target.value})} placeholder="e.g. laptop charger" className="input" />
                  <p className="text-xs text-slate-500 mt-1">We will boost shops holding this item.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1 text-slate-300">Budget (₹)</label>
                    <input type="number" required min="100" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} className="input" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-slate-300">Max CPC (₹)</label>
                    <input type="number" required min="1" value={form.cpc} onChange={e => setForm({...form, cpc: e.target.value})} className="input" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsCreating(false)} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary shadow-lg shadow-indigo-500/20">
                    {createMutation.isPending ? "Launching..." : "Launch Campaign"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-bold">Your Campaigns</h2>
          
          {isLoading ? (
            <div className="animate-pulse h-32 bg-slate-800 rounded-xl"></div>
          ) : campaignData?.campaigns?.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-xl border border-white/5">No active campaigns.</div>
          ) : (
            campaignData?.campaigns?.map((c: any) => (
              <div key={c.id} className="card flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 border-indigo-500/10 hover:border-indigo-500/30">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`badge ${c.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{c.status}</span>
                    <span className="text-xs text-slate-400 font-mono">{c.id.split('_')[1]}</span>
                  </div>
                  <div className="font-bold text-lg">{c.productKeys.join(", ")}</div>
                  <div className="text-sm text-slate-400 mt-1">Targeting {c.areaIds.length} local areas</div>
                </div>
                
                <div className="flex items-center gap-8 bg-slate-900/50 p-4 rounded-xl border border-white/5">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wider">Remaining</div>
                    <div className="font-bold text-xl text-indigo-400">₹{c.remainingINR}</div>
                    <div className="text-xs text-slate-500 mt-1">of ₹{c.budgetINR}</div>
                  </div>
                  
                  <div className="w-px h-10 bg-white/10"></div>
                  
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wider">Clicks</div>
                    <div className="font-bold text-xl text-white">{Math.floor((c.budgetINR - c.remainingINR) / c.costPerClickINR)}</div>
                    <div className="text-xs text-slate-500 mt-1">@ ₹{c.costPerClickINR}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function BrandDashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BrandDashboardContent />
    </Suspense>
  )
}
