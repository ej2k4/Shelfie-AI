"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SearchOffer } from "@/lib/types";
import { useRouter } from "next/navigation";

// Fix leaflet icon issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function Map({ offers, center }: { offers: SearchOffer[], center: [number, number] }) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Cleanup previous map instance if it exists (for Fast Refresh)
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView(center, 14);

    // Standard OSM with dark mode CSS filter (no API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      className: 'map-tiles-dark'
    }).addTo(mapRef.current);

    // Add user marker
    const userIcon = L.divIcon({
      className: 'user-marker',
      html: `<div style="width:16px;height:16px;background:#6366f1;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(99,102,241,0.5);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    L.marker(center, { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current).bindPopup("You are here");

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update center when it changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, mapRef.current.getZoom());
    }
  }, [center[0], center[1]]);

  // Update markers when offers change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([center]);

    offers.forEach(offer => {
      bounds.extend([offer.location.lat, offer.location.lng]);

      const isGreen = offer.inStock;
      const color = isGreen ? '#10b981' : '#f59e0b';
      
      const customIcon = L.divIcon({
        className: 'custom-shop-marker',
        html: `
          <div style="
            width: 36px; height: 36px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: flex; align-items: center; justify-content: center;
          ">
            <div style="transform: rotate(45deg); font-weight: 700; color: white; font-size: 10px; line-height: 1;">
              ${offer.inStock ? '✓' : '?'}
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });

      const m = L.marker([offer.location.lat, offer.location.lng], { icon: customIcon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="padding: 4px; min-width: 160px;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #f1f5f9;">${offer.productName}</div>
            <div style="color: #94a3b8; font-size: 12px; margin-bottom: 2px;">${offer.shopName}</div>
            <div style="color: #64748b; font-size: 11px; margin-bottom: 10px;">${offer.walkMinutes} min walk · ₹${offer.price.toLocaleString('en-IN')}</div>
            <button
              data-offer-inv="${offer.inventoryId}"
              data-offer-shop="${offer.shopId}"
              data-offer-type="${isGreen ? 'reserve' : 'request'}"
              style="width: 100%; padding: 6px 8px; font-size: 12px; font-weight: 600; border-radius: 8px; cursor: pointer; border: none; background: ${isGreen ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(245,158,11,0.15)'}; color: ${isGreen ? 'white' : '#f59e0b'};">
              ${isGreen ? '🔒 Reserve' : '💬 Request'}
            </button>
          </div>
        `);

      // G-04 fix: use popupopen event + data attributes instead of inline onclick string
      m.on('popupopen', (e: any) => {
        // We must scope the querySelector to the popup node because the popup is just being added to the DOM
        const popupNode = e?.popup?._contentNode as HTMLElement;
        if (!popupNode) return;
        
        const btn = popupNode.querySelector(`[data-offer-inv="${offer.inventoryId}"]`) as HTMLElement | null;
        if (!btn) return;
        
        btn.onclick = () => {
          const type = btn.dataset.offerType;
          const shop = btn.dataset.offerShop;
          const inv = btn.dataset.offerInv;
          router.push(`/${type}?s=${shop}&i=${inv}`);
        };
      });
      
      markersRef.current.push(m);
    });

    if (offers.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [offers]);

  return <div ref={mapContainerRef} className="w-full h-full z-0" />;
}
