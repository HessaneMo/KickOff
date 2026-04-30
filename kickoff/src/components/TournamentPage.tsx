"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PillNav from "@/components/PillNav";
import ConvocationTab from "@/components/ConvocationTab";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Tournament, Team, Match } from "@/lib/database.types";

const FORMAT_LABEL: Record<string, string> = {
  groups: "Poules",
  knockout: "Élimination",
  groups_knockout: "Poules + Finale",
};

const GROUP_NAMES = ["A","B","C","D","E","F","G","H"];
const fDot = (f: string) => f === "w" ? "#22c55e" : f === "l" ? "#ef4444" : "#f59e0b";

type Tab = "Classement" | "Matchs" | "Équipes" | "Invitation" | "Convo.";

interface GroupWithTeams { id: string; name: string; teams: Team[] }

async function runDraw(tournamentId: string, teams: Team[], numGroups: number) {
  // Shuffle
  const shuffled = [...teams].sort(() => Math.random() - 0.5);

  // Create groups
  const groupInserts = GROUP_NAMES.slice(0, numGroups).map(n => ({ tournament_id: tournamentId, name: `Groupe ${n}` }));
  const { data: groups, error: gErr } = await supabase.from("groups").insert(groupInserts).select();
  if (gErr || !groups) throw new Error(gErr?.message);

  // Assign teams to groups (round-robin distribution)
  const groupTeamInserts = shuffled.map((t, i) => ({ group_id: groups[i % numGroups].id, team_id: t.id }));
  await supabase.from("group_teams").insert(groupTeamInserts);

  // Generate round-robin matches per group
  const matchInserts: { tournament_id: string; group_id: string; home_team_id: string; away_team_id: string; status: "scheduled" }[] = [];
  for (const group of groups) {
    const groupTeams = shuffled.filter((_, i) => i % numGroups === groups.indexOf(group));
    for (let a = 0; a < groupTeams.length; a++) {
      for (let b = a + 1; b < groupTeams.length; b++) {
        matchInserts.push({ tournament_id: tournamentId, group_id: group.id, home_team_id: groupTeams[a].id, away_team_id: groupTeams[b].id, status: "scheduled" });
      }
    }
  }
  if (matchInserts.length > 0) {
    const { error: mErr } = await supabase.from("matches").insert(matchInserts);
    if (mErr) throw new Error("matches: " + mErr.message);
  }

  // Set tournament ongoing
  await supabase.from("tournaments").update({ status: "ongoing" }).eq("id", tournamentId);
}

interface TeamWithStats extends Team {
  j: number; g: number; n: number; p: number; pts: number; forme: string[];
}

function computeStandings(teams: Team[], matches: Match[]): TeamWithStats[] {
  const map = new Map<string, TeamWithStats>();
  for (const t of teams) map.set(t.id, { ...t, j: 0, g: 0, n: 0, p: 0, pts: 0, forme: [] });

  for (const m of matches) {
    if (m.status !== "finished" || m.home_score === null || m.away_score === null) continue;
    const home = map.get(m.home_team_id);
    const away = map.get(m.away_team_id);
    if (!home || !away) continue;
    home.j++; away.j++;
    if (m.home_score > m.away_score) {
      home.g++; home.pts += 3; home.forme.push("w");
      away.p++; away.forme.push("l");
    } else if (m.home_score < m.away_score) {
      away.g++; away.pts += 3; away.forme.push("w");
      home.p++; home.forme.push("l");
    } else {
      home.n++; home.pts++; home.forme.push("d");
      away.n++; away.pts++; away.forme.push("d");
    }
  }
  return [...map.values()].sort((a, b) => b.pts - a.pts || b.g - a.g);
}

