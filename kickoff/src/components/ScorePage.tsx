"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Match, Team } from "@/lib/database.types";

export default function ScorePage() {
  const params = useSearchParams();
  const matchId = params.get("match");
  const { user } = useAuth();
  const router = useRouter();

  const [match, setMatch] = useState<Match | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEncode, setCanEncode] = useState(false);

  useEffect(() => {
    if (!matchId || !user) return;
    async function load() {
      const { data: m } = await supabase.from("matches").select("*").eq("id", matchId!).single();
      if (!m) { setLoading(false); return; }
      setMatch(m);
      if (m.home_score !== null) setHomeScore(m.home_score);
      if (m.away_score !== null) setAwayScore(m.away_score);

      const [{ data: home }, { data: away }, { data: member }] = await Promise.all([
        supabase.from("teams").select("*").eq("id", m.home_team_id).single(),
        supabase.from("teams").select("*").eq("id", m.away_team_id).single(),
        supabase.from("tournament_members").select("role").eq("tournament_id", m.tournament_id).eq("user_id", user!.id).in("role", ["organizer", "co_organizer", "encoder"]).limit(1),
      ]);
      setHomeTeam(home);
      setAwayTeam(away);
      setCanEncode(!!member && member.length > 0);
      setLoading(false);
    }
    load();
  }, [matchId, user]);

  async function handleSave() {
    if (!match || !canEncode) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("matches").update({
      home_score: homeScore,
      away_score: awayScore,
      status: "finished",
      played_at: new Date().toISOString(),
      encoded_by: user!.id,
    }).eq("id", match.id);
    if (err) { setError(err.message); setSaving(false); return; }
    router.push(`/tournament?id=${match.tournament_id}`);
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "#111827" }} />;
  if (!match || !homeTeam || !awayTeam) return (
    <div style={{ minHeight: "100vh", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#6b7280" }}>Match introuvable.</p>
    </div>
  );

  const finished = match.status === "finished";

  return (
    <div style={{ minHeight: "100vh", background: "#111827", display: "flex", flexDirection: "column" }}>

      <div style={{ background: "#111827", padding: "13px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #1f2937" }}>
        <Link href={`/tournament?id=${match.tournament_id}`} style={{ width: "30px", height: "30px", background: "#1f2937", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg>
        </Link>
        <span style={{ color: "#f9fafb", fontSize: "13px", fontWeight: 700, flex: 1 }}>Encoder le score</span>
        {finished && <span style={{ fontSize: "9px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px", background: "#374151", color: "#6b7280" }}>Terminé</span>}
      </div>

      <div style={{ flex: 1, padding: "24px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Scoreboard */}
        <div style={{ background: "#1f2937", borderRadius: "16px", padding: "28px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: "48px", height: "48px", background: "#111827", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, color: "#f9fafb", margin: "0 auto 8px" }}>
                {homeTeam.name.substring(0, 2).toUpperCase()}
              </div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#e5e7eb", lineHeight: 1.2 }}>{homeTeam.name}</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                {!finished && canEncode && (
                  <button onClick={() => setHomeScore(s => s + 1)} style={{ width: "36px", height: "36px", background: "#374151", borderRadius: "10px", border: "none", color: "#f9fafb", fontSize: "20px", cursor: "pointer" }}>+</button>
                )}
                <span style={{ fontSize: "52px", fontWeight: 900, color: "#f9fafb", lineHeight: 1, letterSpacing: "-2px", minWidth: "40px", textAlign: "center" }}>{homeScore}</span>
                {!finished && canEncode && (
                  <button onClick={() => setHomeScore(s => Math.max(0, s - 1))} style={{ width: "36px", height: "36px", background: "#374151", borderRadius: "10px", border: "none", color: "#9ca3af", fontSize: "20px", cursor: "pointer" }}>−</button>
                )}
              </div>

              <span style={{ fontSize: "28px", fontWeight: 900, color: "#374151", marginBottom: !finished && canEncode ? "0" : "0" }}>–</span>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                {!finished && canEncode && (
                  <button onClick={() => setAwayScore(s => s + 1)} style={{ width: "36px", height: "36px", background: "#374151", borderRadius: "10px", border: "none", color: "#f9fafb", fontSize: "20px", cursor: "pointer" }}>+</button>
                )}
                <span style={{ fontSize: "52px", fontWeight: 900, color: "#f9fafb", lineHeight: 1, letterSpacing: "-2px", minWidth: "40px", textAlign: "center" }}>{awayScore}</span>
                {!finished && canEncode && (
                  <button onClick={() => setAwayScore(s => Math.max(0, s - 1))} style={{ width: "36px", height: "36px", background: "#374151", borderRadius: "10px", border: "none", color: "#9ca3af", fontSize: "20px", cursor: "pointer" }}>−</button>
                )}
              </div>
            </div>

            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: "48px", height: "48px", background: "#111827", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, color: "#f9fafb", margin: "0 auto 8px" }}>
                {awayTeam.name.substring(0, 2).toUpperCase()}
              </div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#e5e7eb", lineHeight: 1.2 }}>{awayTeam.name}</p>
            </div>
          </div>
        </div>

        {/* Result indicator */}
        {homeScore !== awayScore && (
          <div style={{ background: homeScore > awayScore ? "#14532d" : "#450a0a", borderRadius: "10px", padding: "12px 14px", textAlign: "center" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: homeScore > awayScore ? "#4ade80" : "#f87171" }}>
              {homeScore > awayScore ? homeTeam.name : awayTeam.name} gagne
            </p>
          </div>
        )}
        {homeScore === awayScore && homeScore > 0 && (
          <div style={{ background: "#451a03", borderRadius: "10px", padding: "12px 14px", textAlign: "center" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#f59e0b" }}>Match nul</p>
          </div>
        )}

        {error && <p style={{ fontSize: "11px", color: "#f87171", textAlign: "center" }}>{error}</p>}

        {!finished && canEncode && (
          <button onClick={handleSave} disabled={saving}
            style={{ width: "100%", background: saving ? "#166534" : "#4ade80", color: "#111827", border: "none", borderRadius: "12px", padding: "16px", fontSize: "14px", fontWeight: 800, fontFamily: "inherit", cursor: saving ? "default" : "pointer" }}>
            {saving ? "Enregistrement..." : "Valider le score ✓"}
          </button>
        )}

        {finished && (
          <Link href={`/tournament?id=${match.tournament_id}`}
            style={{ display: "block", width: "100%", background: "#1f2937", color: "#9ca3af", border: "none", borderRadius: "12px", padding: "16px", fontSize: "13px", fontWeight: 700, fontFamily: "inherit", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
            Retour au tournoi
          </Link>
        )}

        {!canEncode && !finished && (
          <div style={{ background: "#1f2937", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
            <p style={{ fontSize: "11px", color: "#6b7280" }}>Seuls les encodeurs peuvent modifier ce score.</p>
          </div>
        )}
      </div>
    </div>
  );
}
