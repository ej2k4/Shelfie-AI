"use client";
import { createContext, useContext, useState, useEffect } from "react";

export type CartItem = {
  inventoryId: string;
  shopId: string;
  shopName: string;
  productName: string;
  price: number;
  qty: number;
  imageEmoji: string;
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (inventoryId: string) => void;
  clearCart: () => void;
  total: number;
  isHydrated: boolean;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("shelfie_cart");
    if (saved) {
      try { setItems(JSON.parse(saved)); } catch (e) {}
    }
    setIsHydrated(true);
  }, []);

  const save = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem("shelfie_cart", JSON.stringify(newItems));
  };

  const addItem = (item: Omit<CartItem, "qty">) => {
    const existing = items.find(i => i.inventoryId === item.inventoryId);
    if (existing) {
      save(items.map(i => i.inventoryId === item.inventoryId ? { ...i, qty: i.qty + 1 } : i));
    } else {
      save([...items, { ...item, qty: 1 }]);
    }
  };

  const removeItem = (inventoryId: string) => {
    save(items.filter(i => i.inventoryId !== inventoryId));
  };

  const clearCart = () => {
    save([]);
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total, isHydrated }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
