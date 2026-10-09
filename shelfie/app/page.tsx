"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import type { SearchOffer } from "@/lib/types";

// ── CONSTANTS ───────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all",          name: "For You",       icon: "✦",  gradient: "from-indigo-500 to-violet-600" },
  { id: "electronics",  name: "Electronics",   icon: "🔌",  gradient: "from-blue-500 to-cyan-500" },
  { id: "pharmacy",     name: "Pharmacy",      icon: "💊",  gradient: "from-emerald-500 to-teal-500" },
  { id: "grocery",      name: "Groceries",     icon: "🛒",  gradient: "from-orange-500 to-amber-500" },
  { id: "mobiles",      name: "Mobiles",       icon: "📱",  gradient: "from-sky-500 to-blue-600" },
  { id: "personal_care",name: "Personal Care", icon: "🧴",  gradient: "from-pink-500 to-rose-500" },
  { id: "hardware",     name: "Hardware",      icon: "🔨",  gradient: "from-stone-500 to-zinc-600" },
  { id: "stationery",   name: "Stationery",    icon: "✏️",  gradient: "from-violet-500 to-purple-600" },
  { id: "home",         name: "Home Needs",    icon: "🏠",  gradient: "from-teal-500 to-green-600" },
  { id: "rush",         name: "15-Min Rush",   icon: "⚡",  gradient: "from-yellow-500 to-orange-500" },
];

const SEARCH_SUGGESTIONS = [
  { text: "Dell 65W Laptop Charger",       category: "Electronics", price: "₹1,299" },
  { text: "Dolo 650mg (Strip of 15)",      category: "Pharmacy",    price: "₹38" },
  { text: "Wireless Mouse Logitech M185",  category: "Electronics", price: "₹849" },
  { text: "Maggi Noodles (4 pack)",        category: "Groceries",   price: "₹68" },
  { text: "Earphones boAt BassHeads",      category: "Electronics", price: "₹599" },
  { text: "Amul Butter (500g)",            category: "Groceries",   price: "₹275" },
];

const PROMO_SLIDES = [
  {
    brand:       "MIVI & BOAT  ·  Shelfie Unique",
    eyebrow:     "Special Local Deal · Electronics Fest",
    headline:    "Hyperlocal\nTech Fest",
    priceText:   "From ₹299*",
    subtext:     "Pick up in 15 mins from verified stores in Koramangala · Up to 45% OFF",
    bgFrom:      "#0d1f4e",
    bgVia:       "#1a3580",
    accentRgb:   "99, 102, 241",
    cta:         "Explore Deals",
    ctaSecondary:"View Map",
    query:       "electronics",
    icon:        "🎧",
    iconBg:      "from-indigo-600/30 to-violet-600/20",
  },
  {
    brand:       "APOLLO & LOCAL CHEMISTS  ·  Shelfie Health",
    eyebrow:     "Verified Chemist Stock · Available Now",
    headline:    "24×7 Emergency\nPharmacy",
    priceText:   "From ₹18*",
    subtext:     "Dolo 650, Paracetamol, Bandages & First Aid within 5-10 mins walk",
    bgFrom:      "#042b1a",
    bgVia:       "#065f35",
    accentRgb:   "34, 197, 94",
    cta:         "Order Medicines",
    ctaSecondary:"View Map",
    query:       "pharmacy",
    icon:        "💊",
    iconBg:      "from-emerald-600/30 to-green-600/20",
  },
  {
    brand:       "KORAMANGALA KIRANA  ·  Shelfie Fresh",
    eyebrow:     "Instant Shelf Pickup · Zero Delivery Fee",
    headline:    "Daily Pantry &\nBreakfast Essentials",
    priceText:   "From ₹28*",
    subtext:     "Amul Butter, Atta, Maggi, Tea & Salt · Ready on Shelf Right Now",
    bgFrom:      "#2d1400",
    bgVia:       "#7c2d00",
    accentRgb:   "245, 158, 11",
    cta:         "Explore Groceries",
    ctaSecondary:"View Map",
    query:       "grocery",
    icon:        "🧈",
    iconBg:      "from-orange-600/30 to-amber-600/20",
  },
];

const LOCATIONS = [
  "Koramangala 4th Block, Bengaluru",
  "Indiranagar 100 Feet Rd, Bengaluru",
  "HSR Layout Sector 3, Bengaluru",
  "JP Nagar 2nd Phase, Bengaluru",
  "Whitefield Main Rd, Bengaluru",
];

