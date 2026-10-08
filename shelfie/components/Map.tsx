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

      // Create safe DOM element for popup to prevent XSS
      const container = document.createElement('div');
      container.style.padding = '4px';
      container.style.minWidth = '160px';

      const prodNameEl = document.createElement('div');
      prodNameEl.style.fontWeight = 'bold';
      prodNameEl.style.marginBottom = '4px';
      prodNameEl.style.color = '#f1f5f9';
      prodNameEl.textContent = offer.productName;
      container.appendChild(prodNameEl);

      const shopNameEl = document.createElement('div');
      shopNameEl.style.color = '#94a3b8';
      shopNameEl.style.fontSize = '12px';
      shopNameEl.style.marginBottom = '2px';
      shopNameEl.textContent = offer.shopName;
      container.appendChild(shopNameEl);

      const metaEl = document.createElement('div');
      metaEl.style.color = '#64748b';
      metaEl.style.fontSize = '11px';
      metaEl.style.marginBottom = '10px';
      metaEl.textContent = `${offer.walkMinutes} min walk · ₹${offer.price.toLocaleString('en-IN')}`;
      container.appendChild(metaEl);

      const btn = document.createElement('button');
      btn.style.width = '100%';
      btn.style.padding = '6px 8px';
      btn.style.fontSize = '12px';
      btn.style.fontWeight = '600';
      btn.style.borderRadius = '8px';
      btn.style.cursor = 'pointer';
      btn.style.border = 'none';
      btn.style.background = isGreen ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(245,158,11,0.15)';
      btn.style.color = isGreen ? 'white' : '#f59e0b';
      btn.textContent = isGreen ? '🔒 Reserve' : '💬 Request';
      btn.onclick = () => {
        router.push(`/${isGreen ? 'reserve' : 'request'}?s=${encodeURIComponent(offer.shopId)}&i=${encodeURIComponent(offer.inventoryId)}`);
      };
      container.appendChild(btn);

      const m = L.marker([offer.location.lat, offer.location.lng], { icon: customIcon })
        .addTo(mapRef.current!)
        .bindPopup(container);
      
      markersRef.current.push(m);
    });

    if (offers.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [offers]);

  return <div ref={mapContainerRef} className="w-full h-full z-0" />;
}
