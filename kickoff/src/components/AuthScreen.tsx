"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AuthScreen() {
  const [tab, setTab] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  async function handleSubmit() {
    setError(null);
    if (!email || !password) { setError("Email et mot de passe requis."); return; }
    if (tab === "register" && password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 6) { setError("Mot de passe trop court (min 6 caractères)."); return; }

    if (tab === "register" && (!prenom.trim() || !nom.trim())) { setError("Prénom et nom requis."); return; }
    setLoading(true);
    if (tab === "register") {
      const { error } = await signUp(email, password, `${prenom.trim()} ${nom.trim()}`);
      if (error) { setError(error); setLoading(false); return; }
      setSuccess(true);
      setLoading(false);
    } else {
      const { error } = await signIn(email, password);
      if (error) { setError(error); setLoading(false); return; }
      router.push("/dashboard");
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0d1117" }}>
        <div className="w-full max-w-sm text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#14532d" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="text-xl font-bold" style={{ color: "#f9fafb" }}>Vérifie ton email</p>
          <p className="text-sm" style={{ color: "#6b7280" }}>Un lien de confirmation a été envoyé à <span style={{ color: "#9ca3af" }}>{email}</span>. Clique dessus pour activer ton compte.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0d1117" }}>
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center gap-1.5 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#14532d" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
              <path d="M2 12h20"/>
            </svg>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#f9fafb", letterSpacing: "-0.5px" }}>KickOff</p>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#4b5563", fontSize: "9px" }}>
            Organise ton tournoi en 5 min
          </p>
        </div>

        <div className="flex rounded-xl p-1 gap-1 mb-4" style={{ background: "#1f2937" }}>
          {(["register", "login"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(null); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: tab === t ? "#111827" : "transparent", color: tab === t ? "#f9fafb" : "#4b5563" }}>
              {t === "register" ? "Créer un compte" : "Connexion"}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-lg px-4 py-2 mb-3" style={{ background: "#1f1215", border: "1px solid #7f1d1d" }}>
            <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {tab === "register" && (
            <div className="flex gap-2">
              {([["Prénom", prenom, setPrenom, "Mohamed"], ["Nom", nom, setNom, "Dupont"]] as const).map(([label, val, setter, placeholder]) => (
                <div key={label} className="flex-1">
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: "#4b5563", fontSize: "9px", letterSpacing: "0.5px" }}>{label}</p>
                  <input type="text" placeholder={placeholder} value={val} onChange={e => setter(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 outline-none"
                    style={{ background: "#1f2937", border: "1px solid #374151", color: "#f9fafb", fontSize: "12px" }}
                    onFocus={e => (e.target.style.borderColor = "#4ade80")}
                    onBlur={e => (e.target.style.borderColor = "#374151")}
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: "#4b5563", fontSize: "9px", letterSpacing: "0.5px" }}>Adresse email</p>
            <input type="email" placeholder="ton@email.com" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 outline-none"
              style={{ background: "#1f2937", border: "1px solid #374151", color: "#f9fafb", fontSize: "12px" }}
              onFocus={e => (e.target.style.borderColor = "#4ade80")}
              onBlur={e => (e.target.style.borderColor = "#374151")}
            />
          </div>

          <div>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: "#4b5563", fontSize: "9px", letterSpacing: "0.5px" }}>Mot de passe</p>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 outline-none"
              style={{ background: "#1f2937", border: "1px solid #374151", color: "#f9fafb", fontSize: "12px" }}
              onFocus={e => (e.target.style.borderColor = "#4ade80")}
              onBlur={e => (e.target.style.borderColor = "#374151")}
            />
          </div>

          {tab === "register" && (
            <div>
              <p className="text-xs font-bold uppercase mb-1" style={{ color: "#4b5563", fontSize: "9px", letterSpacing: "0.5px" }}>Confirmer le mot de passe</p>
              <input type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 outline-none"
                style={{ background: "#1f2937", border: "1px solid #374151", color: "#f9fafb", fontSize: "12px" }}
                onFocus={e => (e.target.style.borderColor = "#4ade80")}
                onBlur={e => (e.target.style.borderColor = "#374151")}
              />
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-bold mt-1 transition-opacity"
            style={{ background: loading ? "#166534" : "#4ade80", color: "#111827", opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." : tab === "register" ? "Créer mon compte" : "Se connecter"}
          </button>
        </div>

        <p className="text-center mt-4" style={{ color: "#4b5563", fontSize: "10px" }}>
          {tab === "register" ? "Déjà un compte ? " : "Pas encore de compte ? "}
          <button onClick={() => { setTab(tab === "register" ? "login" : "register"); setError(null); }}
            className="font-semibold" style={{ color: "#9ca3af" }}>
            {tab === "register" ? "Connexion" : "S'inscrire"}
          </button>
        </p>

      </div>
    </div>
  );
}
