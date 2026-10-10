"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

type OnboardStep = 1 | 2 | 3;

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  onlineQty: number;
  offlineQty: number;
  emoji: string;
  selected: boolean;
}

const NEIGHBORHOOD_STAPLES: Record<string, InventoryItem[]> = {
  grocery: [
    { id: "staple_1", name: "Amul Butter (500g)", category: "grocery", price: 275, onlineQty: 6, offlineQty: 12, emoji: "🧈", selected: true },
    { id: "staple_2", name: "Maggi 2-Minute Noodles (70g x 4)", category: "grocery", price: 68, onlineQty: 15, offlineQty: 30, emoji: "🍜", selected: true },
    { id: "staple_3", name: "Tata Salt Vacuum Evaporated (1kg)", category: "grocery", price: 28, onlineQty: 10, offlineQty: 25, emoji: "🧂", selected: true },
    { id: "staple_4", name: "Aashirvaad Shudh Chakki Atta (5kg)", category: "grocery", price: 245, onlineQty: 4, offlineQty: 10, emoji: "🌾", selected: true },
    { id: "staple_5", name: "Dove Cream Beauty Bar (100g)", category: "grocery", price: 65, onlineQty: 8, offlineQty: 16, emoji: "🧼", selected: true },
    { id: "staple_6", name: "Nandini Full Cream Milk (500ml)", category: "grocery", price: 27, onlineQty: 12, offlineQty: 20, emoji: "🥛", selected: true },
  ],
  pharmacy: [
    { id: "staple_p1", name: "Dolo 650 Tablet Strip", category: "pharmacy", price: 34, onlineQty: 20, offlineQty: 50, emoji: "💊", selected: true },
    { id: "staple_p2", name: "Dettol Antiseptic Liquid (250ml)", category: "pharmacy", price: 145, onlineQty: 6, offlineQty: 15, emoji: "🧴", selected: true },
    { id: "staple_p3", name: "Volini Pain Relief Spray (100g)", category: "pharmacy", price: 290, onlineQty: 4, offlineQty: 8, emoji: "🩹", selected: true },
    { id: "staple_p4", name: "Hansaplast Washproof Plasters (10s)", category: "pharmacy", price: 40, onlineQty: 15, offlineQty: 30, emoji: "🩹", selected: true },
  ],
  electronics: [
    { id: "staple_e1", name: "Fast Charging USB-C to USB-C Cable", category: "electronics", price: 299, onlineQty: 8, offlineQty: 15, emoji: "🔌", selected: true },
    { id: "staple_e2", name: "20W USB-C Power Adapter", category: "electronics", price: 699, onlineQty: 5, offlineQty: 10, emoji: "⚡", selected: true },
    { id: "staple_e3", name: "Duracell AA Batteries (4 Pack)", category: "electronics", price: 180, onlineQty: 10, offlineQty: 25, emoji: "🔋", selected: true },
    { id: "staple_e4", name: "3.5mm Aux Earphones with Mic", category: "electronics", price: 349, onlineQty: 6, offlineQty: 12, emoji: "🎧", selected: true },
  ],
};

const SAMPLE_SHELF_ITEMS: InventoryItem[] = [
  { id: "ai_1", name: "Dove Soap Bar (100g)", category: "grocery", price: 65, onlineQty: 6, offlineQty: 14, emoji: "🧼", selected: true },
  { id: "ai_2", name: "Colgate Strong Teeth (200g)", category: "grocery", price: 120, onlineQty: 8, offlineQty: 20, emoji: "🪥", selected: true },
  { id: "ai_3", name: "Maggi 2-Minute Noodles", category: "grocery", price: 14, onlineQty: 24, offlineQty: 40, emoji: "🍜", selected: true },
  { id: "ai_4", name: "Bru Instant Coffee (100g)", category: "grocery", price: 195, onlineQty: 5, offlineQty: 10, emoji: "☕", selected: true },
  { id: "ai_5", name: "Fortune Sunlite Sunflower Oil (1L)", category: "grocery", price: 145, onlineQty: 6, offlineQty: 12, emoji: "🌻", selected: true },
];

