"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

function InventoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const shopId = user?.shopId || searchParams.get("s") || "shop_km_01";
  const queryClient = useQueryClient();

  const { data: shop } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: async () => (await fetch(`/api/shop/${shopId}`)).json(),
  });

  const { data: inventory } = useQuery({
    queryKey: ["inventory", shopId],
    queryFn: async () => (await fetch(`/api/shop/${shopId}/inventory`)).json(),
  });

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", category: "electronics", price: "", onlineQty: "0", offlineQty: "5", emoji: "📦" });
  const [addError, setAddError] = useState("");

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/shop/${shopId}/upgrade`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      alert("Upgraded to PRO successfully (Simulated)");
    }
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/shop/${shopId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || resData.error);
      return resData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      setIsAdding(false);
      setAddError("");
    },
    onError: (err: any) => {
      setAddError(err.message);
    }
  });

  const rebalanceMutation = useMutation({
    mutationFn: async ({ inventoryId, onlineQty, offlineQty }: any) => {
      const res = await fetch(`/api/shop/${shopId}/pools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId, onlineQty, offlineQty }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (inventoryId: string) => {
      const res = await fetch(`/api/shop/${shopId}/inventory?id=${inventoryId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
    }
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      name: addForm.name,
      category: addForm.category,
      price: Number(addForm.price),
      onlineQty: Number(addForm.onlineQty),
      offlineQty: Number(addForm.offlineQty),
      imageEmoji: addForm.emoji
    });
  };

  if (!shop) return <div className="p-8">Loading...</div>;

  const isFree = shop.plan?.id === "FREE";

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <header className="bg-slate-800 border-b border-white/5 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/shop/dashboard")} className="btn-ghost !border-none !px-2">← Back</button>
          <h1 className="font-bold text-xl">Inventory Management</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 hidden sm:inline">{shop.productCount} products</span>
          <Link href="/shop/onboard" className="btn-ghost py-2 text-sm border-indigo-500/30 text-indigo-400">
            ✨ AI Onboard
          </Link>
          <button onClick={() => setIsAdding(true)} className="btn-primary py-2 text-sm">Add Item</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        
        {/* Upgrade Banner */}
        {isFree && (
          <div className="card bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-indigo-400">Upgrade to PRO</h3>
              <p className="text-sm text-slate-400 mt-1">You are on the FREE plan (max 20 products). Upgrade to add up to 1000 products and enable sponsored listings.</p>
            </div>
            <button onClick={() => upgradeMutation.mutate()} disabled={upgradeMutation.isPending} className="btn-primary shrink-0 ml-4">
              {upgradeMutation.isPending ? "Upgrading..." : "Upgrade Now"}
            </button>
          </div>
        )}

        {/* Add Modal */}
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-md bg-slate-800">
              <h2 className="text-xl font-bold mb-4">Add Product</h2>
              {addError && <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4 text-sm">{addError}</div>}
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Name</label>
                  <input type="text" required value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} className="input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Category</label>
                    <select required value={addForm.category} onChange={e => setAddForm({...addForm, category: e.target.value})} className="input py-2">
                      <option value="electronics">Electronics</option>
                      <option value="pharmacy">Pharmacy / Medical</option>
                      <option value="grocery">Grocery & Essentials</option>
                      <option value="stationery">Stationery</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Price (₹)</label>
                    <input type="number" required min="0" value={addForm.price} onChange={e => setAddForm({...addForm, price: e.target.value})} className="input" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Online Qty</label>
                    <input type="number" required min="0" value={addForm.onlineQty} onChange={e => setAddForm({...addForm, onlineQty: e.target.value})} className="input" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Offline Qty</label>
                    <input type="number" required min="0" value={addForm.offlineQty} onChange={e => setAddForm({...addForm, offlineQty: e.target.value})} className="input" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Emoji</label>
                    <input type="text" value={addForm.emoji} onChange={e => setAddForm({...addForm, emoji: e.target.value})} className="input text-center" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setIsAdding(false); setAddError(""); }} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={addMutation.isPending} className="btn-primary">
                    {addMutation.isPending ? "Adding..." : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Inventory List */}
        <div className="space-y-4">
          {inventory?.inventory?.map((item: any) => (
            <div key={item.id} className="card flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="text-3xl bg-slate-800 w-12 h-12 rounded flex items-center justify-center">{item.imageEmoji}</div>
                <div>
                  <div className="font-bold">{item.name}</div>
                  <div className="text-sm text-slate-400 capitalize">{item.category} • ₹{item.price}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">Online Qty</div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => rebalanceMutation.mutate({ inventoryId: item.id, onlineQty: Math.max(0, item.onlineQty - 1), offlineQty: item.offlineQty })} className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600">-</button>
                    <span className="font-mono w-6 text-center">{item.onlineQty}</span>
                    <button onClick={() => rebalanceMutation.mutate({ inventoryId: item.id, onlineQty: item.onlineQty + 1, offlineQty: item.offlineQty })} className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600">+</button>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">Offline Qty</div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => rebalanceMutation.mutate({ inventoryId: item.id, onlineQty: item.onlineQty, offlineQty: Math.max(0, item.offlineQty - 1) })} className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600">-</button>
                    <span className="font-mono w-6 text-center text-slate-300">{item.offlineQty}</span>
                    <button onClick={() => rebalanceMutation.mutate({ inventoryId: item.id, onlineQty: item.onlineQty, offlineQty: item.offlineQty + 1 })} className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600">+</button>
                  </div>
                </div>
                
                <button 
                  onClick={() => { if(confirm('Delete this item?')) deleteMutation.mutate(item.id) }} 
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg ml-4 transition-colors"
                  title="Delete Item"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InventoryContent />
    </Suspense>
  )
}
