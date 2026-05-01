"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PillNav from "@/components/PillNav";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({ tournois: 0, matchs: 0, buts: 0 });
  const [position, setPosition] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user]);

  useEffect(() => {
    setNameInput(profile?.username ?? "");
  }, [profile]);

  async function fetchStats() {
    if (!user) return;

    const [membersRes, goalsRes] = await Promise.all([
      supabase
        .from("tournament_members")
        .select("id, team_id, position")
        .eq("user_id", user.id),
      supabase
        .from("goals")
        .select("id", { count: "exact" })
        .eq("player_id", user.id),
    ]);

    const members = membersRes.data ?? [];
    const tournoiCount = members.length;
    const butCount = goalsRes.count ?? 0;

    // Most recent non-null position
    const lastPos = members.filter(m => m.position).slice(-1)[0]?.position ?? null;
    setPosition(lastPos);

    const teamIds = members.map(m => m.team_id).filter(Boolean) as string[];
    let matchCount = 0;
    if (teamIds.length > 0) {
      const [homeRes, awayRes] = await Promise.all([
        supabase
          .from("matches")
          .select("id", { count: "exact" })
          .in("home_team_id", teamIds)
          .eq("status", "finished"),
        supabase
          .from("matches")
          .select("id", { count: "exact" })
          .in("away_team_id", teamIds)
          .eq("status", "finished"),
      ]);
      matchCount = (homeRes.count ?? 0) + (awayRes.count ?? 0);
    }

    setStats({ tournois: tournoiCount, matchs: matchCount, buts: butCount });
  }

  async function handleSaveName() {
    if (!user || !nameInput.trim()) return;
    setSaving(true);
    await supabase.from("profiles").update({ username: nameInput.trim() }).eq("id", user.id);
    setSavedName(nameInput.trim());
    setSaving(false);
    setEditing(false);
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  const displayName = savedName ?? profile?.username ?? user?.email?.split("@")[0] ?? "—";
  const displayEmail = user?.email ?? "";

  return (
    <div className="min-h-screen pb-28" style={{ background: "#0d1117" }}>

      {/* Edit username modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setEditing(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl p-5"
            style={{ background: "#1f2937" }}
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold mb-3" style={{ color: "#f9fafb", fontSize: "13px" }}>Modifier le nom</p>
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSaveName()}
              placeholder="Ton nom complet"
              className="w-full rounded-xl px-4 py-3 outline-none mb-3"
              style={{ background: "#374151", color: "#f9fafb", fontSize: "13px", border: "1px solid #4b5563" }}
            />
            <button
              onClick={handleSaveName}
              disabled={saving || !nameInput.trim()}
              className="pressable w-full rounded-xl py-3 font-bold"
              style={{ background: saving ? "#374151" : "#4ade80", color: "#111827", fontSize: "13px" }}
            >
              {saving ? "Sauvegarde…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3" style={{ borderBottom: "1px solid #1f2937", background: "#111827" }}>
        <span className="font-bold text-sm" style={{ color: "#f9fafb" }}>Mon profil</span>
        <button onClick={() => setEditing(true)} className="pressable rounded-lg p-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      {/* Hero */}
      <div className="flex items-center gap-4 px-4 py-5" style={{ background: "#1f2937" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold shrink-0"
          style={{ background: "#374151", color: "#f9fafb", fontSize: "18px" }}>
          {initials(displayName)}
        </div>
        <div>
          <p className="font-bold" style={{ color: "#f9fafb", fontSize: "16px" }}>{displayName}</p>
          <p style={{ color: "#4b5563", fontSize: "10px", marginTop: "2px" }}>{displayEmail}</p>
          {profile?.plan && profile.plan !== "free" && (
            <span className="inline-block font-bold rounded-full px-2 py-0.5 mt-1"
              style={{ background: profile.plan === "club" ? "#451a03" : "#1e3a5f", color: profile.plan === "club" ? "#d97706" : "#60a5fa", fontSize: "9px" }}>
              {profile.plan === "club" ? "Club" : "Pro"}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3" style={{ borderBottom: "1px solid #1f2937" }}>
        {[
          { val: stats.tournois, label: "Tournois" },
          { val: stats.matchs, label: "Matchs" },
          { val: stats.buts, label: "Buts" },
        ].map((s, i) => (
          <div key={s.label} className="py-4 text-center"
            style={{ borderRight: i < 2 ? "1px solid #1f2937" : "none" }}>
            <p className="font-bold" style={{ color: "#f9fafb", fontSize: "20px" }}>{s.val}</p>
            <p className="uppercase mt-0.5" style={{ color: "#4b5563", fontSize: "8px", letterSpacing: "0.5px" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Plan banner */}
      {profile?.plan === "free" ? (
        <div className="mx-3 mt-3 rounded-xl p-3 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #1e3a5f, #14532d)" }}>
          <div className="flex-1">
            <p className="font-bold" style={{ color: "#f9fafb", fontSize: "11px" }}>Passe à Pro</p>
            <p style={{ color: "#9ca3af", fontSize: "9px", marginTop: "2px" }}>Tournois illimités · Stats complètes · Notifs</p>
          </div>
          <Link href="/billing" className="font-bold rounded-lg px-3 py-2 shrink-0"
            style={{ background: "#4ade80", color: "#111827", fontSize: "10px", textDecoration: "none" }}>
            9€/mois
          </Link>
        </div>
      ) : (
        <div className="mx-3 mt-3 rounded-xl p-3 flex items-center gap-3"
          style={{ background: "#1f2937", border: `1px solid ${profile?.plan === "club" ? "#d97706" : "#60a5fa"}` }}>
          <div className="flex-1">
            <p className="font-bold" style={{ color: profile?.plan === "club" ? "#d97706" : "#60a5fa", fontSize: "11px" }}>
              Plan {profile?.plan === "pro" ? "Pro" : "Club"} actif
            </p>
            <p style={{ color: "#4b5563", fontSize: "9px", marginTop: "2px" }}>Toutes les fonctionnalités débloquées</p>
          </div>
          <Link href="/billing" className="font-bold rounded-lg px-3 py-2 shrink-0"
            style={{ background: "#374151", color: "#9ca3af", fontSize: "10px", textDecoration: "none" }}>
            Gérer
          </Link>
        </div>
      )}

      {/* Settings */}
      <div className="px-4 pt-4 pb-1">
        <p className="font-bold uppercase" style={{ color: "#4b5563", fontSize: "9px", letterSpacing: "1px" }}>Paramètres</p>
      </div>
      <div className="mx-3 rounded-xl overflow-hidden" style={{ background: "#1f2937" }}>

        {/* Mon poste */}
        <div className="pressable w-full flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid #111827" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#374151" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <span className="flex-1 font-semibold" style={{ color: "#f1f5f9", fontSize: "11px" }}>Mon poste</span>
          <span style={{ color: "#4b5563", fontSize: "10px" }}>{position ?? "Non défini"}</span>
        </div>

        {/* Notifications */}
        <div className="pressable w-full flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid #111827" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#374151" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <span className="flex-1 font-semibold" style={{ color: "#f1f5f9", fontSize: "11px" }}>Notifications</span>
          <span style={{ color: "#4b5563", fontSize: "10px" }}>Activées</span>
        </div>

        {/* Déconnexion */}
        <button onClick={handleSignOut} className="pressable w-full flex items-center gap-3 px-4 py-3 text-left">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#374151" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </div>
          <span className="flex-1 font-semibold" style={{ color: "#dc2626", fontSize: "11px" }}>Déconnexion</span>
        </button>

      </div>

      <PillNav active="profile" />
    </div>
  );
}
