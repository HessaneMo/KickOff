"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { supabase } from "@/lib/supabase";
import type { Tournament } from "@/lib/database.types";
import "leaflet/dist/leaflet.css";

type TournamentWithLocation = Tournament & { _isMine?: boolean };

export default function MapView({ userId }: { userId: string | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const markersRef = useRef<{ name: string; marker: LeafletMarker; t: TournamentWithLocation }[]>([]);
  const mapInstanceRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let map: LeafletMap;

    async function init() {
      const L = (await import("leaflet")).default;

      // Fix default icon paths broken by webpack
      // @ts-expect-error _getIconUrl is private
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current || mapInstanceRef.current) return;

      map = L.map(mapRef.current, { zoomControl: true }).setView([50.85, 4.35], 11);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Fetch public tournaments with location
      const { data: publicT } = await supabase
        .from("tournaments")
        .select("*")
        .eq("visibility", "public")
        .not("latitude", "is", null);

      // Fetch user's private tournaments with location
      let privateT: Tournament[] = [];
      if (userId) {
        const { data: memberships } = await supabase
          .from("tournament_members")
          .select("tournament_id")
          .eq("user_id", userId);

        if (memberships && memberships.length > 0) {
          const ids = memberships.map((m) => m.tournament_id);
          const { data } = await supabase
            .from("tournaments")
            .select("*")
            .eq("visibility", "private")
            .in("id", ids)
            .not("latitude", "is", null);
          privateT = data ?? [];
        }
      }

      const all: TournamentWithLocation[] = [
        ...(publicT ?? []).map((t) => ({ ...t, _isMine: false })),
        ...privateT.map((t) => ({ ...t, _isMine: true })),
      ];

      all.forEach((t) => {
        if (t.latitude == null || t.longitude == null) return;

        const color = t._isMine ? "#6366f1" : "#22c55e";
        const icon = L.divIcon({
          html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45)"></div>`,
          className: "",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const formatLabel: Record<string, string> = {
          groups: "Poules",
          knockout: "Élimination",
          groups_knockout: "Mixte",
        };

        const marker = L.marker([t.latitude, t.longitude], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="min-width:180px">
            <div style="font-weight:700;font-size:13px;color:#f9fafb;margin-bottom:4px">${t.name}</div>
            <span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:${t._isMine ? "#312e81" : "#064e3b"};color:${t._isMine ? "#a5b4fc" : "#34d399"};margin-bottom:6px">
              ${t._isMine ? "🔒 Privé" : "🌍 Public"}
            </span>
            <div style="font-size:11px;color:#9ca3af;margin-bottom:2px">${t.location_name ?? ""}</div>
            <div style="font-size:11px;color:#9ca3af;margin-bottom:8px">${formatLabel[t.format] ?? t.format} · ${t.max_teams} équipes</div>
            <div style="display:flex;gap:6px">
              <a href="/tournament?id=${t.id}" style="flex:1;padding:6px;background:#f9fafb;color:#0f172a;border-radius:7px;font-size:11px;font-weight:700;text-align:center;text-decoration:none">Voir tournoi</a>
              <a href="https://maps.google.com/?q=${t.latitude},${t.longitude}" target="_blank" rel="noopener noreferrer" style="flex:1;padding:6px;background:#1a3a2a;color:#34d399;border:1px solid #166534;border-radius:7px;font-size:11px;font-weight:700;text-align:center;text-decoration:none">📍 Itinéraire</a>
            </div>
          </div>
        `, { maxWidth: 220 });

        markersRef.current.push({ name: t.name.toLowerCase(), marker, t });
      });
    }

    init();

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markersRef.current = [];
    };
  }, [userId]);

  function handleSearch(value: string) {
    setSearch(value);
    const q = value.toLowerCase().trim();
    if (!q || !mapInstanceRef.current) return;
    const found = markersRef.current.find((m) => m.name.includes(q));
    if (found) {
      mapInstanceRef.current.flyTo(found.marker.getLatLng(), 15, { animate: true, duration: 0.8 });
      found.marker.openPopup();
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Search bar */}
      <div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 1000 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="🔍  Chercher un tournoi..."
          style={{
            width: "100%",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#f1f5f9",
            fontSize: 13,
            outline: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        />
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 12, left: 12, zIndex: 1000,
        background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
        padding: "8px 12px", fontSize: 11,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid white" }} />
          <span style={{ color: "#d1d5db" }}>Public</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#6366f1", border: "2px solid white" }} />
          <span style={{ color: "#d1d5db" }}>Mon tournoi privé</span>
        </div>
      </div>
    </div>
  );
}
