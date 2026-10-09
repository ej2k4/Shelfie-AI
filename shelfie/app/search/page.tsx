"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import type { SearchOffer } from "@/lib/types";
import { useCart } from "@/lib/cart";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { PremiumLoader } from "@/components/PremiumLoader";

const ShelfieMap = dynamic(() => import("@/components/Map"), { ssr: false, loading: () => <div className="w-full h-full bg-[var(--bg-canvas)] flex items-center justify-center"><PremiumLoader text="Loading map..." /></div> });

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  
  const { lat, lng, locating } = useGeolocation();
  const [sort, setSort] = useState<"distance" | "price" | "open">("distance");
  
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const { data, isLoading, isError } = useQuery<{ offers: SearchOffer[], total: number }>({
    queryKey: ["search", q, lat, lng, sort],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&lat=${lat}&lng=${lng}&sort=${sort}`);
      if (!res.ok) throw new Error("Search API error");
      const json = await res.json();
      // Normalise — API always returns {offers, total} but guard anyway
      return { offers: Array.isArray(json?.offers) ? json.offers : [], total: json?.total ?? 0 };
    },
    enabled: !locating,
  });

  const safeOffers: SearchOffer[] = data?.offers ?? [];

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[var(--bg-canvas)]">
      {/* Header */}
      <header className="px-4 md:px-6 py-3 border-b border-[var(--border-sm)] bg-[var(--bg-surface)] flex flex-col gap-3 md:gap-4 z-10 shrink-0 shadow-[var(--shadow-xs)] relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <div className="flex items-center gap-1.5 mr-2">
              <span className="font-extrabold text-xl tracking-tight text-[var(--text-primary)]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Shelfie</span>
              <span className="w-2 h-2 rounded-full bg-[var(--brand-500)]"></span>
            </div>
          </div>
          <form className="flex-1 max-w-2xl" onSubmit={(e) => { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(e.currentTarget.q.value)}`); }}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                 <svg className="w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--brand-500)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                 </svg>
              </div>
              <input 
                name="q" 
                defaultValue={q} 
                placeholder="Search products, brands, shops nearby..." 
                className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-sm)] rounded-[var(--radius-pill)] py-2.5 pl-11 pr-5 text-sm font-medium outline-none focus:bg-[var(--bg-surface)] focus:border-[var(--brand-500)] focus:shadow-[var(--shadow-brand)] transition-all placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
              />
            </div>
          </form>
          <div className="hidden md:flex ml-auto items-center gap-3">
            <Link href="/" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Home
            </Link>
            <CartHeaderButton />
          </div>
        </div>
        
        {/* Horizontal Filter Chips */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
            <button 
              onClick={() => setSort("distance")}
              className={`filter-chip ${sort === "distance" ? "active" : ""}`}
            >
              Closest First
            </button>
            <button 
              onClick={() => setSort("price")}
              className={`filter-chip ${sort === "price" ? "active" : ""}`}
            >
              Cheapest
            </button>
            <button 
              onClick={() => setSort("open")}
              className={`filter-chip ${sort === "open" ? "active" : ""}`}
            >
              Open Now
            </button>
          </div>
          <div className="md:hidden pt-1"><CartHeaderButton /></div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row relative">
        
        {/* Results List */}
        <div className={`w-full md:w-[480px] lg:w-[520px] border-r border-[var(--border-sm)] bg-[var(--bg-canvas)] flex flex-col shrink-0 transition-transform duration-300 ${mobileView === 'map' ? '-translate-x-full absolute h-full z-10' : 'translate-x-0'} md:translate-x-0 md:relative`}>
          <div className="p-4 border-b border-[var(--border-sm)] flex justify-between items-center shrink-0 bg-[var(--bg-surface)]">
            <h2 className="font-bold text-sm text-[var(--text-primary)] tracking-tight">
              {isLoading ? "Scanning local inventory..." : `${data?.total ?? safeOffers.length} available locations nearby`}
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {isLoading ? (
               <div className="space-y-3">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="flex gap-4 p-4 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-sm)] shadow-[var(--shadow-xs)] animate-pulse">
                     <div className="w-20 h-20 rounded-[var(--radius-md)] bg-[var(--bg-surface-3)] shrink-0"></div>
                     <div className="flex-1 space-y-2.5 py-1">
                       <div className="h-4 bg-[var(--bg-surface-3)] rounded w-3/4"></div>
                       <div className="h-3 bg-[var(--bg-surface-3)] rounded w-1/2"></div>
                       <div className="h-3 bg-[var(--bg-surface-3)] rounded w-1/4 mt-3"></div>
                     </div>
                   </div>
                 ))}
               </div>
            ) : isError ? (
              <div className="text-center py-20 flex flex-col items-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-[var(--red-bg)] flex items-center justify-center text-2xl border border-[var(--red-border)]">⚠️</div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Search unavailable</h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-[260px]">Could not fetch inventory data. Please try again.</p>
              </div>
            ) : safeOffers.length === 0 ? (
              <div className="text-center py-20 text-[var(--text-secondary)] flex flex-col items-center">
                <div className="w-20 h-20 mb-6 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center text-3xl border border-[var(--border-sm)]">
                  🏜️
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No items found</h3>
                <p className="max-w-[280px] text-sm text-[var(--text-secondary)]">We couldn't locate this item in your immediate vicinity.</p>
              </div>
            ) : (
              safeOffers.map((offer, idx) => (
                <div 
                  key={`${offer.shopId}-${offer.inventoryId}-${idx}`}
                  onMouseEnter={() => setHoveredId(offer.inventoryId)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <OfferCard offer={offer} isHovered={hoveredId === offer.inventoryId} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Area */}
        <div className={`flex-1 relative transition-transform duration-300 ${mobileView === 'list' ? 'translate-x-full absolute w-full h-full' : 'translate-x-0'} md:translate-x-0 md:relative md:w-auto`}>
          {locating ? (
             <div className="w-full h-full flex items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-muted)] font-medium">Acquiring signal...</div>
          ) : (
            <ShelfieMap
              offers={safeOffers}
              center={[lat, lng]}
              hoveredId={hoveredId}
              onHover={setHoveredId}
            />
          )}
        </div>

        {/* Mobile Toggle FAB */}
        <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <button 
            onClick={() => setMobileView(v => v === 'list' ? 'map' : 'list')}
            className="bg-[var(--text-primary)] text-[var(--text-inverse)] px-6 py-3.5 rounded-full font-bold shadow-[var(--shadow-lg)] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-sm tracking-wide"
          >
            {mobileView === 'list' ? (
              <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> Map View</>
            ) : (
              <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> List View</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function OfferCard({ offer, isHovered }: { offer: SearchOffer, isHovered: boolean }) {
  const router = useRouter();
  const { addItem, items } = useCart();
  
  const inCart = items.find(i => i.inventoryId === offer.inventoryId);

  return (
    <div className={`p-4 rounded-[var(--radius-lg)] relative transition-all duration-200 border bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)] ${isHovered ? 'border-[var(--brand-500)] ring-1 ring-[var(--brand-500)]' : 'border-[var(--border-sm)]'} ${offer.sponsored ? 'border-[var(--brand-border)] bg-[var(--brand-100)]/30' : ''}`}>
      {offer.sponsored && (
        <div className="absolute top-0 right-0 bg-[var(--brand-500)] text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-bl-[var(--radius-sm)] rounded-tr-[var(--radius-lg)] shadow-xs">
          Promoted
        </div>
      )}
      
      <div className="flex gap-4">
        {/* Visual Box */}
        <div className="w-20 h-20 rounded-[var(--radius-md)] bg-[var(--bg-surface-2)] flex items-center justify-center text-4xl shrink-0 border border-[var(--border-sm)]">
          <span className="drop-shadow-xs">{offer.imageEmoji || '📦'}</span>
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex justify-between items-start mb-1 gap-2">
              <h3 className="font-bold text-sm text-[var(--text-primary)] truncate leading-snug">{offer.productName}</h3>
              <div className="font-bold text-base text-[var(--text-primary)] leading-none shrink-0">₹{offer.price}</div>
            </div>
            
            <div className="flex justify-between items-center mb-3">
              <p className="text-[var(--text-secondary)] text-xs truncate pr-2 font-medium">{offer.shopName}</p>
              <div className="badge badge-gray text-[11px] font-semibold py-0.5 px-2"><span className="status-dot green"></span> {offer.walkMinutes}m walk</div>
            </div>
          </div>

          <div className="flex gap-2">
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
                 className={`flex-1 py-1.5 text-xs rounded-[var(--radius-md)] font-bold transition-all ${inCart ? 'bg-[var(--brand-100)] text-[var(--brand-600)] border border-[var(--brand-border)]' : 'bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] shadow-xs'}`}
               >
                 {inCart ? `✓ Added (${inCart.qty})` : '+ Add to Bag'}
               </button>
            ) : offer.requestable ? (
               <Link 
                href={`/request?s=${offer.shopId}&i=${offer.inventoryId}`}
                className="flex-1 text-center py-1.5 text-xs rounded-[var(--radius-md)] font-bold bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-sm)] hover:bg-[var(--bg-surface-2)] transition-all"
               >
                 Request Item
               </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CartHeaderButton() {
  const { items } = useCart();
  const qty = items.reduce((sum, item) => sum + item.qty, 0);
  
  if (qty === 0) return null;
  
  return (
    <Link href="/cart" className="flex items-center gap-1.5 bg-[var(--brand-500)] text-white px-3.5 py-1.5 rounded-full transition-all shadow-[var(--shadow-xs)] hover:bg-[var(--brand-600)] active:scale-95 shrink-0">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      <div className="font-bold text-xs tracking-wide">
        {qty}
      </div>
    </Link>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="h-[100dvh] bg-[var(--bg-canvas)] flex items-center justify-center"><PremiumLoader text="Initializing spatial engine..." /></div>}>
      <SearchContent />
    </Suspense>
  );
}
