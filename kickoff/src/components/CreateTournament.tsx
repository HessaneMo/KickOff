"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type Format = "poules" | "elimination" | "mixte";
type Visibilite = "public" | "prive";

interface FormData {
  nom: string;
  taille: number;
  maxEquipes: number;
  format: Format;
  visibilite: Visibilite;
}

const DB_FORMAT: Record<Format, "groups" | "knockout" | "groups_knockout"> = {
  poules: "groups",
  elimination: "knockout",
  mixte: "groups_knockout",
};

const tailleOptions = [5, 6, 7, 8, 9, 10, 11];
const tailleLabel: Record<number, string> = { 5: "Futsal", 6: "Réduit", 7: "Demi", 11: "Foot 11" };

const formatOptions: { id: Format; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: "poules",
    label: "Poules",
    desc: "Tous jouent tous",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    id: "elimination",
    label: "Élim.",
    desc: "Knockout",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
        <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
      </svg>
    ),
  },
  {
    id: "mixte",
    label: "Mixte",
    desc: "Poules + finale",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <line x1="12" y1="17" x2="12" y2="21"/><polyline points="9 21 12 21 15 21"/>
      </svg>
    ),
  },
];

function generateShortCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `${code}-${num}`;
}

export default function CreateTournament() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    nom: "",
    taille: 7,
    maxEquipes: 8,
    format: "poules",
    visibilite: "public",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const canNext = step === 1 ? form.nom.trim().length > 0 : true;

  async function handleCreate() {
    if (!user) return;
    setLoading(true);
    setError(null);

    const short_code = generateShortCode();

    const { data: tournament, error: tErr } = await supabase
      .from("tournaments")
      .insert({
        name: form.nom.trim(),
        organizer_id: user.id,
        format: DB_FORMAT[form.format],
        team_size: form.taille,
        visibility: form.visibilite === "prive" ? "private" : "public",
        max_teams: form.maxEquipes,
        short_code,
        status: "open",
      })
      .select()
      .single();

    if (tErr || !tournament) {
      setError(tErr?.message ?? "Erreur création tournoi.");
      setLoading(false);
      return;
    }

    await supabase.from("tournament_members").insert({
      tournament_id: tournament.id,
      user_id: user.id,
      role: "organizer",
    });

    router.push(`/tournament?id=${tournament.id}`);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d1117" }}>

      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3" style={{ borderBottom: "1px solid #1f2937", background: "#111827" }}>
        <Link href="/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#1f2937" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
            <path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>
          </svg>
        </Link>
        <span className="font-bold text-sm" style={{ color: "#f9fafb" }}>Nouveau tournoi</span>
      </div>

      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-1">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 h-1 rounded-full transition-all"
              style={{ background: s < step ? "#4ade80" : s === step ? "#60a5fa" : "#1f2937" }} />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          {["Infos", "Format", "Résumé"].map((label, i) => (
            <span key={label} className="font-semibold" style={{ fontSize: "8px", color: i + 1 === step ? "#60a5fa" : "#4b5563" }}>{label}</span>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 flex flex-col gap-4 pt-2">

        {/* Step 1 */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9ca3af", fontSize: "11px" }}>Informations du tournoi</p>
            <div>
              <p className="font-bold uppercase mb-1.5" style={{ color: "#4b5563", fontSize: "9px", letterSpacing: "0.5px" }}>
                Nom du tournoi <span style={{ color: "#dc2626" }}>*</span>
              </p>
              <input
                type="text"
                placeholder="Ex: Tournoi Ramadan 2026"
                value={form.nom}
                onChange={e => setForm({ ...form, nom: e.target.value })}
                className="w-full rounded-lg px-3 py-2.5 outline-none"
                style={{ background: "#1f2937", border: "1px solid #374151", color: "#f9fafb", fontSize: "12px" }}
                onFocus={e => (e.target.style.borderColor = "#4ade80")}
                onBlur={e => (e.target.style.borderColor = "#374151")}
              />
            </div>
            <div>
              <p className="font-bold uppercase mb-1.5" style={{ color: "#4b5563", fontSize: "9px", letterSpacing: "0.5px" }}>Nombre max d&apos;équipes</p>
              <div className="flex gap-2 flex-wrap">
                {[4, 6, 8, 12, 16].map(n => (
                  <button key={n} onClick={() => setForm({ ...form, maxEquipes: n })}
                    className="rounded-lg px-4 py-2 font-bold transition-all"
                    style={{
                      background: form.maxEquipes === n ? "#14532d" : "#1f2937",
                      border: `1px solid ${form.maxEquipes === n ? "#4ade80" : "#374151"}`,
                      color: form.maxEquipes === n ? "#4ade80" : "#9ca3af",
                      fontSize: "12px",
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-bold uppercase mb-2" style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.5px" }}>Taille des équipes</p>
              <div className="grid grid-cols-4 gap-1.5">
                {tailleOptions.map(t => (
                  <button key={t} onClick={() => setForm({ ...form, taille: t })}
                    className="rounded-lg py-2 text-center transition-all"
                    style={{ background: form.taille === t ? "#14532d" : "#1f2937", border: `1px solid ${form.taille === t ? "#4ade80" : "#374151"}` }}>
                    <p className="font-bold" style={{ color: "#f9fafb", fontSize: "13px" }}>{t}v{t}</p>
                    <p style={{ color: form.taille === t ? "#4ade80" : "#4b5563", fontSize: "7px" }}>{tailleLabel[t] ?? "—"}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold uppercase mb-2" style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.5px" }}>Format</p>
              <div className="grid grid-cols-3 gap-1.5">
                {formatOptions.map(f => (
                  <button key={f.id} onClick={() => setForm({ ...form, format: f.id })}
                    className="rounded-xl p-3 text-center transition-all"
                    style={{ background: form.format === f.id ? "#1e3a5f" : "#1f2937", border: `1px solid ${form.format === f.id ? "#60a5fa" : "#374151"}` }}>
                    <div className="flex justify-center mb-1" style={{ color: form.format === f.id ? "#60a5fa" : "#9ca3af" }}>{f.icon}</div>
                    <p className="font-bold" style={{ color: "#f9fafb", fontSize: "9px" }}>{f.label}</p>
                    <p style={{ color: form.format === f.id ? "#60a5fa" : "#4b5563", fontSize: "7px", marginTop: "2px" }}>{f.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold uppercase mb-2" style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.5px" }}>Visibilité</p>
              <div className="flex gap-2">
                {([["public", "Public", "Visible par tous"], ["prive", "Privé", "Invitation uniquement"]] as const).map(([val, label, desc]) => (
                  <button key={val} onClick={() => setForm({ ...form, visibilite: val })}
                    className="flex-1 rounded-xl p-3 text-left transition-all"
                    style={{ background: "#1f2937", border: `1px solid ${form.visibilite === val ? "#4ade80" : "#374151"}` }}>
                    <div className="mb-1" style={{ color: form.visibilite === val ? "#4ade80" : "#9ca3af" }}>
                      {val === "public" ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      )}
                    </div>
                    <p className="font-bold" style={{ color: "#f9fafb", fontSize: "10px" }}>{label}</p>
                    <p style={{ color: "#4b5563", fontSize: "8px", marginTop: "2px" }}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Résumé */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            <p className="font-bold uppercase" style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.5px" }}>Résumé</p>
            <div className="rounded-xl overflow-hidden" style={{ background: "#1f2937" }}>
              {[
                { label: "Nom", val: form.nom },
                { label: "Équipes", val: `Max ${form.maxEquipes}` },
                { label: "Taille", val: `${form.taille}v${form.taille}` },
                { label: "Format", val: formatOptions.find(f => f.id === form.format)?.label ?? "" },
                { label: "Visibilité", val: form.visibilite === "public" ? "Public" : "Privé" },
              ].map((r, i, arr) => (
                <div key={r.label} className="flex justify-between items-center px-4 py-3"
                  style={{ borderBottom: i < arr.length - 1 ? "1px solid #111827" : "none" }}>
                  <span className="font-semibold uppercase" style={{ color: "#4b5563", fontSize: "9px", letterSpacing: "0.5px" }}>{r.label}</span>
                  <span className="font-bold" style={{ color: "#f9fafb", fontSize: "12px" }}>{r.val}</span>
                </div>
              ))}
            </div>
            {error && (
              <div className="rounded-lg px-4 py-2" style={{ background: "#1f1215", border: "1px solid #7f1d1d" }}>
                <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-6 flex gap-2">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)}
            className="flex-1 rounded-xl py-3 text-sm font-bold"
            style={{ background: "#1f2937", color: "#9ca3af" }}>
            Retour
          </button>
        )}
        <button
          onClick={() => {
            if (!canNext) return;
            if (step < 3) setStep(step + 1);
            else handleCreate();
          }}
          disabled={!canNext || loading}
          className="rounded-xl py-3 text-sm font-bold transition-opacity"
          style={{
            flex: 2,
            background: !canNext || loading ? "#374151" : step === 3 ? "#4ade80" : "#f9fafb",
            color: !canNext || loading ? "#4b5563" : "#111827",
          }}>
          {loading ? "Création..." : step === 3 ? "Créer le tournoi ✓" : "Suivant →"}
        </button>
      </div>
    </div>
  );
}
