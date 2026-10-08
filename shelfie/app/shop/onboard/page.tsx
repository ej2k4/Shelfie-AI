"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

type Step = "SELECT_METHOD" | "UPLOADING" | "REVIEW";

export default function OnboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const shopId = user?.shopId || "shop_km_01";
  
  const [step, setStep] = useState<Step>("SELECT_METHOD");
  const [extractedItems, setExtractedItems] = useState<any[]>([]);

  // Simulate AI Vision processing
  const handlePhotoUpload = () => {
    setStep("UPLOADING");
    setTimeout(() => {
      setExtractedItems([
        { id: 1, name: "Dove Soap Bar (100g)", category: "grocery", price: 65, onlineQty: 5, offlineQty: 10, emoji: "🧼", selected: true },
        { id: 2, name: "Colgate Strong Teeth (200g)", category: "grocery", price: 120, onlineQty: 5, offlineQty: 15, emoji: "🪥", selected: true },
        { id: 3, name: "Maggi 2-Minute Noodles", category: "grocery", price: 14, onlineQty: 20, offlineQty: 30, emoji: "🍜", selected: true },
        { id: 4, name: "Unknown Bottle", category: "misc", price: 0, onlineQty: 0, offlineQty: 0, emoji: "🧴", selected: false },
      ]);
      setStep("REVIEW");
    }, 2500); // 2.5s simulated processing delay
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      const selected = extractedItems.filter(i => i.selected);
      for (const item of selected) {
        await fetch(`/api/shop/${shopId}/inventory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            category: item.category,
            price: Number(item.price),
            onlineQty: Number(item.onlineQty),
            offlineQty: Number(item.offlineQty),
            imageEmoji: item.emoji
          })
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
      router.push("/shop/inventory");
    }
  });

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <header className="bg-slate-800 border-b border-white/5 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/shop/inventory" className="btn-ghost !border-none !px-2 text-slate-400">← Back</Link>
          <h1 className="font-bold text-xl">Fast Onboarding</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 mt-8">
        {step === "SELECT_METHOD" && (
          <div className="space-y-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Add stock in seconds</h2>
              <p className="text-slate-400">Skip the manual entry. Let Shelfie AI scan your shelves.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="card card-hover bg-slate-800/50 p-8 flex flex-col items-center justify-center text-center gap-4 border-indigo-500/20 hover:border-indigo-500/50 cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handlePhotoUpload();
                    }
                  }} 
                />
                <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">Snap a Photo</h3>
                  <p className="text-sm text-slate-400">Take a picture of a shelf. We'll identify products, count them, and set prices.</p>
                </div>
              </label>

              <button className="card bg-slate-800/30 p-8 flex flex-col items-center justify-center text-center gap-4 border-dashed border-white/10 opacity-70 cursor-not-allowed">
                <div className="w-16 h-16 rounded-full bg-slate-700/50 text-slate-500 flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-300 mb-1">Voice Dictation (Coming Soon)</h3>
                  <p className="text-sm text-slate-500">Just read your stock out loud in English, Hindi, or Kannada.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === "UPLOADING" && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="relative w-24 h-24">
               <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
               <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">Analyzing Shelf Photo...</h2>
              <p className="text-slate-400 text-sm animate-pulse">Running Azure OpenAI Vision model...</p>
            </div>
          </div>
        )}

        {step === "REVIEW" && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Review & Publish</h2>
                <p className="text-slate-400">Shelfie AI found 4 items. Review and set your online/offline split.</p>
              </div>
            </div>

            <div className="space-y-4">
              {extractedItems.map((item, idx) => (
                <div key={item.id} className={`card p-4 flex gap-4 transition-all ${item.selected ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/5 bg-slate-800/30 opacity-60'}`}>
                  <div className="pt-2">
                    <input 
                      type="checkbox" 
                      checked={item.selected}
                      onChange={(e) => {
                        const copy = [...extractedItems];
                        copy[idx].selected = e.target.checked;
                        setExtractedItems(copy);
                      }}
                      className="w-5 h-5 accent-indigo-500 rounded"
                    />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5 flex gap-3">
                       <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center text-xl shrink-0">{item.emoji}</div>
                       <div>
                         <input 
                           type="text" 
                           value={item.name} 
                           onChange={(e) => {
                             const copy = [...extractedItems]; copy[idx].name = e.target.value; setExtractedItems(copy);
                           }}
                           className="bg-transparent border-b border-white/10 outline-none w-full font-bold text-white mb-1 focus:border-indigo-500"
                         />
                         <div className="text-xs text-slate-500 uppercase">{item.category}</div>
                       </div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-slate-400 mb-1">Price (₹)</div>
                      <input type="number" value={item.price} onChange={e => { const copy = [...extractedItems]; copy[idx].price = Number(e.target.value); setExtractedItems(copy); }} className="input !py-1 !px-2" />
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-slate-400 mb-1">Online Qty</div>
                      <input type="number" value={item.onlineQty} onChange={e => { const copy = [...extractedItems]; copy[idx].onlineQty = Number(e.target.value); setExtractedItems(copy); }} className="input !py-1 !px-2" />
                    </div>
                    <div className="md:col-span-3">
                      <div className="text-xs text-slate-400 mb-1">Offline Qty (Back room)</div>
                      <input type="number" value={item.offlineQty} onChange={e => { const copy = [...extractedItems]; copy[idx].offlineQty = Number(e.target.value); setExtractedItems(copy); }} className="input !py-1 !px-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center bg-slate-800/80 p-4 rounded-xl border border-white/10 sticky bottom-6 backdrop-blur-md">
              <div className="text-slate-300">
                <span className="font-bold text-white">{extractedItems.filter(i => i.selected).length}</span> items selected
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("SELECT_METHOD")} className="btn-ghost">Cancel</button>
                <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending || extractedItems.filter(i => i.selected).length === 0} className="btn-primary shadow-lg shadow-indigo-500/20">
                  {publishMutation.isPending ? "Publishing..." : "Add to Inventory"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