// ── MAIN PAGE ───────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const { user, logout, isHydrated } = useAuth();
  const { lat, lng, locating } = useGeolocation();

  const [query,              setQuery]              = useState("");
  const [activeCategory,     setActiveCategory]     = useState("all");
  const [isSearchFocused,    setIsSearchFocused]    = useState(false);
  const [selectedLocation,   setSelectedLocation]   = useState(LOCATIONS[0]);
  const [showLocationModal,  setShowLocationModal]  = useState(false);
  const [showUserDropdown,   setShowUserDropdown]   = useState(false);
  const [currentSlide,       setCurrentSlide]       = useState(0);
  const [slideAnimating,     setSlideAnimating]     = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const categoryBarRef = useRef<HTMLDivElement>(null);

  // Auto-advance banner carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideAnimating(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
        setSlideAnimating(false);
      }, 150);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
      setShowLocationModal(false);
      setShowUserDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch reservations
  const { data: userRes } = useQuery({
    queryKey: ["customer-reservations", user?.phone],
    queryFn: async () => (await fetch(`/api/reservations?phone=${encodeURIComponent(user?.phone || "")}`)).json(),
    enabled: !!user?.phone && user.role === "customer",
    refetchInterval: 5000,
  });

  // Fetch nearby offers
  const { data: nearbyData, isLoading: nearbyLoading } = useQuery<{ offers: SearchOffer[] }>({
    queryKey: ["nearby-discovery", lat, lng],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=&lat=${lat}&lng=${lng}&sort=distance&radius=5`);
      if (!res.ok) return { offers: [] };
      const json = await res.json();
      return { offers: Array.isArray(json?.offers) ? json.offers : [] };
    },
    enabled: !locating,
  });

  const offers       = nearbyData?.offers ?? [];
  const activeHolds  = userRes?.reservations?.filter((r: any) => r.status === "HELD") || [];

  const techOffers     = offers.filter((o) =>
    o.category?.toLowerCase() === "electronics" ||
    ["charger","cable","mouse","phone","headphone","laptop"].some(k => o.productName.toLowerCase().includes(k))
  );
  const pharmacyOffers = offers.filter((o) =>
    o.category?.toLowerCase() === "pharmacy" ||
    ["dolo","paracetamol","vitamin","antiseptic","tablet","medicine"].some(k => o.productName.toLowerCase().includes(k))
  );
  const groceryOffers  = offers.filter((o) =>
    o.category?.toLowerCase() === "grocery" ||
    ["maggi","butter","atta","salt","rice","oil","tea"].some(k => o.productName.toLowerCase().includes(k))
  );

  const filteredOffers =
    activeCategory === "all"       ? offers :
    activeCategory === "electronics" || activeCategory === "mobiles" ? techOffers :
    activeCategory === "pharmacy"  ? pharmacyOffers :
    activeCategory === "grocery"   ? groceryOffers :
    offers;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelectSuggestion = (text: string) => {
    setQuery(text);
    setIsSearchFocused(false);
    router.push(`/search?q=${encodeURIComponent(text)}`);
  };

  const changeSlide = (idx: number) => {
    setSlideAnimating(true);
    setTimeout(() => { setCurrentSlide(idx); setSlideAnimating(false); }, 150);
  };

  const slide = PROMO_SLIDES[currentSlide];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-canvas)", color: "var(--text-primary)" }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{ background: "#fff", borderBottom: "1px solid var(--border-sm)", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
      >
        {/* ─ Single main bar ─ */}
        <div
          className="flex items-center gap-3 lg:gap-4"
          style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 var(--gutter)", height: "60px" }}
        >
          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
            <div className="flex items-center gap-1.5">
              <span
                className="font-black italic font-display"
                style={{ fontSize: "21px", color: "var(--text-primary)", letterSpacing: "-0.04em", lineHeight: 1 }}
              >
                Shelfie
              </span>
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center font-black"
                style={{ background: "var(--brand-500)", color: "#fff", fontSize: "9px", flexShrink: 0 }}
              >
                ✦
              </span>
            </div>
          </Link>

          {/* Location pill */}
          <div className="relative hidden md:block" style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowLocationModal(!showLocationModal)}
              className="flex items-center gap-2 rounded-[var(--radius-lg)] transition-all bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-md)] px-3 py-2 text-xs font-semibold max-w-[200px] shadow-[var(--shadow-xs)]"
              style={{ color: "var(--text-secondary)" }}
            >
              <svg className="shrink-0" style={{ width: "14px", height: "14px", color: "var(--brand-500)" }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="truncate text-left flex-1" style={{ color: "var(--text-primary)" }}>
                {locating ? "Detecting…" : selectedLocation.split(",")[0]}
              </span>
              <svg className={`shrink-0 transition-transform ${showLocationModal ? "rotate-180" : ""}`} style={{ width: "12px", height: "12px", color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLocationModal && (
              <div
                className="absolute left-0 top-full mt-2 w-72 animate-scaleIn"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", padding: "6px", zIndex: 60 }}
              >
                <div className="px-3 py-2 text-xs font-bold uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.08em", borderBottom: "1px solid var(--border-xs)", marginBottom: "4px" }}>
                  Select Delivery Area
                </div>
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => { setSelectedLocation(loc); setShowLocationModal(false); }}
                    className="w-full text-left px-3 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2"
                    style={{
                      background: selectedLocation === loc ? "var(--brand-100)" : "transparent",
                      color: selectedLocation === loc ? "var(--brand-500)" : "var(--text-secondary)",
                      border: selectedLocation === loc ? "1px solid var(--brand-border)" : "1px solid transparent",
                    }}
                  >
                    📍 {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search bar — grows to fill */}
          <div ref={searchBoxRef} className="flex-1 relative" style={{ minWidth: 0 }}>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <div
                className={`flex items-center transition-all duration-200 rounded-[var(--radius-pill)] border ${isSearchFocused ? "bg-white border-[var(--brand-400)] shadow-[var(--shadow-brand)]" : "bg-[var(--bg-surface-3)] border-[var(--border-sm)] hover:bg-[var(--bg-overlay-md)]"}`}
              >
                <div className="pl-4 pr-2 flex items-center">
                  <svg style={{ width: "15px", height: "15px", color: isSearchFocused ? "var(--brand-500)" : "var(--text-muted)", transition: "color 0.15s", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search products, brands, shops…"
                  className="w-full bg-transparent outline-none font-medium"
                  style={{ color: "var(--text-primary)", fontSize: "13.5px", padding: "10px 6px 10px 0" }}
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="p-1.5 mr-1" style={{ color: "var(--text-muted)" }}>
                    <svg style={{ width: "13px", height: "13px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  type="submit"
                  className="hidden sm:inline-flex items-center text-white font-bold transition-all"
                  style={{
                    background: "var(--brand-500)",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    padding: "8px 18px",
                    margin: "4px",
                    borderRadius: "var(--radius-pill)",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.01em",
                    flexShrink: 0,
                  }}
                >
                  Search
                </button>
              </div>
            </form>

            {/* Suggestions dropdown */}
            {isSearchFocused && (
              <div
                className="absolute top-full left-0 right-0 mt-2 animate-fadeIn overflow-hidden"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", zIndex: 60 }}
              >
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-xs)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  <span>Trending Nearby</span>
                  <span style={{ color: "var(--brand-500)", fontWeight: 600, textTransform: "none", letterSpacing: "normal" }}>Live in Bengaluru</span>
                </div>
                {SEARCH_SUGGESTIONS.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSuggestion(item.text)}
                    className="px-4 py-3 flex items-center justify-between cursor-pointer transition-all"
                    style={{ fontSize: "13px", borderBottom: idx < SEARCH_SUGGESTIONS.length - 1 ? "1px solid var(--border-xs)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="flex items-center gap-3">
                      <svg style={{ width: "13px", height: "13px", flexShrink: 0, color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{item.text}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: "var(--bg-surface-3)", color: "var(--text-muted)", border: "1px solid var(--border-xs)" }}>
                        {item.category}
                      </span>
                    </div>
                    <span style={{ color: "var(--brand-500)", fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>{item.price}</span>
                  </div>
                ))}
                <div className="px-4 py-2.5 text-right" style={{ borderTop: "1px solid var(--border-xs)" }}>
                  <button onClick={() => router.push("/search?q=")} className="text-xs font-semibold" style={{ color: "var(--brand-500)" }}>
                    Open Map View →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right action group */}
          <div className="flex items-center gap-2 lg:gap-3" style={{ flexShrink: 0 }}>

            {/* Become a Seller — desktop only */}
            <Link
              href="/shop/onboard"
              className="hidden lg:inline-flex items-center text-xs font-bold transition-colors hover:text-[var(--brand-500)]"
              style={{ color: "var(--text-secondary)", textDecoration: "none", whiteSpace: "nowrap", padding: "0 4px" }}
            >
              Become a Seller
            </Link>

            {/* Thin vertical divider */}
            <div className="hidden lg:block" style={{ width: "1px", height: "18px", background: "var(--border-sm)" }} />

            {/* Account */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              {isHydrated && user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-2 rounded-[var(--radius-lg)] transition-all px-3 py-2 text-xs font-semibold shadow-[var(--shadow-xs)] border"
                    style={{
                      borderColor: showUserDropdown ? "var(--brand-300)" : "var(--border-md)",
                      background: showUserDropdown ? "var(--brand-100)" : "var(--bg-surface)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center font-bold"
                      style={{ background: "var(--brand-500)", color: "#fff", fontSize: "9px", flexShrink: 0 }}
                    >
                      {user.phone ? user.phone.slice(-2) : "U"}
                    </span>
                    <span className="hidden md:inline">Account</span>
                    <svg className={`shrink-0 transition-transform ${showUserDropdown ? "rotate-180 text-[var(--brand-500)]" : "text-[var(--text-muted)]"}`} style={{ width: "12px", height: "12px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showUserDropdown && (
                    <div
                      className="absolute right-0 top-full mt-2 w-52 animate-scaleIn"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", padding: "6px", zIndex: 60 }}
                    >
                      <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border-xs)" }}>
                        <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{user.phone}</div>
                        <div className="text-xs capitalize mt-0.5" style={{ color: "var(--text-muted)" }}>{user.role} Account</div>
                      </div>
                      {user.role === "shopkeeper" && (
                        <Link href="/shop/dashboard" className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all" style={{ color: "var(--text-secondary)", textDecoration: "none" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-surface-3)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        >
                          🏪 Merchant Portal
                        </Link>
                      )}
                      <Link href="/cart" className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all" style={{ color: "var(--text-secondary)", textDecoration: "none" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-surface-3)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                      >
                        🛍️ My Bag & Reservations
                      </Link>
                      <button
                        onClick={() => { logout(); setShowUserDropdown(false); }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-lg transition-all mt-1"
                        style={{ background: "var(--red-bg)", color: "var(--red)", border: "1px solid var(--red-border)" }}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center text-white font-bold transition-all"
                  style={{ background: "var(--brand-500)", borderRadius: "var(--radius-md)", padding: "7px 16px", fontSize: "12.5px", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}
                >
                  Login
                </Link>
              )}
            </div>

            {/* Cart */}
            <PremiumCartButton />
          </div>
        </div>

        {/* ─ Category Pill Strip ─ */}
        <div style={{ borderTop: "1px solid var(--border-xs)", background: "var(--bg-surface)" }}>
          <div
            ref={categoryBarRef}
            className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar"
            style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "8px var(--gutter)", scrollSnapType: "x mandatory" }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex items-center gap-1.5 shrink-0 rounded-full transition-all duration-150"
                  style={{
                    padding: "6px 14px",
                    fontSize: "12.5px",
                    fontWeight: isActive ? 700 : 600,
                    scrollSnapAlign: "start",
                    background: isActive ? "var(--brand-500)" : "var(--bg-surface-3)",
                    color: isActive ? "#fff" : "var(--text-secondary)",
                    border: isActive ? "1px solid var(--brand-600)" : "1px solid var(--border-xs)",
                    boxShadow: isActive ? "0 2px 8px var(--brand-glow)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#e8e9f0";
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.borderColor = "var(--border-md)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--bg-surface-3)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.borderColor = "var(--border-xs)";
                    }
                  }}
                >
                  <span style={{ fontSize: "14px" }}>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>



      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <main className="flex-1" style={{ maxWidth: "var(--container-max)", width: "100%", margin: "0 auto", padding: "24px var(--gutter)", display: "flex", flexDirection: "column", gap: "var(--section-gap)" }}>

        {/* ── HERO BANNER CAROUSEL ─────────────────────────────── */}
        <div
          className="relative rounded-2xl overflow-hidden group"
          style={{ minHeight: "280px", border: "1px solid var(--border-sm)", boxShadow: "var(--shadow-md)" }}
        >
          {/* Gradient background */}
          <div
            className="absolute inset-0 transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse at 70% 50%, rgba(${slide.accentRgb}, 0.18) 0%, transparent 60%),
                           linear-gradient(135deg, ${slide.bgFrom} 0%, ${slide.bgVia} 60%, #0c0d10 100%)`,
            }}
          />

          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E\")" }} />

          {/* Content */}
          <div
            className={`relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between h-full p-6 sm:p-10 lg:p-12 gap-6 transition-all duration-300 ${slideAnimating ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}
            style={{ minHeight: "280px" }}
          >
            {/* Left: Text */}
            <div className="flex flex-col gap-4 max-w-lg z-10">
              {/* Eyebrow */}
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: `rgba(${slide.accentRgb}, 0.15)`, color: `rgb(${slide.accentRgb})`, border: `1px solid rgba(${slide.accentRgb}, 0.3)`, letterSpacing: "0.04em" }}
                >
                  {slide.eyebrow}
                </span>
              </div>

              {/* Headline */}
              <h2
                className="font-display font-black leading-tight"
                style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", letterSpacing: "-0.04em", color: "#fff", whiteSpace: "pre-line" }}
              >
                {slide.headline}
              </h2>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black" style={{ color: `rgb(${slide.accentRgb})`, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.03em" }}>
                  {slide.priceText}
                </span>
              </div>

              {/* Subtext */}
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)", maxWidth: "360px" }}>
                {slide.subtext}
              </p>

              {/* CTAs */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => router.push(`/search?q=${encodeURIComponent(slide.query)}`)}
                  className="flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: `rgb(${slide.accentRgb})`,
                    color: "#fff",
                    boxShadow: `0 4px 20px rgba(${slide.accentRgb}, 0.4)`,
                    letterSpacing: "0.01em",
                  }}
                >
                  {slide.cta}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                <button
                  onClick={() => router.push("/search?q=")}
                  className="flex items-center gap-1.5 font-semibold text-sm px-5 py-3 rounded-xl transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
                >
                  {slide.ctaSecondary}
                </button>
              </div>
            </div>

            {/* Right: Product visual */}
            <div
              className="hidden sm:flex shrink-0 items-center justify-center rounded-3xl transform transition-all duration-500 hover:rotate-3 hover:scale-105"
              style={{
                width: "180px",
                height: "180px",
                fontSize: "88px",
                background: `linear-gradient(135deg, ${slide.iconBg.replace("from-", "").replace("to-", "")})`,
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: `0 20px 60px rgba(${slide.accentRgb}, 0.25)`,
                backdropFilter: "blur(12px)",
              }}
            >
              {slide.icon}
            </div>
          </div>

          {/* Bottom bar: Powered by + dots + nav arrows */}
          <div
            className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-6 sm:px-10 lg:px-12 py-3"
            style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
              {currentSlide === 0 ? "⚡ Powered by Instant Shelf Reserve" :
               currentSlide === 1 ? "🩺 100% Genuine Pharmacy Inventory" :
               "🛒 In-Store Available Right Now"}
            </span>
            <div className="flex items-center gap-3">
              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {PROMO_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => changeSlide(idx)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      height: "4px",
                      width: currentSlide === idx ? "24px" : "6px",
                      background: currentSlide === idx ? `rgb(${PROMO_SLIDES[idx].accentRgb})` : "rgba(255,255,255,0.25)",
                    }}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Prev / Next controls */}
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => changeSlide((currentSlide - 1 + PROMO_SLIDES.length) % PROMO_SLIDES.length)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-white/20 active:scale-95 text-white/80 hover:text-white"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                  title="Previous slide"
                  aria-label="Previous slide"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => changeSlide((currentSlide + 1) % PROMO_SLIDES.length)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-white/20 active:scale-95 text-white/80 hover:text-white"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                  title="Next slide"
                  aria-label="Next slide"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── SHELF 1: TOP TECH DEALS ────────────────────────────── */}
        <ShelfSection
          icon="🔌"
          iconGradient="from-blue-600 to-cyan-500"
          title="Top Tech Deals"
          subtitle="Chargers, cables, audio & accessories available nearby"
          viewAllHref="/search?q=electronics"
          viewAllLabel="View All Electronics"
          accentColor="var(--brand-400)"
        >
          {nearbyLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonProductCard key={i} />)
            : techOffers.length === 0
            ? <EmptyCategoryState title="No tech items found nearby" />
            : techOffers.slice(0, 6).map((offer, idx) => <PremiumProductCard key={idx} offer={offer} />)}
        </ShelfSection>

        {/* ── SHELF 2: PHARMACY ─────────────────────────────────── */}
        <ShelfSection
          icon="💊"
          iconGradient="from-emerald-600 to-teal-500"
          title="Emergency Pharmacy"
          subtitle="100% genuine stock from verified chemist counters in walking distance"
          viewAllHref="/search?q=pharmacy"
          viewAllLabel="View All Pharmacy"
          accentColor="var(--green)"
          cols={pharmacyOffers.length > 0 && pharmacyOffers.length <= 4 ? 4 : undefined}
        >
          {nearbyLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonProductCard key={i} />)
            : pharmacyOffers.length === 0
            ? <EmptyCategoryState title="No pharmacy items nearby" />
            : pharmacyOffers.slice(0, 6).map((offer, idx) => <PremiumProductCard key={idx} offer={offer} />)}
        </ShelfSection>

        {/* ── SHELF 3: GROCERIES ────────────────────────────────── */}
        <ShelfSection
          icon="🛒"
          iconGradient="from-orange-600 to-amber-500"
          title="Daily Grocery & Pantry"
          subtitle="Fresh essentials from local neighbourhood Kirana stores"
          viewAllHref="/search?q=grocery"
          viewAllLabel="View All Groceries"
          accentColor="var(--amber)"
        >
          {nearbyLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonProductCard key={i} />)
            : groceryOffers.length === 0
            ? <EmptyCategoryState title="No grocery items nearby" />
            : groceryOffers.slice(0, 6).map((offer, idx) => <PremiumProductCard key={idx} offer={offer} />)}
        </ShelfSection>

        {/* ── SHELF 4: TOP STORES ───────────────────────────────── */}
        <section style={{ background: "var(--bg-surface)", border: "1px solid var(--border-sm)", borderRadius: "var(--radius-xl)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border-xs)" }}>
            <div>
              <p className="text-xs font-bold uppercase mb-1" style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                Verified Stores
              </p>
              <h3 className="font-display font-bold" style={{ fontSize: "1.125rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Top Rated in {selectedLocation.split(",")[0]}
              </h3>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                Verified physical stores ready for quick shelf collection
              </p>
            </div>
            <Link
              href="/search?q="
              className="text-sm font-semibold flex items-center gap-1.5 transition-all shrink-0"
              style={{ color: "var(--brand-400)", textDecoration: "none" }}
            >
              View on Map
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StoreFeatureCard
              name="Sri Ganesh Electronics"
              area="Koramangala 4th Block"
              rating={4.8}
              distance="0.3 km · 4 min walk"
              itemsCount={38}
              category="Electronics & Gadgets"
              tag="⚡ Express Counter"
              tagColor="var(--brand-400)"
              tagBg="var(--brand-100)"
              tagBorder="var(--brand-border)"
            />
            <StoreFeatureCard
              name="Koramangala Pharma Plus"
              area="Koramangala 1st Block"
              rating={4.9}
              distance="0.2 km · 3 min walk"
              itemsCount={33}
              category="Pharmacy & First Aid"
              tag="🩺 Licensed Chemist"
              tagColor="var(--green)"
              tagBg="var(--green-bg)"
              tagBorder="var(--green-border)"
            />
            <StoreFeatureCard
              name="Daily Needs Store"
              area="Jyoti Nivas College Rd"
              rating={4.7}
              distance="0.5 km · 6 min walk"
              itemsCount={36}
              category="Groceries & Snacks"
              tag="🧈 Fresh Kirana"
              tagColor="var(--amber)"
              tagBg="var(--amber-bg)"
              tagBorder="var(--amber-border)"
            />
          </div>
        </section>

      </main>

      {/* ── ACTIVE HOLD FLOATING TOAST ─────────────────────────── */}
      {activeHolds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40 animate-slideUp">
          <Link
            href={`/reserve/${activeHolds[0].id}`}
            className="flex items-center justify-between p-4 rounded-2xl transition-all hover:-translate-y-1"
            style={{
              background: "var(--bg-surface-2)",
              border: "1px solid var(--amber-border)",
              boxShadow: `var(--shadow-xl), 0 0 30px rgba(245,158,11,0.15)`,
              textDecoration: "none",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: "var(--amber-bg)", border: "1px solid var(--amber-border)" }}
              >
                🛍️
              </span>
              <div>
                <div className="text-xs font-bold uppercase" style={{ color: "var(--amber)", letterSpacing: "0.08em" }}>Active Shelf Hold</div>
                <div className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
                  {activeHolds.length} item(s) reserved at {activeHolds[0].shopName}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold px-4 py-2 rounded-xl" style={{ background: "var(--amber)", color: "#000" }}>
              Collect →
            </span>
          </Link>
        </div>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="mt-8" style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-xs)" }}>
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 py-8"
          style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "32px var(--gutter)", fontSize: "13px" }}
        >
          <div className="flex items-center gap-2">
            <span className="font-black italic font-display" style={{ color: "var(--brand-400)", fontSize: "16px", letterSpacing: "-0.04em" }}>Shelfie</span>
            <span style={{ color: "var(--text-muted)" }}>© 2026 Hyperlocal Spatial Inventory Engine. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 font-semibold">
            {[
              { href: "/search?q=", label: "Map Search" },
              { href: "/shop/onboard", label: "Become a Seller" },
              { href: "/shop/dashboard", label: "Shopkeeper Dashboard" },
              { href: "/cart", label: "My Bag" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{ color: "var(--text-muted)", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── SHELF SECTION WRAPPER ───────────────────────────────────────

function ShelfSection({
  icon,
  iconGradient,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  accentColor,
  cols,
  children,
}: {
  icon: string;
  iconGradient: string;
  title: string;
  subtitle: string;
  viewAllHref: string;
  viewAllLabel: string;
  accentColor: string;
  cols?: number;
  children: React.ReactNode;
}) {
  const gridClass = cols === 4
    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4"
    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4";

  return (
    <section style={{ background: "var(--bg-surface)", border: "1px solid var(--border-sm)", borderRadius: "var(--radius-xl)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border-xs)" }}>
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br ${iconGradient} shadow-sm shrink-0`}
          >
            {icon}
          </div>
          <div>
            <h3 className="font-display font-bold" style={{ fontSize: "1.0625rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              {title}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
          </div>
        </div>
        <Link
          href={viewAllHref}
          className="text-xs font-bold px-4 py-2 rounded-xl transition-all shrink-0 sm:shrink-0 flex items-center gap-1.5"
          style={{ background: "var(--bg-overlay-md)", color: accentColor, border: "1px solid var(--border-sm)", textDecoration: "none" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay-lg)"; e.currentTarget.style.borderColor = "var(--border-md)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-overlay-md)"; e.currentTarget.style.borderColor = "var(--border-sm)"; }}
        >
          {viewAllLabel}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Product grid */}
      <div className={gridClass}>
        {children}
      </div>
    </section>
  );
}

