"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PillNav from "@/components/PillNav";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "0€",
    tag: "Gratuit",
    tagStyle: { background: "#374151", color: "#9ca3af" },
    borderColor: "#374151",
    nameColor: "#f9fafb",
    priceColor: "#f9fafb",
    features: [
      { ok: true, label: "1 tournoi actif" },
      { ok: true, label: "Max 4 équipes" },
      { ok: false, label: "Stats joueurs" },
      { ok: false, label: "Notifications push" },
      { ok: false, label: "Sans watermark" },
    ],
    cta: null,
  },
  {
    id: "pro",
    name: "Pro",
    price: "9€",
    tag: "Recommandé",
    tagStyle: { background: "#1e3a5f", color: "#60a5fa" },
    borderColor: "#60a5fa",
    nameColor: "#60a5fa",
    priceColor: "#60a5fa",
    features: [
      { ok: true, label: "Tournois illimités", color: "#60a5fa" },
      { ok: true, label: "Équipes illimitées", color: "#60a5fa" },
      { ok: true, label: "Stats complètes (buts, assists…)", color: "#60a5fa" },
      { ok: true, label: "Notifications push", color: "#60a5fa" },
      { ok: true, label: "Sans watermark", color: "#60a5fa" },
    ],
    cta: { label: "Passer à Pro", style: { background: "#60a5fa", color: "#0f172a" } },
    note: "14 jours gratuits, carte bancaire requise",
  },
  {
    id: "club",
    name: "Club",
    price: "19€",
    tag: "Club",
    tagStyle: { background: "#451a03", color: "#d97706" },
    borderColor: "#d97706",
    nameColor: "#d97706",
    priceColor: "#d97706",
    features: [
      { ok: true, label: "Tout Pro inclus", color: "#d97706" },
      { ok: true, label: "Logo & couleurs club custom", color: "#d97706" },
      { ok: true, label: "Export données", color: "#d97706" },
      { ok: true, label: "Support prioritaire", color: "#d97706" },
    ],
    cta: { label: "Passer à Club", style: { background: "#d97706", color: "#0f172a" } },
  },
];

export default function BillingPage() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan").eq("id", user.id).single()
      .then(({ data }) => setCurrentPlan(data?.plan ?? "free"));
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) setToast("Abonnement activé !");
    if (params.get("canceled")) setToast("Paiement annulé.");
  }, []);

  async function handleUpgrade(planId: string) {
    setLoading(planId);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId }),
    });
    const { url, error } = await res.json();
    if (error) { setToast("Erreur : " + error); setLoading(null); return; }
    window.location.href = url;
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "#0d1117" }}>

      {/* Toast */}
      {toast && (
        <div onClick={() => setToast(null)} style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", background: "#1f2937", border: "1px solid #374151", borderRadius: "10px", padding: "10px 16px", fontSize: "12px", fontWeight: 700, color: "#f9fafb", zIndex: 100, cursor: "pointer", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3" style={{ borderBottom: "1px solid #1f2937", background: "#111827" }}>
        <Link href="/profile" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#1f2937" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
            <path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/>
          </svg>
        </Link>
        <span className="font-bold text-sm" style={{ color: "#f9fafb" }}>Mon abonnement</span>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-4">
        {plans.map(plan => {
          const isActive = currentPlan === plan.id;
          return (
            <div key={plan.id} className="rounded-2xl p-4 relative"
              style={{ background: "#1f2937", border: `2px solid ${isActive ? plan.borderColor : plan.id === "free" ? "#374151" : plan.borderColor + "80"}` }}>

              {/* Tag */}
              <span className="absolute top-3 right-3 font-bold rounded-full px-2 py-0.5"
                style={{ ...plan.tagStyle, fontSize: "8px" }}>
                {isActive ? "Actuel" : plan.tag}
              </span>

              {/* Name + price */}
              <p className="font-bold" style={{ color: plan.nameColor, fontSize: "16px" }}>{plan.name}</p>
              <p className="font-bold leading-none mt-1.5 mb-0.5" style={{ color: plan.priceColor, fontSize: "28px" }}>
                {plan.price}<span className="font-normal" style={{ color: "#4b5563", fontSize: "12px" }}>/mois</span>
              </p>

              {/* Features */}
              <div className="flex flex-col gap-1.5 mt-3">
                {plan.features.map(f => (
                  <div key={f.label} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: f.ok ? (("color" in f ? f.color : undefined) ?? "#4ade80") : "#374151" }} />
                    <span style={{ color: f.ok ? "#f1f5f9" : "#9ca3af", fontSize: "10px", textDecoration: f.ok ? "none" : "line-through" }}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {plan.cta && !isActive && (
                <>
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading === plan.id}
                    className="w-full rounded-lg py-2.5 font-bold mt-3"
                    style={{ ...plan.cta.style, fontSize: "11px", opacity: loading === plan.id ? 0.6 : 1, cursor: loading === plan.id ? "default" : "pointer", border: "none", fontFamily: "inherit" }}>
                    {loading === plan.id ? "Chargement..." : plan.cta.label}
                  </button>
                  {"note" in plan && plan.note && (
                    <p className="text-center mt-1" style={{ color: "#4b5563", fontSize: "9px" }}>{plan.note}</p>
                  )}
                </>
              )}
              {isActive && plan.id !== "free" && (
                <div className="w-full rounded-lg py-2.5 font-bold mt-3 text-center" style={{ background: "#374151", color: "#6b7280", fontSize: "11px" }}>
                  Plan actif ✓
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PillNav active="profile" />
    </div>
  );
}
