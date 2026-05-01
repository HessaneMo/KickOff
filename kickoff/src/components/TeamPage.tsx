"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PillNav from "@/components/PillNav";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Team, TournamentMember, Tournament } from "@/lib/database.types";

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

function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ─── CREATE MODE ─── */
function CreateTeam({ tournamentId }: { tournamentId: string }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    supabase.from("tournaments").select("*").eq("id", tournamentId).single()
      .then(({ data }) => setTournament(data));
  }, [tournamentId]);

  async function handleCreate() {
    if (!name.trim() || !user) return;
    setLoading(true);
    setError(null);

    const { data: team, error: err } = await supabase
      .from("teams")
      .insert({ tournament_id: tournamentId, name: name.trim() })
      .select()
      .single();

    if (err || !team) { setError(err?.message ?? "Erreur."); setLoading(false); return; }

    router.push(`/tournament?id=${tournamentId}`);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#111827" }}>
      <div style={{ background: "#111827", padding: "13px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #1f2937" }}>
        <Link href={`/tournament?id=${tournamentId}`} style={{ width: "30px", height: "30px", background: "#1f2937", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg>
        </Link>
        <div>
          <span style={{ color: "#f9fafb", fontSize: "13px", fontWeight: 700 }}>Nouvelle équipe</span>
          {tournament && <p style={{ fontSize: "9px", color: "#4b5563", marginTop: "1px" }}>{tournament.name}</p>}
        </div>
      </div>

      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <p style={{ fontSize: "9px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Nom de l&apos;équipe <span style={{ color: "#dc2626" }}>*</span></p>
          <input
            type="text"
            placeholder="Ex: Les Diables Rouges"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            autoFocus
            style={{ width: "100%", background: "#1f2937", border: "2px solid #374151", borderRadius: "12px", padding: "14px 16px", fontSize: "16px", fontWeight: 700, fontFamily: "inherit", color: "#f9fafb", outline: "none", boxSizing: "border-box" }}
            onFocus={e => (e.target.style.borderColor = "#4ade80")}
            onBlur={e => (e.target.style.borderColor = "#374151")}
          />
        </div>

        {/* Preview initials */}
        {name.trim() && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#1f2937", borderRadius: "12px", padding: "14px" }}>
            <div style={{ width: "44px", height: "44px", background: "#111827", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 900, color: "#f9fafb", flexShrink: 0 }}>
              {name.trim().split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#f9fafb" }}>{name.trim()}</p>
              <p style={{ fontSize: "9px", color: "#4b5563", marginTop: "2px" }}>0 joueur · {tournament?.team_size}v{tournament?.team_size}</p>
            </div>
          </div>
        )}

        {error && <p style={{ fontSize: "11px", color: "#f87171" }}>{error}</p>}

        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          style={{ width: "100%", background: !name.trim() || loading ? "#374151" : "#4ade80", color: !name.trim() || loading ? "#4b5563" : "#111827", border: "none", borderRadius: "10px", padding: "14px", fontSize: "13px", fontWeight: 700, fontFamily: "inherit", cursor: !name.trim() || loading ? "default" : "pointer" }}>
          {loading ? "Création..." : "Créer l'équipe →"}
        </button>
      </div>
    </div>
  );
}

/* ─── VIEW MODE ─── */
function ViewTeam({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [unassigned, setUnassigned] = useState<MemberWithProfile[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user } = useAuth();

  async function reload(tournamentId: string) {
    const [{ data: mem }, { data: unass }] = await Promise.all([
      supabase.from("tournament_members").select("*, profiles(username)").eq("team_id", teamId),
      supabase.from("tournament_members").select("*, profiles(username)")
        .eq("tournament_id", tournamentId).is("team_id", null).eq("role", "player"),
    ]);
    setMembers((mem as MemberWithProfile[]) ?? []);
    setUnassigned((unass as MemberWithProfile[]) ?? []);
  }

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from("teams").select("*").eq("id", teamId).single();
      if (!t) { setLoading(false); return; }
      setTeam(t);
      const { data: tour } = await supabase.from("tournaments").select("*").eq("id", t.tournament_id).single();
      setTournament(tour);
      await reload(t.tournament_id);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function assignPlayer(memberId: string) {
    setActionLoading(memberId);
    await supabase.from("tournament_members").update({ team_id: teamId, status: "starter" }).eq("id", memberId);
    await reload(team!.tournament_id);
    setActionLoading(null);
  }

  async function removePlayer(memberId: string) {
    setActionLoading(memberId);
    await supabase.from("tournament_members").update({ team_id: null }).eq("id", memberId);
    await reload(team!.tournament_id);
    setActionLoading(null);
  }

  async function toggleStatus(memberId: string, current: "starter" | "sub") {
    setActionLoading(memberId);
    await supabase.from("tournament_members").update({ status: current === "starter" ? "sub" : "starter" }).eq("id", memberId);
    await reload(team!.tournament_id);
    setActionLoading(null);
  }

  async function toggleRole(memberId: string, current: "player" | "encoder") {
    setActionLoading(memberId);
    await supabase.from("tournament_members").update({ role: current === "player" ? "encoder" : "player" }).eq("id", memberId);
    await reload(team!.tournament_id);
    setActionLoading(null);
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "#111827" }} />;
  if (!team) return (
    <div style={{ minHeight: "100vh", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#6b7280" }}>Équipe introuvable.</p>
    </div>
  );

  const isOrganizer = user?.id === tournament?.organizer_id;
  const starters = members.filter(m => m.status === "starter");
  const subs = members.filter(m => m.status === "sub");
  const abbr = team.name.split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase();

  return (
    <div className="min-h-screen pb-20" style={{ background: "#111827" }}>
      <div style={{ background: "#111827", padding: "13px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #1f2937" }}>
        <Link href={`/tournament?id=${team.tournament_id}`} style={{ width: "30px", height: "30px", background: "#1f2937", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg>
        </Link>
        <span style={{ color: "#f9fafb", fontSize: "13px", fontWeight: 700, flex: 1 }}>{team.name}</span>
      </div>

      {/* Hero */}
      <div style={{ background: "#f9fafb", margin: "12px", borderRadius: "14px", padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{ width: "44px", height: "44px", background: "#111827", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 900, color: "#f9fafb", flexShrink: 0 }}>{abbr}</div>
          <div>
            <div style={{ fontSize: "17px", fontWeight: 900, color: "#0f172a" }}>{team.name}</div>
            {tournament && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{tournament.name}</div>}
          </div>
        </div>
        <div style={{ display: "flex", borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
          {[{ val: String(members.length), lbl: "Joueurs" }, { val: String(starters.length), lbl: "Titulaires" }, { val: String(subs.length), lbl: "Remplaçants" }].map((n, i, arr) => (
            <div key={n.lbl} style={{ flex: 1, textAlign: "center", borderRight: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "#0f172a" }}>{n.val}</div>
              <div style={{ fontSize: "7px", color: "#94a3b8", textTransform: "uppercase", marginTop: "2px" }}>{n.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Players header */}
      <div style={{ padding: "12px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "1px" }}>Joueurs · {members.length}</span>
        {isOrganizer && (
          <button onClick={() => setAddModal(true)}
            style={{ fontSize: "9px", fontWeight: 700, color: "#4ade80", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            + Ajouter
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <div style={{ margin: "0 12px", background: "#1f2937", borderRadius: "10px", padding: "20px", textAlign: "center" }}>
          <p style={{ fontSize: "11px", color: "#4b5563" }}>Aucun joueur dans cette équipe.</p>
          {isOrganizer
            ? <button onClick={() => setAddModal(true)} style={{ fontSize: "11px", fontWeight: 700, color: "#4ade80", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", marginTop: "8px" }}>Assigner des joueurs →</button>
            : <p style={{ fontSize: "10px", color: "#374151", marginTop: "6px" }}>Les joueurs rejoignent via le code du tournoi.</p>
          }
        </div>
      ) : (
        <div style={{ margin: "0 12px", background: "#1f2937", borderRadius: "10px", overflow: "hidden" }}>
          {members.map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", padding: "9px 13px", gap: "10px", borderBottom: i < members.length - 1 ? "1px solid #111827" : "none" }}>
              <div style={{ width: "30px", height: "30px", background: "#374151", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: "#9ca3af", flexShrink: 0 }}>
                {initials(m.profiles?.username)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#f1f5f9" }}>{m.profiles?.username ?? "Joueur"}</div>
                <div style={{ fontSize: "9px", color: "#4b5563", marginTop: "1px" }}>
                  {m.position ? POS_LABEL[m.position] ?? m.position : "Poste non défini"}
                </div>
              </div>
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                {m.role === "organizer" && <span style={{ fontSize: "8px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", background: "#1e3a5f", color: "#60a5fa" }}>Org.</span>}
                {isOrganizer && m.role === "encoder" && (
                  <button
                    onClick={() => toggleRole(m.id, "encoder")}
                    disabled={actionLoading === m.id}
                    style={{ fontSize: "8px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", border: "none", cursor: "pointer", fontFamily: "inherit", background: "#14532d", color: "#4ade80" }}>
                    Enc.
                  </button>
                )}
                {!isOrganizer && m.role === "encoder" && (
                  <span style={{ fontSize: "8px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", background: "#14532d", color: "#4ade80" }}>Enc.</span>
                )}
                {isOrganizer && m.role === "player" && (
                  <>
                    <button
                      onClick={() => toggleRole(m.id, "player")}
                      disabled={actionLoading === m.id}
                      style={{ fontSize: "8px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", border: "none", cursor: "pointer", fontFamily: "inherit", background: "#292524", color: "#78716c" }}>
                      Enc.
                    </button>
                    <button
                      onClick={() => toggleStatus(m.id, m.status)}
                      disabled={actionLoading === m.id}
                      style={{ fontSize: "8px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", border: "none", cursor: "pointer", fontFamily: "inherit",
                        background: m.status === "starter" ? "#14532d" : "#292524",
                        color: m.status === "starter" ? "#4ade80" : "#78716c" }}>
                      {m.status === "starter" ? "Tit." : "Rem."}
                    </button>
                    <button
                      onClick={() => removePlayer(m.id)}
                      disabled={actionLoading === m.id}
                      style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#1f2937", border: "1px solid #374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add player modal */}
      {addModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "#1f2937", borderRadius: "20px 20px 0 0", padding: "24px 20px 32px", width: "100%", maxWidth: "480px", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 900, color: "#f9fafb" }}>Ajouter un joueur</p>
                <p style={{ fontSize: "9px", color: "#4b5563", marginTop: "2px" }}>Joueurs sans équipe dans ce tournoi</p>
              </div>
              <button onClick={() => setAddModal(false)} style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#374151", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {unassigned.length === 0 ? (
                <div style={{ background: "#111827", borderRadius: "10px", padding: "20px", textAlign: "center" }}>
                  <p style={{ fontSize: "11px", color: "#4b5563" }}>Tous les joueurs ont déjà une équipe.</p>
                </div>
              ) : (
                <div style={{ background: "#111827", borderRadius: "10px", overflow: "hidden" }}>
                  {unassigned.map((m, i) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", padding: "10px 13px", gap: "10px", borderBottom: i < unassigned.length - 1 ? "1px solid #1f2937" : "none" }}>
                      <div style={{ width: "32px", height: "32px", background: "#374151", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: "#9ca3af", flexShrink: 0 }}>
                        {initials(m.profiles?.username)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#f1f5f9" }}>{m.profiles?.username ?? "Joueur"}</div>
                        <div style={{ fontSize: "9px", color: "#4b5563" }}>
                          {m.position ? POS_LABEL[m.position] ?? m.position : "Poste non défini"}
                        </div>
                      </div>
                      <button
                        onClick={() => assignPlayer(m.id)}
                        disabled={actionLoading === m.id}
                        style={{ padding: "6px 14px", borderRadius: "8px", background: actionLoading === m.id ? "#374151" : "#14532d", color: actionLoading === m.id ? "#4b5563" : "#4ade80", border: "none", fontSize: "10px", fontWeight: 700, fontFamily: "inherit", cursor: actionLoading === m.id ? "default" : "pointer" }}>
                        {actionLoading === m.id ? "..." : "Ajouter"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <PillNav active="home" />
    </div>
  );
}

/* ─── ROUTER ─── */
export default function TeamPage() {
  const params = useSearchParams();
  const tournamentId = params.get("tournament");
  const teamId = params.get("id");

  if (tournamentId) return <CreateTeam tournamentId={tournamentId} />;
  if (teamId) return <ViewTeam teamId={teamId} />;

  return (
    <div style={{ minHeight: "100vh", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#6b7280" }}>Paramètre manquant.</p>
    </div>
  );
}
