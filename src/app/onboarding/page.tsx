"use client";

// Onboarding-Seite nach der Registrierung.
// Führt den Benutzer in zwei Schritten durch die Ersteinrichtung:
//   Schritt 1: Persönliche Angaben (Name, Telefon)
//   Schritt 2: Finanzangaben für die Simulation (vorausgefüllt mit Beispieldaten)
// Beide Schritte können übersprungen werden.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { speichereProfil } from "@/lib/profile";
import { DEFAULT_INPUTS } from "@/lib/defaultInputs";
import SimulationForm from "@/components/SimulationForm";
import type { SimulationInputs } from "@/types";

type SimInputs = Omit<SimulationInputs, "kanton" | "szenario">;

// Fortschrittsanzeige: zeigt abgeschlossene, aktive und ausstehende Schritte
function ProgressStep({
  nr,
  label,
  status,
}: {
  nr: number;
  label: string;
  status: "done" | "active" | "pending";
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          status === "done"   ? "bg-green-500 text-white"
          : status === "active" ? "bg-blue-600 text-white"
          : "bg-slate-200 text-slate-500"
        }`}
      >
        {status === "done" ? "✓" : nr}
      </div>
      <span className={`text-xs ${status === "active" ? "font-medium text-slate-700" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [schritt, setSchritt]   = useState<1 | 2>(1);
  const [vorname, setVorname]   = useState("");
  const [nachname, setNachname] = useState("");
  const [telefon, setTelefon]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [fehler, setFehler]     = useState<string | null>(null);

  // Schritt 1: Persönliche Angaben speichern und zu Schritt 2 wechseln
  async function handleSchritt1(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFehler(null);
    try {
      await speichereProfil({ vorname, nachname, telefon });
      setSchritt(2);
    } catch {
      setFehler("Angaben konnten nicht gespeichert werden. Bitte nochmals versuchen.");
    } finally {
      setLoading(false);
    }
  }

  // Schritt 2: Finanzangaben speichern und zur Simulation weiterleiten
  async function handleSchritt2(simInputs: SimInputs) {
    setLoading(true);
    setFehler(null);
    try {
      await speichereProfil({ simulation_inputs: simInputs });
      router.push("/simulation");
    } catch {
      setFehler("Simulationsangaben konnten nicht gespeichert werden.");
      setLoading(false);
    }
  }

  async function handleUeberspringen() {
    router.push("/simulation");
  }

  return (
    <div className="py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Fortschrittsleiste */}
        <div className="flex items-center gap-3 mb-8 bg-white rounded-xl border border-slate-200 px-6 py-4">
          <ProgressStep nr={1} label="Konto erstellt" status="done" />
          <div className="flex-1 h-px bg-slate-200" />
          <ProgressStep nr={2} label="Persönliche Angaben" status={schritt === 1 ? "active" : "done"} />
          <div className="flex-1 h-px bg-slate-200" />
          <ProgressStep nr={3} label="Finanzangaben" status={schritt === 2 ? "active" : "pending"} />
          <div className="flex-1 h-px bg-slate-200" />
          <ProgressStep nr={4} label="Simulation" status="pending" />
        </div>

        {/* ── Schritt 1: Name und Telefon ───────────────────────────── */}
        {schritt === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Willkommen!</h2>
            <p className="text-sm text-slate-500 mb-2">
              Ergänze deine persönlichen Angaben für eine persönliche Erfahrung.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
              Alle Angaben können jederzeit unter <strong>«Mein Konto»</strong> geändert werden.
            </div>
            <form onSubmit={handleSchritt1} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vorname</label>
                  <input type="text" value={vorname} onChange={(e) => setVorname(e.target.value)}
                    placeholder="Max"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nachname</label>
                  <input type="text" value={nachname} onChange={(e) => setNachname(e.target.value)}
                    placeholder="Muster"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Telefon <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)}
                  placeholder="+41 79 123 45 67"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {fehler && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{fehler}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
                  {loading ? "Wird gespeichert…" : "Weiter →"}
                </button>
              </div>
            </form>
            <button onClick={handleUeberspringen}
              className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Überspringen – direkt zur Simulation
            </button>
          </div>
        )}

        {/* ── Schritt 2: Finanzangaben ──────────────────────────────── */}
        {schritt === 2 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Deine Finanzangaben</h2>
              <p className="text-sm text-slate-500 mb-2">
                Die Werte sind mit Beispieldaten vorausgefüllt — passe sie an deine Situation an.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                Du kannst alle Angaben jederzeit unter <strong>«Mein Konto»</strong> anpassen oder direkt
                in der Simulation ändern.
              </div>
            </div>
            {fehler && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 mb-4">{fehler}</div>
            )}
            <SimulationForm
              initialInputs={DEFAULT_INPUTS}
              onSimulate={handleSchritt2}
              loading={loading}
              buttonLabel="Angaben speichern & zur Simulation →"
            />
            <button onClick={handleUeberspringen}
              className="w-full mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Überspringen – direkt zur Simulation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
