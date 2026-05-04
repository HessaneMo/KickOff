"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { supabase } from "@/lib/supabase";
import "leaflet/dist/leaflet.css";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  tournamentId: string;
  initialLocationName: string | null;
  initialLat: number | null;
  initialLng: number | null;
}

export default function LocationTab({ tournamentId, initialLocationName, initialLat, initialLng }: Props) {
  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstance = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  const [query, setQuery] = useState(initialLocationName ?? "");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [locationName, setLocationName] = useState(initialLocationName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initialLocationName);
  const nominatimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function initMini() {
      const L = (await import("leaflet")).default;

      // @ts-expect-error _getIconUrl is private
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!miniMapRef.current || miniMapInstance.current) return;

      const center: [number, number] = lat != null && lng != null ? [lat, lng] : [50.85, 4.35];
      const zoom = lat != null ? 15 : 11;

      const map = L.map(miniMapRef.current, { zoomControl: false }).setView(center, zoom);
      miniMapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45)"></div>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      if (lat != null && lng != null) {
        const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
        markerRef.current = marker;
        marker.on("dragend", (e) => {
          const pos = (e.target as LeafletMarker).getLatLng();
          setLat(pos.lat);
          setLng(pos.lng);
        });
      }

      map.on("click", (e) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        setLat(newLat);
        setLng(newLng);
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        } else {
          const m = L.marker([newLat, newLng], { draggable: true, icon }).addTo(map);
          markerRef.current = m;
          m.on("dragend", (ev) => {
            const pos = (ev.target as LeafletMarker).getLatLng();
            setLat(pos.lat);
            setLng(pos.lng);
          });
        }
      });
    }

    initMini();

    return () => {
      miniMapInstance.current?.remove();
      miniMapInstance.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleQueryChange(value: string) {
    setQuery(value);
    setSuggestions([]);
    if (nominatimTimer.current) clearTimeout(nominatimTimer.current);
    if (value.trim().length < 3) return;

    nominatimTimer.current = setTimeout(async () => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=3`,
        { headers: { "Accept-Language": "fr" } }
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
    }, 600);
  }

  function selectSuggestion(s: NominatimResult) {
    const newLat = parseFloat(s.lat);
    const newLng = parseFloat(s.lon);
    setLat(newLat);
    setLng(newLng);
    setLocationName(s.display_name);
    setQuery(s.display_name);
    setSuggestions([]);

    if (miniMapInstance.current) {
      miniMapInstance.current.setView([newLat, newLng], 15);
      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      } else {
        import("leaflet").then(({ default: L }) => {
          const icon = L.divIcon({
            html: `<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45)"></div>`,
            className: "", iconSize: [16, 16], iconAnchor: [8, 8],
          });
          const m = L.marker([newLat, newLng], { draggable: true, icon }).addTo(miniMapInstance.current!);
          markerRef.current = m;
          m.on("dragend", (e) => {
            const pos = (e.target as LeafletMarker).getLatLng();
            setLat(pos.lat);
            setLng(pos.lng);
          });
        });
      }
    }
  }

  async function saveLocation() {
    if (lat == null || lng == null) return;
    setSaving(true);
    await supabase
      .from("tournaments")
      .update({ location_name: locationName || query, latitude: lat, longitude: lng })
      .eq("id", tournamentId);
    setSaving(false);
    setSaved(true);
  }

  return (
    <div style={{ padding: 14 }}>
      {saved && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#1a3a2a", color: "#34d399", border: "1px solid #166534", padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
          ✅ Lieu enregistré
        </div>
      )}

      <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
        Adresse du tournoi
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Ex: Stade du Midi, Bruxelles"
        style={{
          width: "100%", background: "#0f172a", border: "1px solid #374151",
          borderRadius: 8, padding: "10px 12px", color: "#f1f5f9", fontSize: 13,
          marginBottom: 4, outline: "none",
        }}
      />

      {suggestions.length > 0 && (
        <div style={{ background: "#0f172a", border: "1px solid #374151", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => selectSuggestion(s)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "9px 12px", fontSize: 12, color: "#d1d5db",
                borderBottom: i < suggestions.length - 1 ? "1px solid #1f2937" : "none",
                background: "none", cursor: "pointer",
              }}
            >
              📍 {s.display_name}
            </button>
          ))}
        </div>
      )}

      {lat != null && lng != null && (
        <p style={{ fontSize: 10, color: "#6b7280", textAlign: "center", marginBottom: 6 }}>
          {lat.toFixed(5)}° N, {lng.toFixed(5)}° E
        </p>
      )}

      <div style={{ height: 160, borderRadius: 8, overflow: "hidden", border: "1px solid #374151", marginBottom: 10, position: "relative" }}>
        <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.7)", color: "#f1f5f9", fontSize: 10, padding: "4px 10px", borderRadius: 99, zIndex: 1000, pointerEvents: "none", whiteSpace: "nowrap" }}>
          Clique ou glisse le pin pour ajuster
        </div>
        <div ref={miniMapRef} style={{ width: "100%", height: "100%" }} />
      </div>

      <button
        onClick={saveLocation}
        disabled={lat == null || lng == null || saving}
        style={{
          width: "100%", background: lat != null ? "#22c55e" : "#374151",
          color: lat != null ? "#0f172a" : "#6b7280",
          border: "none", borderRadius: 10, padding: 12,
          fontSize: 13, fontWeight: 700, cursor: lat != null ? "pointer" : "not-allowed",
        }}
      >
        {saving ? "Enregistrement..." : "Enregistrer le lieu"}
      </button>
    </div>
  );
}