export default function OnboardPage() {
  const router = useRouter();
  
  // Multi-step progress: 1 = Profile, 2 = Inventory, 3 = Launch
  const [currentStep, setCurrentStep] = useState<OnboardStep>(1);

  // Step 1: Store Profile
  const [storeName, setStoreName] = useState("");
  const [storeCategory, setStoreCategory] = useState("grocery");
  const [storeArea, setStoreArea] = useState("Koramangala");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("+91 98450 12345");
  const [formError, setFormError] = useState("");

  // Step 2: Inventory & Stocking
  const [items, setItems] = useState<InventoryItem[]>(NEIGHBORHOOD_STAPLES["grocery"]);
  const [stockingTab, setStockingTab] = useState<"staples" | "ai_scan" | "custom">("staples");
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  // Custom Item Inputs
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("5");
  const [customEmoji, setCustomEmoji] = useState("📦");

  // Step 1 validation
  const handleProceedToInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setFormError("Please enter your store name");
      return;
    }
    setFormError("");
    // If items haven't been customized, default to the chosen category staples
    if (items.length === 0 || stockingTab === "staples") {
      setItems(NEIGHBORHOOD_STAPLES[storeCategory] || NEIGHBORHOOD_STAPLES["grocery"]);
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // AI Camera Scan Simulation
  const handleTriggerAIScan = () => {
    setIsScanning(true);
    setScanComplete(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
      // Merge scanned items
      setItems(SAMPLE_SHELF_ITEMS);
    }, 2400);
  };

  // Add Custom Item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customPrice) return;
    const newItem: InventoryItem = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      category: storeCategory,
      price: Number(customPrice),
      onlineQty: Number(customQty) || 5,
      offlineQty: (Number(customQty) || 5) * 2,
      emoji: customEmoji || "📦",
      selected: true,
    };
    setItems([newItem, ...items]);
    setCustomName("");
    setCustomPrice("");
    setCustomQty("5");
  };

  // Toggle item selection
  const handleToggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  // Update item field
  const handleUpdateItem = (id: string, field: keyof InventoryItem, val: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Submit & Register Shop Mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      const activeItems = items.filter(i => i.selected);
      const res = await fetch("/api/shop/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: storeName.trim(),
          category: storeCategory,
          area: storeArea,
          address: storeAddress.trim() || `${storeName}, ${storeArea}, Bengaluru`,
          phone: storePhone.trim(),
          whatsapp: storePhone.trim(),
          items: activeItems.map(i => ({
            name: i.name,
            category: i.category,
            price: i.price,
            onlineQty: i.onlineQty,
            offlineQty: i.offlineQty,
            imageEmoji: i.emoji,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register store");
      return data;
    },
    onSuccess: (data) => {
      router.push(data.redirectUrl || `/shop/dashboard?s=${data.shopId}`);
    },
  });

  const selectedCount = items.filter(i => i.selected).length;

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col selection:bg-[var(--brand-100)] selection:text-[var(--brand-500)] pb-20">
      
      {/* ── ATMOSPHERIC AMBIENT BACKDROP ─────────────────────────────── */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[450px] bg-gradient-to-b from-indigo-100/60 via-purple-50/20 to-transparent blur-3xl opacity-80" />
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(var(--text-primary) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* ── TOP MERCHANT APP BAR ────────────────────────────────────── */}
      <header className="relative z-20 border-b border-[var(--border-sm)] bg-[var(--bg-surface)]/85 backdrop-blur-md sticky top-0 shadow-[var(--shadow-xs)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="w-10 h-10 rounded-xl bg-[var(--brand-500)] text-white flex items-center justify-center font-display font-black text-xl shadow-[0_4px_14px_var(--brand-glow)] hover:scale-105 transition-transform"
              title="Return to Shelfie Home"
            >
              S
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-base tracking-tight text-[var(--text-primary)]">
                  Shelfie Merchant Onboarding
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand-100)] text-[var(--brand-500)] border border-[var(--brand-border)]">
                  Zero Commission
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">Turn walk-in counter stock into live neighborhood search</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="btn btn-secondary !px-3.5 !py-2 !text-xs !font-bold !rounded-xl"
            >
              ← Storefront
            </Link>
          </div>

        </div>
      </header>

      {/* ── STEPPER PROGRESS BAR ─────────────────────────────────────── */}
      <div className="relative z-10 border-b border-[var(--border-xs)] bg-[var(--bg-surface)] py-3">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs">
          
          <button 
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 font-bold transition-all ${
              currentStep === 1 
                ? "text-[var(--brand-500)]" 
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              currentStep === 1 ? "bg-[var(--brand-500)] text-white" : "bg-[var(--green-bg)] text-[var(--green)]"
            }`}>
              {currentStep > 1 ? "✓" : "1"}
            </span>
            <span>Store Profile</span>
          </button>

          <div className={`flex-1 h-0.5 mx-3 sm:mx-6 rounded ${currentStep >= 2 ? "bg-[var(--brand-500)]" : "bg-[var(--border-sm)]"}`} />

          <button 
            onClick={() => storeName && setCurrentStep(2)}
            disabled={!storeName}
            className={`flex items-center gap-2 font-bold transition-all disabled:opacity-40 ${
              currentStep === 2 
                ? "text-[var(--brand-500)]" 
                : currentStep > 2 ? "text-[var(--green)]" : "text-[var(--text-secondary)]"
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              currentStep === 2 ? "bg-[var(--brand-500)] text-white" : currentStep > 2 ? "bg-[var(--green-bg)] text-[var(--green)]" : "bg-[var(--bg-surface-3)] text-[var(--text-muted)]"
            }`}>
              {currentStep > 2 ? "✓" : "2"}
            </span>
            <span>Shelf Stocking</span>
          </button>

          <div className={`flex-1 h-0.5 mx-3 sm:mx-6 rounded ${currentStep === 3 ? "bg-[var(--brand-500)]" : "bg-[var(--border-sm)]"}`} />

          <button 
            onClick={() => storeName && items.length > 0 && setCurrentStep(3)}
            disabled={!storeName || items.length === 0}
            className={`flex items-center gap-2 font-bold transition-all disabled:opacity-40 ${
              currentStep === 3 ? "text-[var(--brand-500)]" : "text-[var(--text-secondary)]"
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              currentStep === 3 ? "bg-[var(--brand-500)] text-white" : "bg-[var(--bg-surface-3)] text-[var(--text-muted)]"
            }`}>
              3
            </span>
            <span>Launch POS</span>
          </button>

        </div>
      </div>

      {/* ── MAIN ONBOARDING CONTAINER ────────────────────────────────── */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-8 pb-12 flex-1">
        
        {/* ════════════════════════════════════════════════════════════════
            STEP 1: STORE PROFILE & LOCATION
           ════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Step Intro */}
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[var(--brand-500)] bg-[var(--brand-100)] px-3 py-1 rounded-full border border-[var(--brand-border)]">
                Step 1 of 3: Store Details
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-display text-[var(--text-primary)]">
                Register Your Neighborhood Store
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Let customers in your locality discover what&apos;s physically on your shelves and reserve items for quick counter pickup.
              </p>
            </div>

            {/* Form Card */}
            <form onSubmit={handleProceedToInventory} className="surface p-6 sm:p-8 rounded-[24px] border border-[var(--border-md)] shadow-[var(--shadow-md)] space-y-6 max-w-2xl mx-auto">
              
              {/* Store Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                  <span>Store Name *</span>
                  <span className="text-[11px] text-[var(--text-muted)] font-normal">As seen on your signboard</span>
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Sri Venkateshwara General Stores"
                  value={storeName}
                  onChange={(e) => {
                    setStoreName(e.target.value);
                    if (formError) setFormError("");
                  }}
                  autoFocus
                  required
                  className="input !text-base !font-semibold !h-12 !rounded-xl"
                />
                
                {/* Pre-fill quick suggestions */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10.5px] text-[var(--text-muted)] font-medium">Suggestions:</span>
                  {["Koramangala Daily Mart", "Krishna Provisions", "Apollo Meds Corner"].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setStoreName(sug)}
                      className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-surface-2)] hover:bg-[var(--brand-100)] hover:text-[var(--brand-500)] border border-[var(--border-xs)] transition-colors"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Primary Store Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "grocery", label: "Grocery & Kirana", emoji: "🛒" },
                    { id: "pharmacy", label: "Pharmacy & Meds", emoji: "💊" },
                    { id: "electronics", label: "Electronics & Cables", emoji: "⚡" },
                    { id: "stationery", label: "Books & Stationery", emoji: "📚" },
                    { id: "bakery", label: "Bakery & Fresh Dairy", emoji: "🥛" },
                    { id: "misc", label: "General Variety Store", emoji: "🏪" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setStoreCategory(cat.id);
                        if (NEIGHBORHOOD_STAPLES[cat.id]) {
                          setItems(NEIGHBORHOOD_STAPLES[cat.id]);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        storeCategory === cat.id
                          ? "border-[var(--brand-500)] bg-[var(--brand-100)] text-[var(--brand-500)] shadow-sm font-bold"
                          : "border-[var(--border-sm)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-2)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="text-xs">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Area & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Bengaluru Hub / Locality *
                  </label>
                  <select
                    value={storeArea}
                    onChange={(e) => setStoreArea(e.target.value)}
                    className="input !h-12 !rounded-xl cursor-pointer font-medium"
                  >
                    <option value="Koramangala">📍 Koramangala (5th & 6th Block)</option>
                    <option value="Indiranagar">📍 Indiranagar (100ft & 12th Main)</option>
                    <option value="HSR Layout">📍 HSR Layout (Sector 1 - 7)</option>
                    <option value="JP Nagar">📍 JP Nagar (Phases 1 - 6)</option>
                    <option value="Jayanagar">📍 Jayanagar (3rd & 4th Block)</option>
                    <option value="Whitefield">📍 Whitefield (ITPL & Main Rd)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Merchant Contact Mobile *
                  </label>
                  <input
                    type="tel"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    required
                    className="input !h-12 !rounded-xl font-mono text-sm"
                  />
                  <p className="text-[10px] text-[var(--text-muted)]">Used for instant WhatsApp customer pickup alerts</p>
                </div>
              </div>

              {/* Physical Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Physical Store Address & Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. #42, 5th Main, Near Jyoti Nivas College"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  className="input !h-12 !rounded-xl text-xs sm:text-sm"
                />
              </div>

              {/* Guaranteed Benefits Callout */}
              <div className="p-4 rounded-xl bg-[var(--green-bg)] border border-[var(--green-border)] space-y-1.5">
                <div className="text-xs font-bold text-[var(--green)] flex items-center gap-1.5">
                  <span>✓ 100% Free Neighborhood Partner Guarantee</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  No commissions on walk-in sales. Shoppers arrive at your counter, show their 6-digit PIN pass, and pay you directly via Cash or UPI.
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red-border)] text-xs font-bold text-center">
                  {formError}
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="btn btn-primary w-full !h-13 !text-sm !font-black !rounded-xl shadow-[0_4px_16px_var(--brand-glow)]"
                >
                  Continue to Stocking Inventory →
                </button>
              </div>

            </form>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 2: SHELF CATALOG & STOCKING
           ════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Step Intro */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[var(--brand-500)] bg-[var(--brand-100)] px-3 py-1 rounded-full border border-[var(--brand-border)]">
                  Step 2 of 3: Shelf Stocking
                </span>
                <h2 className="text-2xl font-black font-display text-[var(--text-primary)] mt-1.5">
                  Stock {storeName}&apos;s Live Shelves
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Choose how to add your products. You can scan shelves, select neighborhood staples, or add custom items.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="btn btn-secondary !py-2 !px-3.5 !text-xs !font-bold"
                >
                  ← Edit Store Details
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={selectedCount === 0}
                  className="btn btn-primary !py-2 !px-5 !text-xs !font-bold shadow-[0_2px_10px_var(--brand-glow)] disabled:opacity-50"
                >
                  Review & Launch ({selectedCount}) →
                </button>
              </div>
            </div>

            {/* Method Tabs */}
            <div className="flex border-b border-[var(--border-sm)] gap-2 bg-[var(--bg-surface)] p-1.5 rounded-2xl border">
              <button
                type="button"
                onClick={() => setStockingTab("staples")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  stockingTab === "staples"
                    ? "bg-[var(--brand-500)] text-white shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>📦</span>
                <span>Neighborhood Essentials</span>
              </button>

              <button
                type="button"
                onClick={() => setStockingTab("ai_scan")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  stockingTab === "ai_scan"
                    ? "bg-[var(--brand-500)] text-white shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>✨</span>
                <span>AI Shelf Photo Scan</span>
              </button>

              <button
                type="button"
                onClick={() => setStockingTab("custom")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  stockingTab === "custom"
                    ? "bg-[var(--brand-500)] text-white shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>➕</span>
                <span>Custom Item</span>
              </button>
            </div>

            {/* TAB CONTENT: AI SCAN */}
            {stockingTab === "ai_scan" && (
              <div className="surface p-6 sm:p-8 rounded-[24px] border border-[var(--border-md)] text-center space-y-6">
                {!isScanning && !scanComplete && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--brand-100)] text-[var(--brand-500)] flex items-center justify-center mx-auto text-3xl border border-[var(--brand-border)]">
                      📸
                    </div>
                    <div>
                      <h3 className="font-display font-black text-lg text-[var(--text-primary)]">
                        Snap or Upload Shelf Photo
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                        Shelfie AI Vision automatically detects package labels, identifies barcodes, and estimates current stock counts.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
                      <button
                        type="button"
                        onClick={handleTriggerAIScan}
                        className="btn btn-primary !py-3 !px-6 !text-xs !font-black !rounded-xl shadow-[var(--shadow-sm)]"
                      >
                        ⚡ Run AI Vision Scan (Demo)
                      </button>
                    </div>
                  </div>
                )}

                {isScanning && (
                  <div className="py-10 space-y-5">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-[var(--brand-100)]" />
                      <div className="absolute inset-0 rounded-full border-4 border-[var(--brand-500)] border-t-transparent animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center text-2xl">
                        ✨
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)]">
                        Analyzing Shelf Geometry & Product Barcodes...
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 animate-pulse font-mono">
                        Running Azure OpenAI Vision model · Segmenting inventory items
                      </p>
                    </div>
                  </div>
                )}

                {scanComplete && (
                  <div className="p-4 rounded-xl bg-[var(--green-bg)] border border-[var(--green-border)] text-left flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">✨</span>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-[var(--green)]">
                          AI Scan Complete — 5 Items Extracted
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Products have been added to your inventory table below for review.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleTriggerAIScan}
                      className="btn btn-secondary !py-1.5 !px-3 !text-xs !font-bold"
                    >
                      Rescan
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: CUSTOM ITEM ADDER */}
            {stockingTab === "custom" && (
              <form onSubmit={handleAddCustomItem} className="surface p-5 rounded-[20px] border border-[var(--border-md)] space-y-4">
                <div className="text-xs font-bold text-[var(--text-primary)]">Add Custom Product to Shelf</div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  
                  <div className="sm:col-span-1">
                    <label className="text-[10.5px] font-bold text-[var(--text-muted)] block mb-1">Emoji</label>
                    <input 
                      type="text" 
                      value={customEmoji} 
                      onChange={(e) => setCustomEmoji(e.target.value)} 
                      className="input !text-center !text-lg !h-10 !px-1"
                      maxLength={2}
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="text-[10.5px] font-bold text-[var(--text-muted)] block mb-1">Product Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Basmati Rice (1kg)" 
                      value={customName} 
                      onChange={(e) => setCustomName(e.target.value)} 
                      required
                      className="input !text-xs !h-10"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10.5px] font-bold text-[var(--text-muted)] block mb-1">Price (₹) *</label>
                    <input 
                      type="number" 
                      placeholder="120" 
                      value={customPrice} 
                      onChange={(e) => setCustomPrice(e.target.value)} 
                      required
                      className="input !text-xs !h-10"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10.5px] font-bold text-[var(--text-muted)] block mb-1">Hold Qty</label>
                    <input 
                      type="number" 
                      value={customQty} 
                      onChange={(e) => setCustomQty(e.target.value)} 
                      className="input !text-xs !h-10"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="btn btn-primary w-full !h-10 !text-xs !font-bold !rounded-xl"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* INVENTORY REVIEW TABLE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">
                    Inventory Items to Publish
                  </h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--brand-100)] text-[var(--brand-500)]">
                    {selectedCount} Selected
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = items.every(i => i.selected);
                    setItems(items.map(i => ({ ...i, selected: !allSelected })));
                  }}
                  className="text-xs font-bold text-[var(--brand-500)] hover:underline"
                >
                  {items.every(i => i.selected) ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="space-y-2.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`surface p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 ${
                      item.selected
                        ? "border-[var(--border-sm)] shadow-[var(--shadow-xs)]"
                        : "opacity-50 border-dashed border-[var(--border-sm)] bg-transparent"
                    }`}
                  >
                    {/* Item checkbox + info */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleItem(item.id)}
                        className="w-4 h-4 rounded text-[var(--brand-500)] focus:ring-[var(--brand-500)] cursor-pointer shrink-0"
                      />

                      <div className="w-10 h-10 rounded-lg bg-[var(--bg-surface-2)] flex items-center justify-center text-xl shrink-0 border border-[var(--border-xs)]">
                        {item.emoji}
                      </div>

                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, "name", e.target.value)}
                          className="font-bold text-xs sm:text-sm text-[var(--text-primary)] bg-transparent border-b border-transparent hover:border-[var(--border-sm)] focus:border-[var(--brand-500)] outline-none w-full"
                        />
                        <div className="text-[10.5px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                          {item.category}
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Price adjusters */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-xs)]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">Price:</span>
                        <div className="flex items-center font-bold text-xs bg-[var(--bg-surface-2)] px-2 py-1 rounded-lg border border-[var(--border-xs)]">
                          <span>₹</span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleUpdateItem(item.id, "price", Number(e.target.value))}
                            className="w-14 text-right bg-transparent outline-none font-bold text-xs ml-0.5"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">Online Hold:</span>
                        <input
                          type="number"
                          value={item.onlineQty}
                          onChange={(e) => handleUpdateItem(item.id, "onlineQty", Number(e.target.value))}
                          className="w-12 text-center bg-[var(--bg-surface-2)] px-1.5 py-1 rounded-lg border border-[var(--border-xs)] font-bold text-xs outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-[var(--text-muted)] hover:text-[var(--red)] p-1 text-sm transition-colors"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>

                  </div>
                ))}
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="sticky bottom-6 z-20 surface p-4 rounded-2xl border border-[var(--border-md)] shadow-[var(--shadow-xl)] flex items-center justify-between gap-4 mt-6 bg-[var(--bg-surface)]/95 backdrop-blur-md">
                <div className="text-xs">
                  <span className="font-extrabold text-[var(--text-primary)]">{selectedCount} products</span> ready for live shelf radar
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="btn btn-secondary !py-2 !px-3.5 !text-xs !font-bold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    disabled={selectedCount === 0}
                    className="btn btn-primary !py-2.5 !px-6 !text-xs !font-black !rounded-xl shadow-[0_2px_12px_var(--brand-glow)] disabled:opacity-50"
                  >
                    Continue to Store Activation →
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 3: REVIEW & LIVE STORE ACTIVATION
           ════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-fadeIn max-w-2xl mx-auto">
            
            {/* Step Intro */}
            <div className="text-center space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[var(--green)] bg-[var(--green-bg)] px-3 py-1 rounded-full border border-[var(--green-border)]">
                Final Step: Review & Activation
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-display text-[var(--text-primary)]">
                Ready to Go Live on Shelfie!
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Review your store details and launch your merchant POS terminal.
              </p>
            </div>

            {/* Store Preview Card */}
            <div className="surface rounded-[24px] border border-[var(--border-md)] shadow-[var(--shadow-lg)] overflow-hidden">
              {/* Top Banner */}
              <div className="bg-gradient-to-r from-[var(--brand-500)] to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                    Live Storefront Preview
                  </span>
                  <h3 className="text-lg font-black font-display mt-1">{storeName}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                  🏬
                </div>
              </div>

              {/* Details List */}
              <div className="p-6 space-y-4 text-xs">
                <div className="flex justify-between py-2 border-b border-[var(--border-xs)]">
                  <span className="text-[var(--text-secondary)]">Location:</span>
                  <span className="font-bold text-[var(--text-primary)]">{storeArea}, Bengaluru</span>
                </div>

                <div className="flex justify-between py-2 border-b border-[var(--border-xs)]">
                  <span className="text-[var(--text-secondary)]">Address:</span>
                  <span className="font-bold text-[var(--text-primary)] text-right max-w-xs">{storeAddress || `${storeName}, ${storeArea}`}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-[var(--border-xs)]">
                  <span className="text-[var(--text-secondary)]">Contact Phone:</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{storePhone}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-[var(--border-xs)]">
                  <span className="text-[var(--text-secondary)]">Catalog Initial Stock:</span>
                  <span className="font-bold text-[var(--brand-500)]">{selectedCount} Verified Products</span>
                </div>

                <div className="flex justify-between py-2 items-baseline">
                  <span className="text-[var(--text-secondary)]">Counter Settlement:</span>
                  <span className="font-black text-sm text-[var(--green)]">0% Commission · Instant Walk-in UPI</span>
                </div>
              </div>

              {/* Sample Items Chips */}
              <div className="px-6 pb-6 pt-2">
                <div className="text-[11px] font-bold text-[var(--text-muted)] mb-2">Live Items on Shelf:</div>
                <div className="flex flex-wrap gap-1.5">
                  {items.filter(i => i.selected).map(i => (
                    <span
                      key={i.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-xs)] text-xs font-semibold text-[var(--text-primary)]"
                    >
                      <span>{i.emoji}</span>
                      <span>{i.name}</span>
                      <span className="text-[var(--brand-500)] font-bold">₹{i.price}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {registerMutation.isError && (
              <div className="p-3.5 rounded-xl bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red-border)] text-xs font-bold text-center">
                {(registerMutation.error as any)?.message || "Failed to register store. Please try again."}
              </div>
            )}

            {/* Launch Action */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => registerMutation.mutate()}
                disabled={registerMutation.isPending}
                className="btn btn-primary w-full !h-14 !text-base !font-black !rounded-xl shadow-[0_4px_20px_var(--brand-glow)] disabled:opacity-50"
              >
                {registerMutation.isPending ? "Activating Merchant Node..." : "🚀 Launch Store & Open POS Terminal →"}
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn btn-secondary w-full !py-2.5 !text-xs !font-bold !rounded-xl"
              >
                ← Back to Adjust Items
              </button>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
