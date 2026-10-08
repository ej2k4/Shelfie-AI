"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"customer" | "shopkeeper">("customer");
  const [phone, setPhone] = useState("+91");
  const [shopId, setShopId] = useState("shop_km_01");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "customer") {
      login({ role: "customer", phone });
      router.push("/");
    } else {
      login({ role: "shopkeeper", shopId });
      router.push("/shop/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Mock Login</h1>
        
        <div className="flex gap-2 mb-6 p-1 bg-slate-800 rounded-lg">
          <button 
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'customer' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setRole("customer")}
          >
            Customer
          </button>
          <button 
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'shopkeeper' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setRole("shopkeeper")}
          >
            Shopkeeper
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {role === "customer" ? (
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Phone Number</label>
              <input 
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Select Shop</label>
              <select 
                value={shopId}
                onChange={e => setShopId(e.target.value)}
                className="input py-2.5"
              >
                <option value="shop_km_01">Sri Ganesh Electronics</option>
                <option value="shop_km_02">Koramangala Pharma Plus</option>
                <option value="shop_km_03">Daily Needs Store</option>
                <option value="shop_in_01">Tech Galaxy Indiranagar</option>
                <option value="shop_hsr_02">24/7 Pharmacy HSR</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn-primary w-full justify-center mt-2">
            Continue as {role === "customer" ? "Customer" : "Shopkeeper"}
          </button>
        </form>
      </div>
    </div>
  );
}
