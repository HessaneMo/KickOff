# Fiche Joueur Convoqué — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un onglet "Convo." dans TournamentPage affichant en accordion les joueurs convoqués (tous les membres de l'équipe) pour le prochain match, avec leurs stats du tournoi.

**Architecture:** Nouveau composant `ConvocationTab` auto-contenu qui fetch ses propres données (équipe du user, prochain match, membres, stats goals). TournamentPage ajoute l'onglet conditionnellement si le user est membre ou organisateur.

**Tech Stack:** Next.js App Router, Supabase (`@supabase/ssr`), TypeScript, inline styles (pattern existant)

---

## File Map

| Action | Fichier | Responsabilité |
|--------|---------|----------------|
| Create | `src/components/ConvocationTab.tsx` | Tout le contenu de l'onglet Convo. |
| Modify | `src/components/TournamentPage.tsx` | Ajouter Tab type + onglet conditionnel + render |

---

## Task 1 : ConvocationTab — structure + data fetching

**Files:**
- Create: `src/components/ConvocationTab.tsx`

- [ ] **Step 1: Créer le fichier avec types + imports**

```tsx
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

export default function ConvocationTab({ tournamentId, userId, isOrganizer }: ConvocationTabProps) {
  const [loading, setLoading] = useState(true);
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [statsMap, setStatsMap] = useState<Map<string, PlayerStats>>(new Map());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  // For organizer: show both teams
  const [awayMembers, setAwayMembers] = useState<MemberWithProfile[]>([]);
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, userId]);

  async function load() {
    setLoading(true);

    // 1. Find user's team (or null if organizer without team)
    const { data: myMember } = await supabase
      .from("tournament_members")
      .select("team_id")
      .eq("tournament_id", tournamentId)
      .eq("user_id", userId)
      .maybeSingle();

    const teamId = myMember?.team_id ?? null;
    setMyTeamId(teamId);

    // 2. Find next scheduled match for this team (or first if organizer)
    let matchQuery = supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .neq("status", "finished")
      .order("scheduled_at", { ascending: true, nullsFirst: true })
      .limit(1);

    if (teamId) {
      // Player: only matches involving their team
      // Supabase doesn't support OR directly in .eq, use filter
      const { data: allMatches } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .neq("status", "finished")
        .order("scheduled_at", { ascending: true, nullsFirst: true });

      const match = (allMatches ?? []).find(
        m => m.home_team_id === teamId || m.away_team_id === teamId
      ) ?? null;
      setNextMatch(match);

      if (match) {
        await loadMembersAndStats(match, teamId);
      }
    } else if (isOrganizer) {
      // Organizer: first upcoming match overall
      const { data: m } = await matchQuery.single().then(r => r).catch(() => ({ data: null }));
      const match = m ?? null;
      setNextMatch(match);
      if (match) {
        await loadMembersAndStats(match, null);
      }
    }

    setLoading(false);
  }

  async function loadMembersAndStats(match: Match, playerTeamId: string | null) {
    const homeId = match.home_team_id;
    const awayId = match.away_team_id;

    // Team names
    const [{ data: homeTeam }, { data: awayTeam }] = await Promise.all([
      supabase.from("teams").select("name").eq("id", homeId).single(),
      supabase.from("teams").select("name").eq("id", awayId).single(),
    ]);
    setHomeTeamName(homeTeam?.name ?? "");
    setAwayTeamName(awayTeam?.name ?? "");

    // Members of each team
    const [{ data: homeM }, { data: awayM }] = await Promise.all([
      supabase.from("tournament_members").select("*, profiles(username)").eq("team_id", homeId),
      supabase.from("tournament_members").select("*, profiles(username)").eq("team_id", awayId),
    ]);

    const homeMems = (homeM as MemberWithProfile[]) ?? [];
    const awayMems = (awayM as MemberWithProfile[]) ?? [];

    if (isOrganizer && !playerTeamId) {
      // Organizer sees both
      setMembers(homeMems);
      setAwayMembers(awayMems);
    } else {
      // Player sees only their team
      const iAmHome = playerTeamId === homeId;
      setMembers(iAmHome ? homeMems : awayMems);
      setAwayMembers([]);
    }

    // Stats: goals & assists per player_id in this tournament
    const allMemberIds = [...homeMems, ...awayMems].map(m => m.user_id);

    // Get all finished match ids for this tournament
    const { data: finishedMatches } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id")
      .eq("tournament_id", tournamentId)
      .eq("status", "finished");

    const finishedIds = (finishedMatches ?? []).map(m => m.id);

    // Goals for all players
    const { data: goals } = finishedIds.length > 0
      ? await supabase.from("goals").select("player_id, is_assist").in("match_id", finishedIds)
      : { data: [] };

    // Build stats map
    const map = new Map<string, PlayerStats>();
    for (const uid of allMemberIds) {
      const matchesPlayed = (finishedMatches ?? []).filter(
        m => m.home_team_id === playerTeamId || m.away_team_id === playerTeamId
      ).length;
      const playerGoals = (goals ?? []).filter(g => g.player_id === uid && !g.is_assist).length;
      const playerAssists = (goals ?? []).filter(g => g.player_id === uid && g.is_assist).length;
      map.set(uid, { userId: uid, matchesPlayed, goals: playerGoals, assists: playerAssists });
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
      {/* Match header */}
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

      {/* Player list (home team) */}
      <MemberList
        label={isOrganizer ? homeTeamName : "Convoqués"}
        members={members}
        statsMap={statsMap}
        expanded={expanded}
        onToggle={setExpanded}
      />

      {/* Away team (organizer only) */}
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
```

