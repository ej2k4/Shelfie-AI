"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import type { ImpactStats } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function LandingPage() {
  const router = useRouter();
  const { user, logout, isHydrated } = useAuth();
  const [query, setQuery] = useState("");

  const { data: stats } = useQuery<ImpactStats>({
    queryKey: ["impact"],
    queryFn: async () => {
      const res = await fetch("/api/impact");
      return res.json();
    },
  });

  const { data: userRes } = useQuery({
    queryKey: ["customer-reservations", user?.phone],
    queryFn: async () => {
      const res = await fetch(`/api/reservations?phone=${encodeURIComponent(user?.phone || "")}`);
      return res.json();
    },
    enabled: !!user?.phone && user.role === "customer",
    refetchInterval: 5000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#6366f1] opacity-20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-[#8b5cf6] opacity-15 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between z-10 border-b border-white/5 bg-slate-900/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20">
            S
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-white">Shelfie</span>
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium">
          {isHydrated && user ? (
            <div className="flex items-center gap-4">
              <span className="text-slate-300 font-bold hidden sm:inline-block">
                {user.role === 'shopkeeper' ? 'Shop Mode' : user.phone}
              </span>
              {user.role === 'shopkeeper' && (
                <Link href="/shop/dashboard" className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all">
                  Dashboard
                </Link>
              )}
              <button onClick={logout} className="px-4 py-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-red-400 transition-all">
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="px-4 py-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-all">
              Login / Signup
            </Link>
          )}
          <Link href="/brand/dashboard" className="btn-ghost hidden sm:inline-flex !rounded-lg border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 items-center justify-center">
            For Brands
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 z-10">
        <div className="max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-4">
            <span className="pulse-dot"></span>
            Live local inventory in Bengaluru
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
            Find it nearby.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Pick it up in minutes.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Stop wasting trips. See exactly what your neighbourhood shops have in stock right now, and reserve it instantly.
          </p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto relative mt-8 group flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search (e.g. laptop charger, paracetamol)"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl py-4 pl-6 pr-6 text-lg outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all shadow-xl backdrop-blur-sm placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              className="btn-primary !rounded-2xl py-4 px-8 w-full sm:w-auto shrink-0 text-lg shadow-lg shadow-indigo-500/25"
            >
              Find nearby
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-6 text-sm text-slate-400">
            <span>Try:</span>
            <button onClick={() => setQuery("charger")} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition">charger</button>
            <button onClick={() => setQuery("paracetamol")} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition">paracetamol</button>
            <button onClick={() => setQuery("maggi")} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition">maggi</button>
          </div>
        </div>
      </div>

      {/* Impact Counter */}
      <div className="border-t border-white/5 bg-slate-900/30 backdrop-blur-md z-10">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/5">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-white">{stats?.tripsSaved || 0}</div>
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Wasted Trips Saved</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-white">{stats?.pickupsConfirmed || 0}</div>
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Pickups Fulfilled</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-white">{stats?.shopsActive || 0}</div>
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Local Shops</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-white">{stats?.totalSearches || 0}</div>
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">Local Searches</div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Orders Section */}
      {isHydrated && user?.role === "customer" && (
        <div className="bg-[#0b0f1a] z-10 py-16 border-t border-white/5 flex-1">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-6">My Orders & Reservations</h2>
            
            {(!userRes?.reservations || userRes.reservations.length === 0) ? (
              <div className="text-slate-500 text-center py-12 border border-dashed border-white/10 rounded-2xl">
                No orders yet. Search for something nearby!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userRes.reservations.map((r: any) => {
                  const isActive = r.status === 'HELD';
                  return (
                    <div key={r.id} className={`card p-6 ${isActive ? 'border-indigo-500/20 bg-indigo-500/5' : 'opacity-70'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className={`font-bold ${!isActive && 'text-slate-400'}`}>
                            {isActive ? 'Active Reservation' : 'Previous Order'}
                          </h3>
                        </div>
                        <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`}>
                          {isActive ? 'Ready for Pickup' : r.status}
                        </span>
                      </div>
                      <div className={`font-medium ${!isActive && 'line-through text-slate-500'}`}>
                        {r.productName} <span className="text-slate-500 ml-1">x{r.qty}</span>
                      </div>
                      <div className="text-sm text-slate-400 mt-1 mb-4">
                        {r.shopName} • ₹{r.productPrice * r.qty}
                      </div>
                      {isActive && (
                        <Link href={`/reserve/${r.id}`} className="btn-primary w-full text-center justify-center py-2">
                          View Pickup Code
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
