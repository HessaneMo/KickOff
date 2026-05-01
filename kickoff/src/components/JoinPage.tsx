"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PillNav from "@/components/PillNav";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Tournament } from "@/lib/database.types";

const FORMAT_LABEL: Record<string, string> = {
  groups: "Poules",
  knockout: "Élimination",
  groups_knockout: "Poules + Finale",
};

export default function JoinPage() {
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Tournament | null>(null);
  const [position, setPosition] = useState<string>("");
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function loadMine() {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setMyTournaments(data ?? []);
    }
    loadMine();
  }, []);

  // Auto-lookup when code param in URL
  useEffect(() => {
    const c = params.get("code");
    if (c) { setCode(c); handleLookup(c); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLookup(c?: string) {
    const val = (c ?? code).trim().toUpperCase();
    if (val.length < 8) { setError("Code trop court."); return; }
    setError(null);
    setPreview(null);
    setLoading(true);
    const { data, error: err } = await supabase
      .from("tournaments")
      .select("*")
      .eq("short_code", val)
      .single();
    if (err || !data) { setError("Tournoi introuvable. Vérifie le code."); setLoading(false); return; }
    setPreview(data);
    setLoading(false);
  }

  async function handleJoin() {
    if (!preview || !user) return;
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.from("tournament_members").insert({
      tournament_id: preview.id,
      user_id: user.id,
      role: "player",
      position: position || null,
    });

    if (err) {
      if (err.code === "23505") {
        // Already member — just redirect
        router.push(`/tournament?id=${preview.id}`);
        return;
      }
      setError(err.message);
      setLoading(false);
      return;
    }

    router.push(`/tournament?id=${preview.id}`);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#111827" }}>

      <div style={{ background: "#111827", padding: "13px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #1f2937" }}>
        <Link href="/dashboard" style={{ width: "30px", height: "30px", background: "#1f2937", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
            <path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>
          </svg>
        </Link>
        <span style={{ color: "#f9fafb", fontSize: "13px", fontWeight: 700, flex: 1 }}>Rejoindre un tournoi</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "24px 20px" }}>

        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "18px", fontWeight: 700, color: "#f9fafb" }}>Entre le code du tournoi</p>
          <p style={{ fontSize: "10px", color: "#4b5563", marginTop: "4px" }}>Format : XXXX-0000 · donné par l&apos;organisateur</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input
            type="text"
            placeholder="XXXX-0000"
            maxLength={9}
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setPreview(null); setError(null); }}
            onKeyDown={e => e.key === "Enter" && handleLookup()}
            style={{ width: "100%", background: "#1f2937", border: `2px solid ${preview ? "#4ade80" : error ? "#dc2626" : "#374151"}`, borderRadius: "12px", padding: "16px", fontSize: "22px", fontWeight: 700, fontFamily: "monospace", color: "#f9fafb", textAlign: "center", letterSpacing: "4px", outline: "none", boxSizing: "border-box" }}
          />
          {error && <p style={{ fontSize: "10px", color: "#f87171", textAlign: "center" }}>{error}</p>}
        </div>

        {/* Preview card */}
        {preview && (
          <div style={{ background: "#1f2937", borderRadius: "12px", padding: "16px", border: "1px solid #4ade80" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
              <div style={{ width: "6px", height: "6px", background: "#4ade80", borderRadius: "50%" }} />
              <span style={{ fontSize: "9px", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "1px" }}>Tournoi trouvé</span>
            </div>
            <p style={{ fontSize: "15px", fontWeight: 900, color: "#f9fafb", marginBottom: "4px" }}>{preview.name}</p>
            <p style={{ fontSize: "10px", color: "#6b7280" }}>
              {preview.team_size}v{preview.team_size} · {FORMAT_LABEL[preview.format]} · {preview.visibility === "public" ? "Public" : "Privé"}
            </p>
          </div>
        )}

        {/* Poste selector — shown after preview */}
        {preview && (
          <div>
            <p style={{ fontSize: "9px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Ton poste <span style={{ color: "#374151", fontWeight: 500, textTransform: "none" }}>(optionnel)</span></p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
              {[
                { id: "goalkeeper", label: "GK", full: "Gardien" },
                { id: "defender", label: "DEF", full: "Défenseur" },
                { id: "defensive_mid", label: "MDef", full: "Mil. défensif" },
                { id: "midfielder", label: "MIL", full: "Milieu" },
                { id: "winger", label: "AIL", full: "Ailier" },
                { id: "striker", label: "ATT", full: "Attaquant" },
              ].map(p => (
                <button key={p.id} onClick={() => setPosition(position === p.id ? "" : p.id)}
                  style={{ background: position === p.id ? "#1e3a5f" : "#1f2937", border: `1px solid ${position === p.id ? "#60a5fa" : "#374151"}`, borderRadius: "8px", padding: "8px 4px", cursor: "pointer", textAlign: "center" }}>
                  <p style={{ fontSize: "11px", fontWeight: 800, color: position === p.id ? "#60a5fa" : "#9ca3af" }}>{p.label}</p>
                  <p style={{ fontSize: "8px", color: position === p.id ? "#60a5fa" : "#4b5563", marginTop: "2px" }}>{p.full}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!preview ? (
          <button
            onClick={() => handleLookup()}
            disabled={loading || code.length < 8}
            style={{ width: "100%", background: loading || code.length < 8 ? "#374151" : "#4ade80", color: loading || code.length < 8 ? "#4b5563" : "#111827", border: "none", borderRadius: "10px", padding: "13px", fontSize: "13px", fontWeight: 700, fontFamily: "inherit", cursor: loading || code.length < 8 ? "default" : "pointer" }}>
            {loading ? "Recherche..." : "Rechercher"}
          </button>
        ) : (
          <button
            onClick={handleJoin}
            disabled={loading}
            style={{ width: "100%", background: loading ? "#166534" : "#4ade80", color: "#111827", border: "none", borderRadius: "10px", padding: "13px", fontSize: "13px", fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
            {loading ? "Inscription..." : `Rejoindre "${preview.name}" →`}
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ flex: 1, height: "1px", background: "#1f2937" }} />
          <span style={{ fontSize: "9px", fontWeight: 700, color: "#374151" }}>MES TOURNOIS</span>
          <div style={{ flex: 1, height: "1px", background: "#1f2937" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {myTournaments.length === 0 ? (
            <p style={{ fontSize: "11px", color: "#4b5563", textAlign: "center" }}>Aucun tournoi encore.</p>
          ) : myTournaments.map(t => (
            <Link key={t.id} href={`/tournament?id=${t.id}`} style={{ display: "flex", alignItems: "center", gap: "10px", background: "#1f2937", borderRadius: "10px", padding: "10px 13px", textDecoration: "none" }}>
              <div style={{ width: "32px", height: "32px", background: "#374151", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: "#9ca3af", flexShrink: 0 }}>
                {t.name.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#f1f5f9" }}>{t.name}</p>
                <p style={{ fontSize: "9px", color: "#4b5563" }}>{t.team_size}v{t.team_size} · {FORMAT_LABEL[t.format]}</p>
              </div>
              <span style={{ fontSize: "8px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", background: t.status === "ongoing" ? "#450a0a" : "#1f2937", color: t.status === "ongoing" ? "#f87171" : "#4b5563" }}>
                {t.status === "ongoing" ? "LIVE" : t.status === "open" ? "Ouvert" : t.status === "finished" ? "Terminé" : "Brouillon"}
              </span>
            </Link>
          ))}
        </div>

      </div>

      <PillNav active="join" />
    </div>
  );
}
