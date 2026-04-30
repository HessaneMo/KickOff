"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Match, TournamentMember } from "@/lib/database.types";

const POS_LABEL: Record<string, string> = {
  goalkeeper: "Gardien",
  defender: "Défenseur",
  defensive_mid: "Mil. défensif",
  midfielder: "Milieu",
  winger: "Ailier",
  striker: "Attaquant",
};

interface MemberWithProfile extends TournamentMember {
  profiles: { username: string | null } | null;
}

interface PlayerStats {
  userId: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
}

interface ConvocationTabProps {
  tournamentId: string;
  userId: string;
  isOrganizer: boolean;
}

function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function MemberList({
  label,
  members,
  statsMap,
  expanded,
  onToggle,
}: {
  label: string;
  members: MemberWithProfile[];
  statsMap: Map<string, PlayerStats>;
  expanded: string | null;
  onToggle: (id: string | null) => void;
}) {
  if (members.length === 0) return null;

  return (
    <div>
      <p style={{ fontSize: "9px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
        {label} · {members.length}
      </p>
      <div style={{ background: "#1f2937", borderRadius: "12px", overflow: "hidden" }}>
        {members.map((m, i) => {
          const isOpen = expanded === m.id;
          const stats = statsMap.get(m.user_id);
          const name = m.profiles?.username ?? "Joueur";
          const pos = m.position ? POS_LABEL[m.position] ?? m.position : "—";

          return (
            <div key={m.id} style={{ borderBottom: i < members.length - 1 ? "1px solid #111827" : "none" }}>
              <div
                onClick={() => onToggle(isOpen ? null : m.id)}
                style={{ display: "flex", alignItems: "center", padding: "9px 13px", gap: "10px", cursor: "pointer" }}
              >
                <div style={{ width: "30px", height: "30px", background: "#374151", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: "#9ca3af", flexShrink: 0 }}>
                  {initials(name)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#f1f5f9" }}>{name}</p>
                  <p style={{ fontSize: "9px", color: "#4b5563", marginTop: "1px" }}>{pos}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{
                    fontSize: "8px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px",
                    background: m.status === "starter" ? "#14532d" : "#292524",
                    color: m.status === "starter" ? "#4ade80" : "#78716c",
                  }}>
                    {m.status === "starter" ? "Tit." : "Rem."}
                  </span>
                  <span style={{ fontSize: "12px", color: "#4b5563", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>›</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: "0 13px 12px", borderTop: "1px solid #374151" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginTop: "10px" }}>
                    {[
                      { val: String(stats?.matchesPlayed ?? 0), lbl: "Matchs", color: "#f9fafb" },
                      { val: String(stats?.goals ?? 0), lbl: "Buts", color: "#4ade80" },
                      { val: String(stats?.assists ?? 0), lbl: "Assists", color: "#60a5fa" },
                    ].map(s => (
                      <div key={s.lbl} style={{ background: "#111827", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
                        <p style={{ fontSize: "16px", fontWeight: 900, color: s.color }}>{s.val}</p>
                        <p style={{ fontSize: "7px", color: "#4b5563", textTransform: "uppercase", marginTop: "2px" }}>{s.lbl}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ConvocationTab({ tournamentId, userId, isOrganizer }: ConvocationTabProps) {
  const [loading, setLoading] = useState(true);
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [awayMembers, setAwayMembers] = useState<MemberWithProfile[]>([]);
  const [statsMap, setStatsMap] = useState<Map<string, PlayerStats>>(new Map());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, userId]);

  async function load() {
    setLoading(true);

    const { data: myMember } = await supabase
      .from("tournament_members")
      .select("team_id")
      .eq("tournament_id", tournamentId)
      .eq("user_id", userId)
      .maybeSingle();

    const teamId = myMember?.team_id ?? null;

    const { data: allMatches } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .neq("status", "finished")
      .order("scheduled_at", { ascending: true, nullsFirst: true });

    let match: Match | null = null;
    if (teamId) {
      match = (allMatches ?? []).find(m => m.home_team_id === teamId || m.away_team_id === teamId) ?? null;
    } else if (isOrganizer) {
      match = (allMatches ?? [])[0] ?? null;
    }

    setNextMatch(match);
    if (match) await loadMembersAndStats(match, teamId);
    setLoading(false);
  }

  async function loadMembersAndStats(match: Match, playerTeamId: string | null) {
    const homeId = match.home_team_id;
    const awayId = match.away_team_id;

    const [{ data: homeTeam }, { data: awayTeam }, { data: homeM }, { data: awayM }, { data: finishedMatches }] = await Promise.all([
      supabase.from("teams").select("name").eq("id", homeId).single(),
      supabase.from("teams").select("name").eq("id", awayId).single(),
      supabase.from("tournament_members").select("*, profiles(username)").eq("team_id", homeId),
      supabase.from("tournament_members").select("*, profiles(username)").eq("team_id", awayId),
      supabase.from("matches").select("id, home_team_id, away_team_id").eq("tournament_id", tournamentId).eq("status", "finished"),
    ]);

    setHomeTeamName(homeTeam?.name ?? "");
    setAwayTeamName(awayTeam?.name ?? "");

    const homeMems = (homeM as MemberWithProfile[]) ?? [];
    const awayMems = (awayM as MemberWithProfile[]) ?? [];

    if (isOrganizer && !playerTeamId) {
      setMembers(homeMems);
      setAwayMembers(awayMems);
    } else {
      setMembers(playerTeamId === homeId ? homeMems : awayMems);
      setAwayMembers([]);
    }

    const finishedIds = (finishedMatches ?? []).map(m => m.id);
    const { data: goals } = finishedIds.length > 0
      ? await supabase.from("goals").select("player_id, is_assist").in("match_id", finishedIds)
      : { data: [] };

    const map = new Map<string, PlayerStats>();
    for (const mem of [...homeMems, ...awayMems]) {
      const uid = mem.user_id;
      const teamOfMem = homeMems.includes(mem) ? homeId : awayId;
      const matchesPlayed = (finishedMatches ?? []).filter(
        m => m.home_team_id === teamOfMem || m.away_team_id === teamOfMem
      ).length;
      map.set(uid, {
        userId: uid,
        matchesPlayed,
        goals: (goals ?? []).filter(g => g.player_id === uid && !g.is_assist).length,
        assists: (goals ?? []).filter(g => g.player_id === uid && g.is_assist).length,
      });
    }
    setStatsMap(map);
  }

  if (loading) {
    return <div style={{ padding: "24px", textAlign: "center" }}><p style={{ fontSize: "11px", color: "#4b5563" }}>Chargement...</p></div>;
  }

  if (!nextMatch) {
    return (
      <div style={{ margin: "12px", background: "#1f2937", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "#4b5563" }}>Aucun match programmé</p>
        <p style={{ fontSize: "11px", color: "#374151", marginTop: "4px" }}>La convocation apparaîtra ici avant chaque match.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ background: "#1f2937", borderRadius: "12px", padding: "14px" }}>
        <p style={{ fontSize: "8px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Prochain match</p>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#f9fafb", flex: 1 }}>{homeTeamName}</span>
          <span style={{ fontSize: "10px", fontWeight: 900, color: "#374151" }}>vs</span>
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#f9fafb", flex: 1, textAlign: "right" }}>{awayTeamName}</span>
        </div>
        {nextMatch.scheduled_at && (
          <p style={{ fontSize: "9px", color: "#4b5563", marginTop: "4px" }}>
            {new Date(nextMatch.scheduled_at).toLocaleString("fr-BE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      <MemberList
        label={isOrganizer ? homeTeamName : "Convoqués"}
        members={members}
        statsMap={statsMap}
        expanded={expanded}
        onToggle={setExpanded}
      />

      {isOrganizer && awayMembers.length > 0 && (
        <MemberList
          label={awayTeamName}
          members={awayMembers}
          statsMap={statsMap}
          expanded={expanded}
          onToggle={setExpanded}
        />
      )}
    </div>
  );
}
