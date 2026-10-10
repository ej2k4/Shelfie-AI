"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { PremiumLoader } from "@/components/PremiumLoader";

function InventoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const shopId = user?.shopId || searchParams.get("s") || "shop_km_03";
  const queryClient = useQueryClient();

  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: async () => (await fetch(`/api/shop/${shopId}`)).json(),
  });

  const { data: inventory, isLoading: invLoading } = useQuery({
    queryKey: ["inventory", shopId],
    queryFn: async () => (await fetch(`/api/shop/${shopId}/inventory`)).json(),
  });

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    category: "grocery",
    price: "",
    onlineQty: "5",
    offlineQty: "10",
    emoji: "📦"
  });
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
      alert("Store upgraded to PRO plan successfully (Simulated)");
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
      setAddForm({ name: "", category: "grocery", price: "", onlineQty: "5", offlineQty: "10", emoji: "📦" });
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
      if (!res.ok) throw new Error("Failed to rebalance inventory");
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
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
    }
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      name: addForm.name.trim(),
      category: addForm.category,
      price: Number(addForm.price),
      onlineQty: Number(addForm.onlineQty),
      offlineQty: Number(addForm.offlineQty),
      imageEmoji: addForm.emoji.trim() || "📦"
    });
  };

  if (shopLoading || !shop) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
        <PremiumLoader text="Loading shelf inventory..." />
      </div>
    );
  }

  const isFree = shop.plan?.id === "FREE";
  const items = inventory?.inventory || [];

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] pb-24 text-[var(--text-primary)]">
      {/* ── TOP NAVIGATION BAR ─────────────────────────────────────── */}
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border-sm)] px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-[var(--shadow-xs)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/shop/dashboard?s=${shopId}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] border border-[var(--border-sm)] transition-all shadow-[var(--shadow-xs)]"
            >
              <span>←</span>
              <span>Counter POS</span>
            </button>
            <div className="h-4 w-px bg-[var(--border-sm)] hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight text-[var(--text-primary)]">
                  Inventory & Stock
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border border-[var(--border-xs)]">
                  {shop.name}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">
                Manage live online hold quotas and walk-in offline shelf pools
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--brand-100)] text-[var(--brand-700)] border border-[var(--brand-200)]">
              {items.length} {items.length === 1 ? "Product" : "Products"}
            </span>

            <Link
              href="/shop/onboard"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--brand-600)] bg-[var(--brand-50)] hover:bg-[var(--brand-100)] border border-[var(--brand-200)] transition-all shadow-[var(--shadow-xs)]"
            >
              <span>✨</span>
              <span>AI Shelf Scan</span>
            </Link>

            <button
              onClick={() => setIsAdding(true)}
              className="btn btn-primary !px-3.5 !py-1.5 !text-xs !font-bold !rounded-xl flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Add Item</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* Upgrade Banner for FREE Tier */}
        {isFree && (
          <div className="relative overflow-hidden rounded-2xl p-5 border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-blue-50/60 shadow-[var(--shadow-sm)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white shadow-xs">
                <span>⚡</span>
                <span>FREE TIER (Max 20 Products)</span>
              </div>
              <h3 className="text-base font-bold text-indigo-950 mt-1">
                Unlock Unlimited Catalog & Verified Local Placement
              </h3>
              <p className="text-xs text-indigo-800/80 max-w-xl leading-relaxed">
                Upgrade to PRO to stock up to 1,000 items, get highlighted shelf ranking in neighborhood searches, and priority WhatsApp order notifications.
              </p>
            </div>
            <button
              onClick={() => upgradeMutation.mutate()}
              disabled={upgradeMutation.isPending}
              className="shrink-0 px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {upgradeMutation.isPending ? "Upgrading Store..." : "Upgrade to PRO (₹499/mo)"}
            </button>
          </div>
        )}

        {/* Add Product Modal */}
        {isAdding && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-md)] rounded-2xl w-full max-w-md p-6 shadow-[var(--shadow-xl)] animate-scaleIn">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-xs)] mb-4">
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Add New Shelf Item</h2>
                  <p className="text-xs text-[var(--text-muted)]">Configure price and inventory pool split</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setAddError(""); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors"
                >
                  ✕
                </button>
              </div>

              {addError && (
                <div className="bg-[var(--red-bg)] border border-[var(--red-border)] text-[var(--red)] p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{addError}</span>
                </div>
              )}

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Salt 1kg, Dolo 650"
                    value={addForm.name}
                    onChange={e => setAddForm({...addForm, name: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-sm)] text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--brand-500)] focus:bg-[var(--bg-surface)] transition-all shadow-[var(--shadow-xs)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Category</label>
                    <select
                      required
                      value={addForm.category}
                      onChange={e => setAddForm({...addForm, category: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-sm)] text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--brand-500)] focus:bg-[var(--bg-surface)] transition-all shadow-[var(--shadow-xs)] cursor-pointer"
                    >
                      <option value="grocery">Grocery & Essentials</option>
                      <option value="electronics">Electronics</option>
                      <option value="pharmacy">Pharmacy / Meds</option>
                      <option value="stationery">Stationery</option>
                      <option value="bakery">Bakery / Dairy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Price (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="99"
                      value={addForm.price}
                      onChange={e => setAddForm({...addForm, price: e.target.value})}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-sm)] text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--brand-500)] focus:bg-[var(--bg-surface)] transition-all shadow-[var(--shadow-xs)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Online Hold</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={addForm.onlineQty}
                      onChange={e => setAddForm({...addForm, onlineQty: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-sm)] text-xs font-medium text-[var(--text-primary)] text-center outline-none focus:border-[var(--brand-500)] shadow-[var(--shadow-xs)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Offline Walk-in</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={addForm.offlineQty}
                      onChange={e => setAddForm({...addForm, offlineQty: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-sm)] text-xs font-medium text-[var(--text-primary)] text-center outline-none focus:border-[var(--brand-500)] shadow-[var(--shadow-xs)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Emoji Icon</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={addForm.emoji}
                      onChange={e => setAddForm({...addForm, emoji: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-sm)] text-xs font-medium text-[var(--text-primary)] text-center outline-none focus:border-[var(--brand-500)] shadow-[var(--shadow-xs)]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-xs)]">
                  <button
                    type="button"
                    onClick={() => { setIsAdding(false); setAddError(""); }}
                    className="btn btn-secondary !px-4 !py-2 !text-xs !font-bold !rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addMutation.isPending}
                    className="btn btn-primary !px-5 !py-2 !text-xs !font-bold !rounded-xl"
                  >
                    {addMutation.isPending ? "Adding Item..." : "Add to Shelf"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Inventory Items List */}
        {invLoading ? (
          <div className="py-12 flex justify-center">
            <PremiumLoader text="Refreshing inventory items..." />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-sm)] rounded-2xl p-12 text-center max-w-lg mx-auto shadow-[var(--shadow-xs)]">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-100)] text-[var(--brand-600)] flex items-center justify-center text-2xl mx-auto mb-3">
              📦
            </div>
            <h3 className="font-bold text-base text-[var(--text-primary)]">Shelf is currently empty</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-5">
              Stock items on your shelves to start appearing in neighborhood searches and taking holds.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsAdding(true)}
                className="btn btn-primary !px-4 !py-2 !text-xs !font-bold !rounded-xl"
              >
                + Add First Product
              </button>
              <Link
                href="/shop/onboard"
                className="btn btn-secondary !px-4 !py-2 !text-xs !font-bold !rounded-xl"
              >
                ✨ AI Shelf Scan
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-[var(--text-muted)]">
              <span>ITEM DETAILS</span>
              <span className="hidden sm:inline">STOCK REBALANCING (ONLINE HOLD / OFFLINE WALK-IN)</span>
            </div>

            {items.map((item: any) => (
              <div
                key={item.id}
                className="bg-[var(--bg-surface)] border border-[var(--border-sm)] hover:border-[var(--border-md)] rounded-2xl p-4 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Product Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-xs)] flex items-center justify-center text-2xl shrink-0">
                    {item.imageEmoji || "📦"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-bold text-[var(--brand-600)] bg-[var(--brand-50)] px-2 py-0.5 rounded-md border border-[var(--brand-100)]">
                        ₹{item.price}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] capitalize">
                        • {item.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Quantity Steppers & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-xs)]">
                  {/* Online Hold Quota Stepper */}
                  <div className="text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-600)] mb-1">
                      Online Reserve
                    </div>
                    <div className="flex items-center gap-1.5 bg-[var(--bg-surface-2)] border border-[var(--border-xs)] rounded-xl p-1">
                      <button
                        onClick={() => rebalanceMutation.mutate({
                          inventoryId: item.id,
                          onlineQty: Math.max(0, item.onlineQty - 1),
                          offlineQty: item.offlineQty
                        })}
                        className="w-6 h-6 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-3)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center border border-[var(--border-xs)] shadow-2xs transition-colors"
                        title="Decrease online quota"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold w-6 text-center text-[var(--text-primary)]">
                        {item.onlineQty}
                      </span>
                      <button
                        onClick={() => rebalanceMutation.mutate({
                          inventoryId: item.id,
                          onlineQty: item.onlineQty + 1,
                          offlineQty: item.offlineQty
                        })}
                        className="w-6 h-6 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-3)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center border border-[var(--border-xs)] shadow-2xs transition-colors"
                        title="Increase online quota"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Offline Walk-in Quota Stepper */}
                  <div className="text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Walk-in Shelf
                    </div>
                    <div className="flex items-center gap-1.5 bg-[var(--bg-surface-2)] border border-[var(--border-xs)] rounded-xl p-1">
                      <button
                        onClick={() => rebalanceMutation.mutate({
                          inventoryId: item.id,
                          onlineQty: item.onlineQty,
                          offlineQty: Math.max(0, item.offlineQty - 1)
                        })}
                        className="w-6 h-6 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-3)] text-[var(--text-secondary)] font-bold text-xs flex items-center justify-center border border-[var(--border-xs)] shadow-2xs transition-colors"
                        title="Decrease offline quota"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold w-6 text-center text-[var(--text-secondary)]">
                        {item.offlineQty}
                      </span>
                      <button
                        onClick={() => rebalanceMutation.mutate({
                          inventoryId: item.id,
                          onlineQty: item.onlineQty,
                          offlineQty: item.offlineQty + 1
                        })}
                        className="w-6 h-6 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-3)] text-[var(--text-secondary)] font-bold text-xs flex items-center justify-center border border-[var(--border-xs)] shadow-2xs transition-colors"
                        title="Increase offline quota"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Delete Item Button */}
                  <button
                    onClick={() => {
                      if (confirm(`Remove "${item.name}" from your shelf inventory?`)) {
                        deleteMutation.mutate(item.id);
                      }
                    }}
                    className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] border border-transparent hover:border-[var(--red-border)] transition-all ml-1"
                    title="Remove item"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
          <PremiumLoader text="Loading shelf inventory..." />
        </div>
      }
    >
      <InventoryContent />
    </Suspense>
  );
}
