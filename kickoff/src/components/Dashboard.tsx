"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PillNav from "@/components/PillNav";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Tournament } from "@/lib/database.types";

const ranking = [
  { pos: 1, name: "Les Diables Rouges", pts: 9, forme: ["w","w","w"], top: true },
  { pos: 2, name: "FC Molenbeek", pts: 6, forme: ["w","l","w"], top: true },
  { pos: 3, name: "Real Ixelles", pts: 3, forme: ["l","w","l"], top: false },
  { pos: 4, name: "Anderlecht Boys", pts: 0, forme: ["l","l","l"], top: false, dim: true },
];

const scorers = [
  { rank: "1", name: "Karim Benali", team: "Les Diables Rouges", goals: 7, rankColor: "#fbbf24" },
  { rank: "2", name: "Thomas Dupont", team: "FC Molenbeek", goals: 5, rankColor: "#9ca3af" },
  { rank: "3", name: "Youssef Amrani", team: "Real Ixelles", goals: 4, rankColor: "#d97706" },
];

const activity = [
  { color: "#22c55e", text: "Résultat encodé · Real Ixelles 2–4 Les Diables", time: "13h12" },
  { color: "#60a5fa", text: "Youssef Amrani rejoint Real Ixelles", time: "11h34" },
  { color: "#fbbf24", text: "Match à venir · Les Diables vs FC Molenbeek · 15h00", time: "10h00" },
];

const fDot = (f: string) => f === "w" ? "#22c55e" : f === "l" ? "#ef4444" : "#f59e0b";

function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusBadge(status: Tournament["status"]) {
  const map = {
    draft: { label: "Brouillon", bg: "#1f2937", color: "#6b7280" },
    open: { label: "Inscriptions", bg: "#14532d", color: "#4ade80" },
    ongoing: { label: "En cours", bg: "#450a0a", color: "#f87171" },
    finished: { label: "Terminé", bg: "#1e1b4b", color: "#818cf8" },
  };
  return map[status];
}

function formatMeta(t: Tournament) {
  const size = `${t.team_size}v${t.team_size}`;
  const vis = t.visibility === "private" ? "Privé" : "Public";
  const date = t.starts_at ? new Date(t.starts_at).toLocaleDateString("fr-BE", { day: "2-digit", month: "short" }) : "";
  return [size, vis, date].filter(Boolean).join(" · ");
}

