"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { speichereProfil } from "@/lib/profile";

export default function OnboardingPage() {
  const router = useRouter();
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [telefon, setTelefon] = useState("");
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function handleWeiter(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFehler(null);
    try {
      await speichereProfil({ vorname, nachname, telefon });
      router.push("/simulation");
    } catch {
      setFehler("Angaben konnten nicht gespeichert werden. Bitte nochmals versuchen.");
      setLoading(false);
    }
  }

  async function handleUeberspringen() {
    router.push("/simulation");
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-md p-8">

        {/* Fortschrittsanzeige */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <span className="text-xs text-slate-500">Konto erstellt</span>
          </div>
          <div className="flex-1 h-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <span className="text-xs font-medium text-slate-700">Persönliche Angaben</span>
          </div>
          <div className="flex-1 h-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-slate-500 text-xs font-bold">3</span>
            </div>
            <span className="text-xs text-slate-400">Simulation</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">Willkommen!</h2>
        <p className="text-sm text-slate-500 mb-6">
          Ergänze deine persönlichen Angaben — du kannst sie jederzeit unter «Mein Konto» ändern.
        </p>

        <form onSubmit={handleWeiter} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vorname</label>
              <input
                type="text"
                value={vorname}
                onChange={(e) => setVorname(e.target.value)}
                placeholder="Max"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nachname</label>
              <input
                type="text"
                value={nachname}
                onChange={(e) => setNachname(e.target.value)}
                placeholder="Muster"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Telefon <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="+41 79 123 45 67"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {fehler && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {fehler}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {loading ? "Wird gespeichert…" : "Weiter zur Simulation →"}
            </button>
          </div>
        </form>

        <button
          onClick={handleUeberspringen}
          className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Überspringen
        </button>
      </div>
    </div>
  );
}
