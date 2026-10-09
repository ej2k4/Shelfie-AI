"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SearchOffer } from "@/lib/types";



// Fix leaflet icon issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const getIcon = (offer: SearchOffer, isHovered: boolean) => {
  const baseColor = offer.inStock ? "#ffffff" : "#f5f3ef";
  const textColor = offer.inStock ? "#1a1a18" : "#8c867f";
  const color = isHovered ? "#1a1a18" : baseColor;
  const currentTextColor = isHovered ? "#ffffff" : textColor;
  const scale = isHovered ? "scale(1.1)" : "scale(1)";
  const shadow = isHovered
    ? "0 12px 40px rgba(60,50,40,0.18), 0 4px 8px rgba(60,50,40,0.10)"
    : "0 2px 8px rgba(60,50,40,0.10), 0 1px 2px rgba(60,50,40,0.06)";
  const border = isHovered ? "1px solid #1a1a18" : "1px solid #e5e1db";

  return L.divIcon({
    className: "custom-shop-marker",
    html: `
      <div style="
        height: 32px;
        min-width: 52px;
        padding: 0 14px;
        background: ${color};
        color: ${currentTextColor};
        border-radius: 999px;
        transform: ${scale};
        transform-origin: bottom center;
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: ${shadow};
        display: flex; align-items: center; justify-content: center;
        position: relative;
        font-weight: 700;
        font-size: 13px;
        font-family: Inter, sans-serif;
        letter-spacing: -0.01em;
        border: ${border};
        white-space: nowrap;
      ">
        ₹${offer.price.toLocaleString("en-IN")}
        <div style="
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 8px;
          height: 8px;
          background: ${color};
          border-right: ${border};
          border-bottom: ${border};
          z-index: -1;
        "></div>
      </div>
    `,
    iconSize: [52, 32],
    iconAnchor: [26, 38],
    popupAnchor: [0, -40],
  });
};

interface ShelfieMapProps {
  offers: SearchOffer[];
  center: [number, number];
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
}

export default function ShelfieMap({ offers, center, hoveredId, onHover }: ShelfieMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialise map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    mapRef.current = L.map(mapContainerRef.current, { zoomControl: false }).setView(center, 14);

    // OpenStreetMap standard tiles — free, no API key required
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      maxZoom: 19,
    }).addTo(mapRef.current);

    // User location dot
    const userIcon = L.divIcon({
      className: "user-location-dot",
      html: `<div style="width:18px;height:18px;background:#b5451b;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(181,69,27,0.2);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker(center, { icon: userIcon, zIndexOffset: 2000 }).addTo(mapRef.current).bindPopup("You are here");

    // Zoom control — top right
    L.control.zoom({ position: "topright" }).addTo(mapRef.current);

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Re-centre when location changes
  useEffect(() => {
    mapRef.current?.setView(center, mapRef.current.getZoom(), { animate: true });
  }, [center[0], center[1]]);

  // Sync markers whenever offers list changes
  useEffect(() => {
    if (!mapRef.current) return;
    markersMapRef.current.forEach(m => m.remove());
    markersMapRef.current.clear();

    const bounds = L.latLngBounds([center]);

    offers.forEach(offer => {
      bounds.extend([offer.location.lat, offer.location.lng]);
      const m = L.marker([offer.location.lat, offer.location.lng], {
        icon: getIcon(offer, hoveredId === offer.inventoryId),
      }).addTo(mapRef.current!);

      m.on("mouseover", () => onHover?.(offer.inventoryId));
      m.on("mouseout", () => onHover?.(null));
      m.on("click", () => mapRef.current?.setView([offer.location.lat, offer.location.lng], 16, { animate: true }));

      markersMapRef.current.set(offer.inventoryId, m);
    });

    if (offers.length > 0) mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
  }, [offers]);

  // Update marker icons on hover change
  useEffect(() => {
    offers.forEach(offer => {
      const m = markersMapRef.current.get(offer.inventoryId);
      if (!m) return;
      m.setIcon(getIcon(offer, hoveredId === offer.inventoryId));
      m.setZIndexOffset(hoveredId === offer.inventoryId ? 1000 : 0);
    });
  }, [hoveredId, offers]);

  return <div ref={mapContainerRef} className="w-full h-full z-0" />;
}