// ── PREMIUM PRODUCT CARD ────────────────────────────────────────

function PremiumProductCard({ offer }: { offer: SearchOffer }) {
  const router = useRouter();
  const { addItem, items } = useCart();
  const inCart = items.find((i) => i.inventoryId === offer.inventoryId);
  const [hovered, setHovered] = useState(false);

  const mrp = Math.round(offer.price * 1.35);
  const discountPercent = Math.round(((mrp - offer.price) / mrp) * 100);

  return (
    <div
      onClick={() => router.push(`/search?q=${encodeURIComponent(offer.productName)}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col cursor-pointer rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: "var(--bg-surface-2)",
        border: hovered ? "1px solid var(--border-md)" : "1px solid var(--border-xs)",
        boxShadow: hovered ? "var(--shadow-lg)" : "var(--shadow-xs)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
      }}
    >
      {/* Image zone */}
      <div
        className="aspect-square w-full flex items-center justify-center relative overflow-hidden"
        style={{
          background: hovered
            ? "linear-gradient(135deg, var(--bg-surface-3), #1a2540)"
            : "linear-gradient(135deg, var(--bg-surface-2), var(--bg-surface-3))",
          transition: "background 0.2s ease",
        }}
      >
        {/* Category tag */}
        <div className="absolute top-2 left-2 z-10">
          <span
            className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md"
            style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border-sm)", letterSpacing: "0.05em" }}
          >
            {offer.category || "Item"}
          </span>
        </div>

        {/* Product emoji */}
        <span
          className="select-none transition-all duration-300"
          style={{ fontSize: "52px", transform: hovered ? "scale(1.12)" : "scale(1)", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))" }}
        >
          {offer.imageEmoji || "📦"}
        </span>

        {/* In-stock badge */}
        {offer.inStock && (
          <div className="absolute bottom-2 left-2">
            <span
              className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg"
              style={{ background: "var(--green-bg)", color: "var(--green)", border: "1px solid var(--green-border)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
              In Stock
            </span>
          </div>
        )}

        {/* Sponsored marker */}
        {offer.sponsored && (
          <div className="absolute top-2 right-2">
            <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "var(--brand-100)", color: "var(--brand-400)", border: "1px solid var(--brand-border)" }}>
              Ad
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 gap-3">
        <div>
          <h4
            className="text-[13px] font-bold leading-snug line-clamp-2 transition-colors duration-150"
            style={{ color: hovered ? "var(--brand-500)" : "var(--text-primary)", letterSpacing: "-0.01em" }}
          >
            {offer.productName}
          </h4>
          <div className="flex items-center justify-between mt-2" style={{ fontSize: "11px" }}>
            <span className="truncate max-w-[100px] font-medium" style={{ color: "var(--text-muted)" }}>
              {offer.shopName}
            </span>
            <span className="font-semibold shrink-0 flex items-center gap-1 bg-[var(--bg-surface-3)] px-1.5 py-0.5 rounded-md" style={{ color: "var(--text-secondary)" }}>
              🚶 {offer.walkMinutes}m
            </span>
          </div>
        </div>

        {/* Pricing */}
        <div className="pt-3 mt-auto" style={{ borderTop: "1px solid var(--border-xs)" }}>
          <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
            <span className="text-base font-black font-display" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              ₹{offer.price.toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-medium line-through" style={{ color: "var(--text-muted)" }}>
              ₹{mrp.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--green-bg)", color: "var(--green)" }}>
              {discountPercent}% OFF
            </span>
          </div>
          <div className="text-[10.5px] font-semibold flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--brand-100)] text-[var(--brand-500)] text-[10px]">⚡</span> 
            Free Local Pickup
          </div>

          {/* Add to cart button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              addItem({
                inventoryId: offer.inventoryId,
                shopId: offer.shopId,
                shopName: offer.shopName,
                productName: offer.productName,
                price: offer.price,
                imageEmoji: offer.imageEmoji || "📦",
              });
            }}
            className="w-full mt-2.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            style={
              inCart
                ? { background: "var(--brand-100)", color: "var(--brand-600)", border: "1px solid var(--brand-border)" }
                : { background: "var(--brand-500)", color: "#fff", boxShadow: "0 2px 12px var(--brand-glow)" }
            }
          >
            {inCart ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                In Bag ({inCart.qty})
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add to Bag
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CART BUTTON ─────────────────────────────────────────────────

function PremiumCartButton() {
  const { items } = useCart();
  const qty = items.reduce((s, i) => s + i.qty, 0);

  return (
    <Link
      href="/cart"
      className="flex items-center gap-2 text-sm font-semibold py-2 px-3.5 rounded-[var(--radius-lg)] transition-all bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-md)] shadow-[var(--shadow-xs)]"
      style={{
        color: "var(--text-primary)",
        textDecoration: "none",
      }}
    >
      <div className="relative">
        <svg className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {qty > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
            style={{ background: "var(--brand-500)", color: "#fff", boxShadow: "0 0 0 2px var(--bg-surface)" }}
          >
            {qty}
          </span>
        )}
      </div>
      <span className="hidden sm:inline text-xs font-bold">Bag</span>
    </Link>
  );
}

// ── STORE FEATURE CARD ──────────────────────────────────────────

function StoreFeatureCard({
  name,
  area,
  rating,
  distance,
  itemsCount,
  category,
  tag,
  tagColor,
  tagBg,
  tagBorder,
}: {
  name: string;
  area: string;
  rating: number;
  distance: string;
  itemsCount: number;
  category: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  tagBorder: string;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => router.push(`/search?q=${encodeURIComponent(name)}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col justify-between cursor-pointer rounded-xl p-4 transition-all duration-200"
      style={{
        background: hovered ? "var(--bg-surface-3)" : "var(--bg-surface-2)",
        border: hovered ? "1px solid var(--border-md)" : "1px solid var(--border-xs)",
        boxShadow: hovered ? "var(--shadow-md)" : "none",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-bold text-sm" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{name}</h4>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 flex items-center gap-0.5"
            style={{ background: "rgba(245,158,11,0.15)", color: "var(--amber)", border: "1px solid var(--amber-border)" }}
          >
            {rating} ★
          </span>
        </div>
        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{area}</p>
        <span
          className="inline-block text-xs font-semibold px-2.5 py-1 rounded-lg"
          style={{ background: tagBg, color: tagColor, border: `1px solid ${tagBorder}` }}
        >
          {tag}
        </span>
      </div>

      <div
        className="mt-4 pt-3 flex items-center justify-between text-xs"
        style={{ borderTop: "1px solid var(--border-xs)" }}
      >
        <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{distance}</span>
        <div className="text-right">
          <span className="font-black text-lg font-display" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>{itemsCount}</span>
          <span className="text-[10px] font-semibold ml-1" style={{ color: "var(--text-muted)" }}>in stock</span>
        </div>
      </div>
    </div>
  );
}

// ── SKELETON CARD ───────────────────────────────────────────────

function SkeletonProductCard() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-xs)" }}
    >
      <div className="aspect-square w-full skeleton" />
      <div className="p-3 space-y-2.5">
        <div className="h-3 skeleton rounded w-3/4" />
        <div className="h-2.5 skeleton rounded w-1/2" />
        <div className="pt-2" style={{ borderTop: "1px solid var(--border-xs)" }}>
          <div className="h-3.5 skeleton rounded w-2/3 mb-2" />
          <div className="h-9 skeleton rounded-lg mt-1" />
        </div>
      </div>
    </div>
  );
}

// ── EMPTY STATE ──────────────────────────────────────────────────

function EmptyCategoryState({ title }: { title: string }) {
  return (
    <div
      className="col-span-full flex flex-col items-center justify-center py-12 gap-3"
      style={{ color: "var(--text-muted)" }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: "var(--bg-overlay-md)", border: "1px solid var(--border-sm)" }}
      >
        📦
      </div>
      <div className="text-center">
        <p className="font-semibold text-sm" style={{ color: "var(--text-secondary)" }}>{title}</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Check back soon or explore other categories</p>
      </div>
    </div>
  );
}
