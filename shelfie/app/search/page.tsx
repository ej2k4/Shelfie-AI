"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import type { SearchOffer } from "@/lib/types";
import { useCart } from "@/lib/cart";

// Dynamic import for Leaflet map to avoid SSR issues
const Map = dynamic(() => import("@/components/Map"), { ssr: false, loading: () => <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center text-slate-500">Loading map...</div> });

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  
  // Default to Koramangala area for demo if geolocation fails
  const [lat, setLat] = useState(12.9352);
  const [lng, setLng] = useState(77.6245);
  const [locating, setLocating] = useState(true);
  const [sort, setSort] = useState<"distance" | "price" | "open">("distance");

  useEffect(() => {
    // Attempt HTML5 Geolocation
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
          setLocating(false);
        },
        (error) => {
          console.warn("Geolocation failed/denied, falling back to Koramangala demo location", error);
          // Fallback to Koramangala, Bengaluru
          setLat(12.9352);
          setLng(77.6245);
          setLocating(false);
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    } else {
      // Fallback
      setLat(12.9352);
      setLng(77.6245);
      setLocating(false);
    }
  }, []);

  const { data, isLoading } = useQuery<{ offers: SearchOffer[], total: number }>({
    queryKey: ["search", q, lat, lng, sort],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&lat=${lat}&lng=${lng}&sort=${sort}`);
      return res.json();
    },
    enabled: !locating && !!q,
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex items-center gap-4 z-10 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg">
            S
          </div>
        </div>
        <form className="flex-1 max-w-xl" onSubmit={(e) => { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(e.currentTarget.q.value)}`); }}>
          <div className="relative">
            <input 
              name="q" 
              defaultValue={q} 
              placeholder="Search items..." 
              className="input pl-10 py-2"
            />
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>
        <CartHeaderButton />
      </header>

      {/* Main content: Map (left) + List (right) on desktop, stacked on mobile */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        
        {/* Map Area */}
        <div className="flex-1 relative order-2 md:order-1 h-[40vh] md:h-full">
          {locating ? (
             <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">Finding your location...</div>
          ) : (
            <Map offers={data?.offers || []} center={[lat, lng]} />
          )}
        </div>

        {/* Results List */}
        <div className="w-full md:w-[450px] lg:w-[500px] border-l border-white/5 bg-slate-900 flex flex-col order-1 md:order-2 shrink-0">
          <div className="p-4 border-b border-white/5 flex justify-between items-center shrink-0">
            <h2 className="font-semibold text-lg">
              {isLoading ? "Searching..." : `${data?.total || 0} shops nearby`}
            </h2>
            <div className="flex gap-2 text-sm">
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 outline-none"
                value={sort}
                onChange={e => setSort(e.target.value as typeof sort)}
              >
                <option value="distance">Closest</option>
                <option value="price">Cheapest</option>
                <option value="open">Open Now</option>
              </select>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
               <div className="space-y-4">
                 {[1,2,3].map(i => <div key={i} className="h-40 rounded-xl bg-slate-800/50 animate-pulse" />)}
               </div>
            ) : data?.offers?.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No shops found with this item.</p>
                <button className="mt-4 btn-ghost text-sm">Notify me when in stock</button>
              </div>
            ) : (
              data?.offers?.map((offer, idx) => (
                <OfferCard key={`${offer.shopId}-${offer.inventoryId}-${idx}`} offer={offer} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OfferCard({ offer }: { offer: SearchOffer }) {
  const router = useRouter();
  const { addItem, items } = useCart();
  
  const inCart = items.find(i => i.inventoryId === offer.inventoryId);

  return (
    <div className={`card card-hover p-5 relative overflow-hidden ${offer.sponsored ? 'border-indigo-500/50 bg-indigo-500/5' : ''}`}>
      {offer.sponsored && (
        <div className="absolute top-0 right-0 bg-indigo-500/20 text-indigo-400 text-[0.65rem] font-bold px-2 py-1 uppercase rounded-bl-lg">
          Promoted
        </div>
      )}
      
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg mb-1">{offer.productName}</h3>
          <p className="text-slate-400 text-sm">{offer.shopName}</p>
        </div>
        <div className="text-right">
          <div className="font-bold text-xl">₹{offer.price}</div>
          <div className="text-xs text-slate-500 mt-1">{offer.distanceM < 1000 ? `${offer.distanceM}m` : `${(offer.distanceM/1000).toFixed(1)}km`} away</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {offer.inStock ? (
          <span className="badge badge-green"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> In Stock ({offer.onlineQty})</span>
        ) : offer.requestable ? (
           <span className="badge badge-orange">Ask Shopkeeper</span>
        ) : null}
        
        {offer.openNow ? (
          <span className="badge badge-gray text-xs font-normal">Open · {offer.walkMinutes} min walk</span>
        ) : (
          <span className="badge badge-red text-xs font-normal">Closed</span>
        )}
        
        <span className="text-[0.7rem] text-slate-500 flex items-center ml-auto">
          Updated {offer.freshnessMins < 60 ? `${offer.freshnessMins}m ago` : 'today'}
        </span>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex gap-3">
        {offer.inStock ? (
           <button 
             onClick={() => addItem({
               inventoryId: offer.inventoryId,
               shopId: offer.shopId,
               shopName: offer.shopName,
               productName: offer.productName,
               price: offer.price,
               imageEmoji: offer.imageEmoji || '📦'
             })}
             className={`btn-primary w-full justify-center text-center shadow-lg transition-all ${inCart ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500/50 text-white shadow-emerald-500/25' : 'hover:shadow-indigo-500/25'}`}
           >
             {inCart ? `Added to Bag (${inCart.qty})` : 'Add to Bag'}
           </button>
        ) : offer.requestable ? (
           <Link 
            href={`/request?s=${offer.shopId}&i=${offer.inventoryId}`}
            className="w-full justify-center text-center btn-ghost border-orange-500/30 text-orange-400 hover:bg-orange-500/10 shadow-lg hover:shadow-orange-500/20"
           >
             Request Item
           </Link>
        ) : null}
      </div>
    </div>
  );
}

function CartHeaderButton() {
  const { items, total } = useCart();
  const qty = items.reduce((sum, item) => sum + item.qty, 0);
  
  if (qty === 0) return null;
  
  return (
    <Link href="/cart" className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-500/10 shrink-0">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      <div className="font-bold">
        <span>{qty}</span> <span className="hidden sm:inline">item{qty !== 1 && 's'}</span>
      </div>
      <div className="text-indigo-400/50 hidden sm:block">|</div>
      <div className="font-mono text-sm hidden sm:block">₹{total}</div>
    </Link>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-slate-900 flex items-center justify-center">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