export default function Dashboard() {
  const { theme, toggle } = useTheme();
  const { profile, signOut } = useAuth();
  const dark = theme === "dark";

  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  useEffect(() => {
    async function fetchMyTournaments() {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setMyTournaments(data ?? []);
      setLoadingTournaments(false);
    }
    fetchMyTournaments();
  }, []);

  const v = {
    appBg: dark ? "#111827" : "#ffffff",
    navBorder: dark ? "#1f2937" : "#f1f5f9",
    logoColor: dark ? "#f9fafb" : "#0f172a",
    toggleBg: dark ? "#374151" : "#0f172a",
    toggleKnob: dark ? "#f9fafb" : "#ffffff",
    toggleStroke: dark ? "#111827" : "#0f172a",
    avatarBg: dark ? "#1f2937" : "#f1f5f9",
    avatarColor: dark ? "#9ca3af" : "#0f172a",
    avatarBorder: dark ? "#374151" : "#e2e8f0",
    heroBg: dark ? "#f9fafb" : "#0f172a",
    heroBorder: dark ? "#f1f5f9" : "rgba(255,255,255,0.08)",
    heroTitle: dark ? "#0f172a" : "#ffffff",
    heroSub: dark ? "#94a3b8" : "rgba(255,255,255,0.4)",
    heroNumVal: dark ? "#0f172a" : "#ffffff",
    heroNumLbl: dark ? "#94a3b8" : "rgba(255,255,255,0.35)",
    cardBg: dark ? "#1f2937" : "#f8fafc",
    itemBg: dark ? "#111827" : "#f1f5f9",
    border: dark ? "#111827" : "#e8edf3",
    textPrimary: dark ? "#f9fafb" : "#0f172a",
    textSecondary: dark ? "#e5e7eb" : "#1e293b",
    textMuted: dark ? "#4b5563" : "#94a3b8",
    textDim: dark ? "#6b7280" : "#94a3b8",
    progressBg: dark ? "#1f2937" : "#e2e8f0",
    resultScore: dark ? "#f9fafb" : "#0f172a",
  };

  return (
    <div style={{ minHeight: "100vh", background: v.appBg, transition: "background 0.2s", paddingBottom: "80px" }}>

      {/* Nav */}
      <div style={{ background: v.appBg, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${v.navBorder}`, transition: "all 0.2s" }}>
        <span style={{ color: v.logoColor, fontSize: "15px", fontWeight: 900, letterSpacing: "-0.4px" }}>KickOff</span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={toggle} style={{ width: "36px", height: "20px", background: v.toggleBg, borderRadius: "10px", display: "flex", alignItems: "center", padding: "2px", cursor: "pointer", border: "none", transition: "background 0.2s" }}>
            <div style={{ width: "16px", height: "16px", background: v.toggleKnob, borderRadius: "50%", marginLeft: dark ? "auto" : "0", display: "flex", alignItems: "center", justifyContent: "center", transition: "margin 0.2s" }}>
              {dark ? (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={v.toggleStroke} strokeWidth="2.5">
                  <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              ) : (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={v.toggleStroke} strokeWidth="2.5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </div>
          </button>
          <button onClick={signOut} title="Déconnexion"
            style={{ width: "28px", height: "28px", background: v.avatarBg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: v.avatarColor, fontSize: "10px", fontWeight: 700, border: `1px solid ${v.avatarBorder}`, cursor: "pointer" }}>
            {initials(profile?.username)}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: v.heroBg, margin: "12px", borderRadius: "14px", padding: "16px", transition: "background 0.2s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px" }}>
          <div style={{ width: "6px", height: "6px", background: "#dc2626", borderRadius: "50%" }} />
          <span style={{ fontSize: "9px", fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "1px" }}>Live</span>
        </div>
        <div style={{ fontSize: "19px", fontWeight: 900, color: v.heroTitle, letterSpacing: "-0.6px", lineHeight: 1.05, marginBottom: "2px" }}>FC Bruxelles Cup</div>
        <div style={{ fontSize: "10px", color: v.heroSub, marginBottom: "13px" }}>5v5 · Poules + Élimination · 8 équipes</div>
        <div style={{ display: "flex", borderTop: `1px solid ${v.heroBorder}`, paddingTop: "10px" }}>
          {[{ val: "8", lbl: "Équipes" }, { val: "42", lbl: "Joueurs" }, { val: "9", lbl: "Joués" }, { val: "3", lbl: "Restants" }].map((n, i, arr) => (
            <div key={n.lbl} style={{ flex: 1, textAlign: "center", borderRight: i < arr.length - 1 ? `1px solid ${v.heroBorder}` : "none" }}>
              <div style={{ fontSize: "17px", fontWeight: 900, color: v.heroNumVal, letterSpacing: "-0.5px" }}>{n.val}</div>
              <div style={{ fontSize: "7px", color: v.heroNumLbl, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "2px" }}>{n.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding: "10px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: v.textMuted, fontWeight: 500, marginBottom: "4px" }}>
          <span>Progression</span><span>75%</span>
        </div>
        <div style={{ height: "4px", background: v.progressBg, borderRadius: "2px" }}>
          <div style={{ height: "4px", background: "#e5e7eb", borderRadius: "2px", width: "75%" }} />
        </div>
      </div>

      {/* Classement */}
      <div style={{ padding: "12px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color: v.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Classement · Groupe A</span>
        <span style={{ fontSize: "9px", fontWeight: 600, color: v.textDim }}>Voir tout</span>
      </div>
      <div style={{ margin: "0 12px", background: v.cardBg, borderRadius: "10px", overflow: "hidden" }}>
        {ranking.map((r, i) => (
          <div key={r.name} style={{ display: "flex", alignItems: "center", padding: "7px 13px", gap: "8px", borderBottom: i < ranking.length - 1 ? `1px solid ${v.itemBg}` : "none", opacity: r.dim ? 0.4 : 1 }}>
            <div style={{ width: "14px", fontSize: "10px", fontWeight: 800, color: r.top ? v.textPrimary : v.textMuted }}>{r.pos}</div>
            <div style={{ flex: 1, fontSize: "11px", fontWeight: 600, color: v.textSecondary }}>{r.name}</div>
            <div style={{ display: "flex", gap: "2px" }}>
              {r.forme.map((f, j) => <div key={j} style={{ width: "7px", height: "7px", borderRadius: "50%", background: fDot(f) }} />)}
            </div>
            <div style={{ fontSize: "12px", fontWeight: 900, color: v.textPrimary }}>{r.pts}</div>
          </div>
        ))}
      </div>

      {/* Dernier résultat */}
      <div style={{ padding: "12px 16px 6px" }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color: v.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Dernier résultat</span>
      </div>
      <div style={{ margin: "0 12px 4px", background: v.cardBg, borderRadius: "10px", padding: "12px 13px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: v.textSecondary, flex: 1 }}>Real Ixelles</span>
          <span style={{ fontSize: "20px", fontWeight: 900, color: v.resultScore, letterSpacing: "-1px", padding: "0 8px" }}>2 – 4</span>
          <span style={{ fontSize: "11px", fontWeight: 700, color: v.textSecondary, flex: 1, textAlign: "right" }}>Les Diables</span>
        </div>
        <div style={{ fontSize: "9px", color: v.textMuted, display: "flex", justifyContent: "space-between" }}>
          <span>Terrain 2 · Aujourd&apos;hui 13h00</span>
          <span style={{ color: "#60a5fa", fontWeight: 600 }}>Détails</span>
        </div>
      </div>

      {/* Top buteurs */}
      <div style={{ padding: "12px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color: v.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Top buteurs</span>
        <span style={{ fontSize: "9px", fontWeight: 600, color: v.textDim }}>Voir tout</span>
      </div>
      <div style={{ margin: "0 12px", background: v.cardBg, borderRadius: "10px", overflow: "hidden" }}>
        {scorers.map((s, i) => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", padding: "8px 13px", gap: "8px", borderBottom: i < scorers.length - 1 ? `1px solid ${v.itemBg}` : "none" }}>
            <div style={{ width: "16px", fontSize: "10px", fontWeight: 800, color: s.rankColor }}>{s.rank}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: v.textSecondary }}>{s.name}</div>
              <div style={{ fontSize: "9px", color: v.textMuted }}>{s.team}</div>
            </div>
            <div style={{ fontSize: "14px", fontWeight: 900, color: v.textPrimary }}>{s.goals}</div>
          </div>
        ))}
      </div>

      {/* Mes tournois */}
      <div style={{ padding: "12px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color: v.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Mes tournois</span>
        <Link href="/create" style={{ fontSize: "9px", fontWeight: 700, color: "#4ade80", textDecoration: "none" }}>+ Créer</Link>
      </div>

      {loadingTournaments ? (
        <div style={{ margin: "0 12px", background: v.cardBg, borderRadius: "10px", padding: "16px", textAlign: "center" }}>
          <span style={{ fontSize: "10px", color: v.textMuted }}>Chargement...</span>
        </div>
      ) : myTournaments.length === 0 ? (
        <div style={{ margin: "0 12px", background: v.cardBg, borderRadius: "10px", padding: "16px", textAlign: "center" }}>
          <p style={{ fontSize: "11px", color: v.textMuted, marginBottom: "8px" }}>Aucun tournoi pour l&apos;instant.</p>
          <Link href="/create" style={{ fontSize: "11px", fontWeight: 700, color: "#4ade80", textDecoration: "none" }}>Créer mon premier tournoi →</Link>
        </div>
      ) : (
        myTournaments.map((t, i) => {
          const badge = statusBadge(t.status);
          return (
            <Link key={t.id} href={`/tournament?id=${t.id}`} style={{ textDecoration: "none" }}>
              <div style={{ margin: i === 0 ? "0 12px 3px" : "0 12px 3px", background: v.cardBg, borderRadius: "8px", padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: v.textSecondary }}>{t.name}</div>
                  <div style={{ fontSize: "9px", color: v.textMuted, marginTop: "1px" }}>{formatMeta(t)}</div>
                </div>
                <span style={{ fontSize: "8px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", background: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
              </div>
            </Link>
          );
        })
      )}

      {/* Activité récente */}
      <div style={{ padding: "12px 16px 6px" }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color: v.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Activité récente</span>
      </div>
      <div style={{ margin: "0 12px", background: v.cardBg, borderRadius: "10px", overflow: "hidden" }}>
        {activity.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", padding: "9px 13px", gap: "9px", borderBottom: i < activity.length - 1 ? `1px solid ${v.itemBg}` : "none" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: a.color, flexShrink: 0, marginTop: "3px" }} />
            <div style={{ fontSize: "11px", color: dark ? "#d1d5db" : "#374151", flex: 1, lineHeight: 1.35 }}>{a.text}</div>
            <span style={{ fontSize: "9px", color: v.textMuted, flexShrink: 0 }}>{a.time}</span>
          </div>
        ))}
      </div>

      <PillNav active="home" />
    </div>
  );
}
