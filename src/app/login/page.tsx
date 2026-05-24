"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [modus, setModus] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registerErfolg, setRegisterErfolg] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    setLoading(true);

    try {
      if (modus === "login") {
        await signIn(email, password);
        router.push("/simulation");
      } else {
        await signUp(email, password);
        setRegisterErfolg(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      if (msg.includes("Invalid login credentials")) {
        setFehler("E-Mail oder Passwort falsch.");
      } else if (msg.includes("already registered")) {
        setFehler("Diese E-Mail ist bereits registriert.");
      } else if (msg.includes("Password should be at least")) {
        setFehler("Passwort muss mindestens 6 Zeichen lang sein.");
      } else {
        setFehler(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">S</span>
          </div>
          <div>
            <h1 className="font-bold text-slate-900">Steueroptimierung</h1>
            <p className="text-xs text-slate-500">Hypothekar-Amortisation</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
          <button
            onClick={() => { setModus("login"); setFehler(null); setRegisterErfolg(false); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              modus === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Anmelden
          </button>
          <button
            onClick={() => { setModus("register"); setFehler(null); setRegisterErfolg(false); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              modus === "register"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Registrieren
          </button>
        </div>

        {/* Erfolgs-Meldung nach Registrierung */}
        {registerErfolg ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            <p className="font-semibold mb-1">✓ Registrierung erfolgreich!</p>
            <p>Bitte bestätige deine E-Mail-Adresse und melde dich dann an.</p>
            <button
              onClick={() => { setModus("login"); setRegisterErfolg(false); }}
              className="mt-3 text-blue-600 hover:underline font-medium"
            >
              Zur Anmeldung →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                E-Mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@beispiel.ch"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Passwort
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={modus === "register" ? "Mindestens 6 Zeichen" : "••••••••"}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {fehler && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                {fehler}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {loading
                ? "Bitte warten…"
                : modus === "login"
                ? "Anmelden"
                : "Konto erstellen"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