- [ ] **Step 2: Ajouter le composant MemberList (dans le même fichier)**

Coller après `export default function ConvocationTab` (en dessous, avant la fermeture du fichier — ou mieux, avant la fonction principale) :

```tsx
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
              {/* Row header */}
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
                  <span style={{ fontSize: "12px", color: "#4b5563", transition: "transform 0.15s", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                </div>
              </div>

              {/* Expanded stats */}
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
```

- [ ] **Step 3: Vérifier que le fichier compile (pas encore intégré)**

```bash
cd C:/Users/moham/tournament-saas/kickoff
npx tsc --noEmit
```

Attendu : aucune erreur TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConvocationTab.tsx
git commit -m "feat: ConvocationTab component with accordion and stats"
```

---

## Task 2 : TournamentPage — intégration onglet Convo.

**Files:**
- Modify: `src/components/TournamentPage.tsx`

- [ ] **Step 1: Ajouter l'import ConvocationTab + modifier le type Tab**

Ligne 1 du fichier, ajouter l'import après les imports existants :

```tsx
import ConvocationTab from "@/components/ConvocationTab";
```

Ligne 20, modifier le type Tab :

```tsx
// Avant
type Tab = "Classement" | "Matchs" | "Équipes" | "Invitation";

// Après
type Tab = "Classement" | "Matchs" | "Équipes" | "Invitation" | "Convo.";
```

- [ ] **Step 2: Ajouter l'état `isMember` pour visibilité onglet**

Dans le `useEffect` de `load()` (autour de ligne 100), ajouter le fetch du membre :

```tsx
// Ajouter cet état avec les autres useState (après ligne ~96)
const [isMember, setIsMember] = useState(false);
```

Dans la fonction `load()`, ajouter la vérification membre :

```tsx
// Ajouter dans Promise.all existant, après { data: gt }
const { data: myMembership } = await supabase
  .from("tournament_members")
  .select("id")
  .eq("tournament_id", id!)
  .eq("user_id", user?.id ?? "")
  .maybeSingle();
setIsMember(!!myMembership);
```

> Note : faire ce fetch séparément après le Promise.all existant (pas dans le même) pour ne pas bloquer si `user` est undefined.

Alternative plus simple — ajouter après `setLoading(false)` :

```tsx
if (user) {
  const { data: mem } = await supabase
    .from("tournament_members")
    .select("id")
    .eq("tournament_id", id!)
    .eq("user_id", user.id)
    .maybeSingle();
  setIsMember(!!mem);
}
```

- [ ] **Step 3: Rendre le tab array dynamique**

Remplacer ligne ~285 :

```tsx
// Avant
{(["Classement", "Matchs", "Équipes", "Invitation"] as Tab[]).map(t => (

// Après
{(["Classement", "Matchs", "Équipes", "Invitation", ...(isMember || isOrganizer ? ["Convo."] : [])] as Tab[]).map(t => (
```

- [ ] **Step 4: Ajouter le render de l'onglet Convo.**

Après le bloc `{/* Invitation */}` (vers ligne 442), ajouter :

```tsx
{/* Convo. */}
{tab === "Convo." && user && (
  <ConvocationTab
    tournamentId={tournament.id}
    userId={user.id}
    isOrganizer={isOrganizer}
  />
)}
```

- [ ] **Step 5: Vérifier TypeScript**

```bash
cd C:/Users/moham/tournament-saas/kickoff
npx tsc --noEmit
```

Attendu : aucune erreur.

- [ ] **Step 6: Tester dans le browser**

```bash
cd C:/Users/moham/tournament-saas/kickoff
npm run dev
```

Scénarios à vérifier :
1. Connecté en tant que **joueur avec équipe** → onglet "Convo." visible → tab shows prochain match + liste joueurs de son équipe
2. Connecté en tant qu'**organisateur** → onglet visible → voit les 2 équipes
3. Tap sur un joueur → accordion s'ouvre → stats affichées (Matchs / Buts / Assists)
4. Tap à nouveau → accordion se ferme
5. Seul 1 accordion ouvert à la fois
6. Joueur **sans équipe** → onglet "Convo." absent

- [ ] **Step 7: Commit**

```bash
git add src/components/TournamentPage.tsx
git commit -m "feat: ajouter onglet Convo. dans TournamentPage"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Onglet "Convo." dans TournamentPage
- ✅ Visible seulement joueur/organisateur
- ✅ Convocation automatique (tous membres équipe)
- ✅ Accordion inline (Design C)
- ✅ Stats : Matchs / Buts / Assists (pas de Win%)
- ✅ Organisateur voit les 2 équipes
- ✅ 0 migration DB

**Placeholder scan:** aucun TBD/TODO dans le plan.

**Type consistency:**
- `MemberWithProfile` défini Task 1 Step 1, utilisé dans `MemberList` Task 1 Step 2 ✅
- `PlayerStats` défini Task 1 Step 1, utilisé dans `MemberList` Step 2 ✅
- `ConvocationTabProps` défini Task 1 Step 1, passé depuis TournamentPage Task 2 Step 4 ✅
- `initials()` défini Task 1 Step 1, utilisé dans `MemberList` Step 2 ✅
- `POS_LABEL` défini Task 1 Step 1, utilisé dans `MemberList` Step 2 ✅