export default function TournamentPage() {
  const params = useSearchParams();
  const id = params.get("id");
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("Classement");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<GroupWithTeams[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drawModal, setDrawModal] = useState(false);
  const [numGroups, setNumGroups] = useState(1);
  const [drawLoading, setDrawLoading] = useState(false);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [{ data: t }, { data: tm }, { data: m }, { count }, { data: grps }, { data: gt }] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", id!).single(),
        supabase.from("teams").select("*").eq("tournament_id", id!),
        supabase.from("matches").select("*").eq("tournament_id", id!).order("scheduled_at", { nullsFirst: true }),
        supabase.from("tournament_members").select("*", { count: "exact", head: true }).eq("tournament_id", id!),
        supabase.from("groups").select("*").eq("tournament_id", id!).order("name"),
        supabase.from("group_teams").select("*"),
      ]);
      console.log("matches loaded:", m, "groups:", grps);
      setTournament(t);
      const allTeams = tm ?? [];
      setTeams(allTeams);
      setMatches(m ?? []);
      setMemberCount(count ?? 0);
      const groupList: GroupWithTeams[] = (grps ?? []).map(g => ({
        ...g,
        teams: allTeams.filter(t => (gt ?? []).some(r => r.group_id === g.id && r.team_id === t.id)),
      }));
      setGroups(groupList);
      setLoading(false);
      if (user) {
        const { data: mem } = await supabase
          .from("tournament_members")
          .select("id")
          .eq("tournament_id", id!)
          .eq("user_id", user.id)
          .maybeSingle();
        setIsMember(!!mem);
      }
    }
    load();

    const channel = supabase
      .channel(`matches-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `tournament_id=eq.${id}` },
        (payload) => {
          setMatches(prev => prev.map(m => m.id === payload.new.id ? payload.new as Match : m));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) return <div style={{ minHeight: "100vh", background: "#111827" }} />;
  if (!tournament) return (
    <div style={{ minHeight: "100vh", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#6b7280", fontSize: "13px" }}>Tournoi introuvable.</p>
    </div>
  );

  const isOrganizer = user?.id === tournament.organizer_id;
  const standings = computeStandings(teams, matches);
  const finished = matches.filter(m => m.status === "finished");
  const upcoming = matches.filter(m => m.status === "scheduled");
  const nextMatch = upcoming[0] ?? null;
  const lastMatch = finished[finished.length - 1] ?? null;
  const teamName = (tid: string) => teams.find(t => t.id === tid)?.name ?? "?";
  const canDraw = isOrganizer && tournament.status === "open" && teams.length >= 2 && groups.length === 0;

  async function handleDraw() {
    setDrawLoading(true);
    try {
      await runDraw(tournament!.id, teams, numGroups);
      setDrawModal(false);
      // Reload
      window.location.reload();
    } catch (e) {
      console.error("Draw error:", e);
      alert("Erreur tirage: " + (e as Error).message);
      setDrawLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#111827" }}>

      {/* Topbar */}
      <div style={{ background: "#111827", padding: "13px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #1f2937" }}>
        <Link href="/dashboard" style={{ width: "30px", height: "30px", background: "#1f2937", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg>
        </Link>
        <span style={{ color: "#f9fafb", fontSize: "13px", fontWeight: 700, flex: 1, letterSpacing: "-0.2px" }}>{tournament.name}</span>
        {isOrganizer && (
          <button onClick={() => setTab("Invitation")} style={{ width: "30px", height: "30px", background: "#1f2937", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        )}
      </div>

      {/* Hero */}
      <div style={{ background: "#f9fafb", margin: "12px", borderRadius: "14px", padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px" }}>
          <div style={{ width: "6px", height: "6px", background: tournament.status === "ongoing" ? "#dc2626" : "#4ade80", borderRadius: "50%" }} />
          <span style={{ fontSize: "9px", fontWeight: 700, color: tournament.status === "ongoing" ? "#dc2626" : "#16a34a", textTransform: "uppercase", letterSpacing: "1px" }}>
            {tournament.status === "ongoing" ? "Live" : tournament.status === "open" ? "Inscriptions ouvertes" : tournament.status === "finished" ? "Terminé" : "Brouillon"}
          </span>
        </div>
        <div style={{ fontSize: "19px", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.6px", marginBottom: "2px" }}>{tournament.name}</div>
        <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "13px" }}>
          {tournament.team_size}v{tournament.team_size} · {FORMAT_LABEL[tournament.format]} · {tournament.visibility === "public" ? "Public" : "Privé"}
        </div>
        <div style={{ display: "flex", borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
          {[
            { val: String(teams.length), lbl: "Équipes" },
            { val: String(memberCount), lbl: "Joueurs" },
            { val: String(finished.length), lbl: "Joués" },
            { val: String(upcoming.length), lbl: "Restants" },
          ].map((n, i, arr) => (
            <div key={n.lbl} style={{ flex: 1, textAlign: "center", borderRight: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ fontSize: "17px", fontWeight: 900, color: "#0f172a" }}>{n.val}</div>
              <div style={{ fontSize: "7px", color: "#94a3b8", textTransform: "uppercase", marginTop: "2px" }}>{n.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tirage banner — always visible to organizer before draw */}
      {isOrganizer && tournament.status === "open" && groups.length === 0 && (() => {
        const need = 2 - teams.length;
        const blocked = teams.length < 2;
        return (
          <div style={{ margin: "0 12px 4px", background: blocked ? "#1c1917" : "#1e3a5f", borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", border: `1px solid ${blocked ? "#292524" : "transparent"}` }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: blocked ? "#78716c" : "#93c5fd", marginBottom: "2px" }}>
                {blocked ? "Tirage au sort indisponible" : "Tirage au sort disponible"}
              </p>
              <p style={{ fontSize: "9px", color: blocked ? "#57534e" : "#3b82f6" }}>
                {blocked
                  ? `Ajoute encore ${need} equipe${need > 1 ? "s" : ""} pour pouvoir lancer`
                  : `${teams.length} equipes · pret a lancer`}
              </p>
            </div>
            {!blocked && (
              <button onClick={() => setDrawModal(true)} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "11px", fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                Lancer
              </button>
            )}
          </div>
        );
      })()}

      {/* Draw modal */}
      {drawModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "#1f2937", borderRadius: "20px 20px 0 0", padding: "24px 20px 32px", width: "100%", maxWidth: "480px" }}>
            <p style={{ fontSize: "16px", fontWeight: 900, color: "#f9fafb", marginBottom: "4px" }}>Tirage au sort</p>
            <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "20px" }}>{teams.length} équipes · distribution aléatoire</p>

            <p style={{ fontSize: "9px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Nombre de poules</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {[1, 2, 3, 4].filter(n => n <= Math.floor(teams.length / 2)).map(n => (
                <button key={n} onClick={() => setNumGroups(n)}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `2px solid ${numGroups === n ? "#3b82f6" : "#374151"}`, background: numGroups === n ? "#1e3a5f" : "#111827", color: numGroups === n ? "#93c5fd" : "#6b7280", fontSize: "14px", fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>
                  {n}
                  <p style={{ fontSize: "8px", marginTop: "2px", fontWeight: 500 }}>
                    {Math.ceil(teams.length / n)} éq.
                  </p>
                </button>
              ))}
            </div>

            {/* Preview */}
            <div style={{ background: "#111827", borderRadius: "8px", padding: "10px 12px", marginBottom: "16px" }}>
              <p style={{ fontSize: "9px", color: "#4b5563", marginBottom: "6px" }}>Aperçu (ordre aléatoire au lancement)</p>
              <div style={{ display: "flex", gap: "6px" }}>
                {GROUP_NAMES.slice(0, numGroups).map((g, i) => (
                  <div key={g} style={{ flex: 1, background: "#1f2937", borderRadius: "6px", padding: "6px 8px" }}>
                    <p style={{ fontSize: "9px", fontWeight: 700, color: "#4ade80", marginBottom: "4px" }}>Gr. {g}</p>
                    <p style={{ fontSize: "9px", color: "#6b7280" }}>{Math.ceil(teams.length / numGroups) - (i >= teams.length % numGroups && teams.length % numGroups !== 0 ? 1 : 0)} équipes</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setDrawModal(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "#374151", color: "#9ca3af", border: "none", fontSize: "13px", fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                Annuler
              </button>
              <button onClick={handleDraw} disabled={drawLoading}
                style={{ flex: 2, padding: "12px", borderRadius: "10px", background: drawLoading ? "#374151" : "#3b82f6", color: drawLoading ? "#4b5563" : "#fff", border: "none", fontSize: "13px", fontWeight: 700, fontFamily: "inherit", cursor: drawLoading ? "default" : "pointer" }}>
                {drawLoading ? "Tirage en cours..." : "Lancer le tirage"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1f2937" }}>
        {(["Classement", "Matchs", "Équipes", "Invitation", ...(isMember || isOrganizer ? ["Convo."] : [])] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "9px 4px", textAlign: "center", fontSize: "10px", fontWeight: 600, color: tab === t ? "#f9fafb" : "#4b5563", borderBottom: tab === t ? "2px solid #f9fafb" : "2px solid transparent", background: "none", cursor: "pointer", fontFamily: "inherit" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Classement */}
      {tab === "Classement" && (
        <>
          {tournament.status === "ongoing" && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 14px 0" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#dc2626", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: "8px", fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "1px" }}>Classement en direct</span>
            </div>
          )}
          {teams.length === 0 ? (
            <div style={{ margin: "12px", background: "#1f2937", borderRadius: "10px", padding: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "11px", color: "#4b5563" }}>Aucune équipe inscrite.</p>
            </div>
          ) : groups.length === 0 ? (
            // No draw yet — show flat standings
            <div style={{ margin: "12px", background: "#1f2937", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "6px 13px", gap: "8px", borderBottom: "1px solid #111827" }}>
                <div style={{ width: "14px" }} />
                <div style={{ flex: 1, fontSize: "8px", fontWeight: 700, color: "#374151", textTransform: "uppercase" }}>Équipe</div>
                {["J","G","P","Pts"].map(h => <div key={h} style={{ width: h === "Pts" ? "24px" : "20px", textAlign: "center", fontSize: "8px", fontWeight: 700, color: "#374151" }}>{h}</div>)}
                <div style={{ width: "32px" }} />
              </div>
              {standings.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", padding: "8px 13px", gap: "8px", borderBottom: i < standings.length - 1 ? "1px solid #111827" : "none" }}>
                  <div style={{ width: "14px", fontSize: "10px", fontWeight: 800, color: i < 2 ? "#f9fafb" : "#4b5563", textAlign: "center" }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: "11px", fontWeight: 600, color: "#e5e7eb" }}>{r.name}</div>
                  {[r.j, r.g, r.p].map((v, j) => <div key={j} style={{ width: "20px", textAlign: "center", fontSize: "10px", color: "#6b7280" }}>{v}</div>)}
                  <div style={{ width: "24px", textAlign: "center", fontSize: "12px", fontWeight: 900, color: "#f9fafb" }}>{r.pts}</div>
                  <div style={{ width: "32px", display: "flex", gap: "2px" }}>
                    {r.forme.slice(-3).map((f, j) => <div key={j} style={{ width: "7px", height: "7px", borderRadius: "50%", background: fDot(f) }} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Groups view
            groups.map(group => {
              const groupMatches = matches.filter(m => m.group_id === group.id);
              const groupStandings = computeStandings(group.teams, groupMatches);
              return (
                <div key={group.id} style={{ margin: "8px 12px 0" }}>
                  <p style={{ fontSize: "9px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", paddingLeft: "2px" }}>{group.name}</p>
                  <div style={{ background: "#1f2937", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", padding: "5px 13px", gap: "8px", borderBottom: "1px solid #111827" }}>
                      <div style={{ width: "14px" }} />
                      <div style={{ flex: 1, fontSize: "8px", fontWeight: 700, color: "#374151", textTransform: "uppercase" }}>Équipe</div>
                      {["J","G","P","Pts"].map(h => <div key={h} style={{ width: h === "Pts" ? "24px" : "20px", textAlign: "center", fontSize: "8px", fontWeight: 700, color: "#374151" }}>{h}</div>)}
                      <div style={{ width: "28px" }} />
                    </div>
                    {groupStandings.map((r, i) => (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", padding: "7px 13px", gap: "8px", borderBottom: i < groupStandings.length - 1 ? "1px solid #111827" : "none" }}>
                        <div style={{ width: "14px", fontSize: "10px", fontWeight: 800, color: i < 2 ? "#4ade80" : "#4b5563", textAlign: "center" }}>{i + 1}</div>
                        <div style={{ flex: 1, fontSize: "11px", fontWeight: 600, color: "#e5e7eb" }}>{r.name}</div>
                        {[r.j, r.g, r.p].map((v, j) => <div key={j} style={{ width: "20px", textAlign: "center", fontSize: "10px", color: "#6b7280" }}>{v}</div>)}
                        <div style={{ width: "24px", textAlign: "center", fontSize: "12px", fontWeight: 900, color: "#f9fafb" }}>{r.pts}</div>
                        <div style={{ width: "28px", display: "flex", gap: "2px" }}>
                          {r.forme.slice(-3).map((f, j) => <div key={j} style={{ width: "6px", height: "6px", borderRadius: "50%", background: fDot(f) }} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {nextMatch && (
            <>
              <div style={{ padding: "8px 16px 6px" }}><span style={{ fontSize: "9px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "1px" }}>Prochain match</span></div>
              <div style={{ margin: "0 12px 4px", background: "#1f2937", borderRadius: "10px", padding: "12px 14px", borderLeft: "3px solid #3b82f6" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}>{teamName(nextMatch.home_team_id)}</span>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#374151" }}>VS</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}>{teamName(nextMatch.away_team_id)}</span>
                </div>
                {nextMatch.scheduled_at && <div style={{ fontSize: "9px", color: "#4b5563" }}>{new Date(nextMatch.scheduled_at).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short" })}</div>}
              </div>
            </>
          )}

          {lastMatch && (
            <>
              <div style={{ padding: "8px 16px 6px" }}><span style={{ fontSize: "9px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "1px" }}>Dernier résultat</span></div>
              <div style={{ margin: "0 12px", background: "#1f2937", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#f1f5f9", flex: 1 }}>{teamName(lastMatch.home_team_id)}</span>
                  <span style={{ fontSize: "20px", fontWeight: 900, color: "#f9fafb", letterSpacing: "-1px", padding: "0 8px" }}>{lastMatch.home_score} – {lastMatch.away_score}</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#f1f5f9", flex: 1, textAlign: "right" }}>{teamName(lastMatch.away_team_id)}</span>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Matchs */}
      {tab === "Matchs" && (
        <div style={{ padding: "6px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {matches.length === 0 ? (
            <div style={{ background: "#1f2937", borderRadius: "10px", padding: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "11px", color: "#4b5563" }}>Aucun match programmé.</p>
            </div>
          ) : matches.map(m => (
            <div key={m.id} style={{ padding: "12px 14px", background: "#1f2937", borderRadius: "10px", borderLeft: `3px solid ${m.status === "finished" ? "#374151" : "#3b82f6"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#f1f5f9" }}>{teamName(m.home_team_id)}</span>
                {m.status === "finished"
                  ? <span style={{ fontSize: "18px", fontWeight: 900, color: "#f9fafb", letterSpacing: "-1px" }}>{m.home_score} – {m.away_score}</span>
                  : <span style={{ fontSize: "10px", fontWeight: 800, color: "#374151" }}>VS</span>}
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#f1f5f9" }}>{teamName(m.away_team_id)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "9px", color: "#4b5563" }}>
                  {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString("fr-BE", { dateStyle: "short", timeStyle: "short" }) : "—"}
                </span>
                {m.status !== "finished" && isOrganizer && (
                  <Link href={`/score?match=${m.id}`} style={{ fontSize: "8px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", background: "#14532d", color: "#4ade80", textDecoration: "none" }}>Encoder</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Équipes */}
      {tab === "Équipes" && (
        <>
          <div style={{ padding: "12px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "1px" }}>Équipes ({teams.length}/{tournament.max_teams})</span>
            {isOrganizer && <Link href={`/team?tournament=${id}`} style={{ fontSize: "9px", fontWeight: 700, color: "#4ade80", textDecoration: "none" }}>+ Créer une équipe</Link>}
          </div>
          {teams.length === 0 ? (
            <div style={{ margin: "0 12px", background: "#1f2937", borderRadius: "10px", padding: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "11px", color: "#4b5563", marginBottom: "10px" }}>Aucune équipe inscrite.</p>
              {isOrganizer && <Link href={`/team?tournament=${id}`} style={{ fontSize: "11px", fontWeight: 700, color: "#4ade80", textDecoration: "none" }}>Créer la première équipe →</Link>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", margin: "0 12px" }}>
              {teams.map(t => (
                <Link key={t.id} href={`/team?id=${t.id}`} style={{ background: "#1f2937", borderRadius: "10px", padding: "12px", textDecoration: "none" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px" }}>{t.name}</div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Invitation */}
      {tab === "Invitation" && (
        <div style={{ padding: "12px" }}>
          <div style={{ background: "#1f2937", borderRadius: "14px", padding: "20px", textAlign: "center" }}>
            <p style={{ fontSize: "9px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Code d&apos;invitation</p>
            <div style={{ background: "#111827", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
              <p style={{ fontSize: "28px", fontWeight: 900, color: "#4ade80", letterSpacing: "4px", fontFamily: "monospace" }}>{tournament.short_code}</p>
            </div>
            <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "16px" }}>Partage ce code pour rejoindre le tournoi</p>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join?code=${tournament.short_code}`)}
              style={{ width: "100%", background: "#4ade80", color: "#111827", border: "none", borderRadius: "10px", padding: "12px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
              Copier le lien d&apos;invitation
            </button>
          </div>
        </div>
      )}

      {/* Convo. */}
      {tab === "Convo." && user && (
        <ConvocationTab
          tournamentId={tournament.id}
          userId={user.id}
          isOrganizer={isOrganizer}
        />
      )}

      <PillNav active="home" />
    </div>
  );
}
