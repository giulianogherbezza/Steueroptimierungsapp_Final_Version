"use client";

import { useState } from "react";
import type { SimulationInputs, SimulationResult } from "@/types";
import { runAllSimulations } from "@/lib/simulation";
import { speichereSzenario } from "@/lib/szenarien";
import SimulationForm from "@/components/SimulationForm";
import SimulationResults from "@/components/SimulationResults";
import SzenarienListe from "@/components/SzenarienListe";

const DEFAULT_INPUTS: Omit<SimulationInputs, "kanton" | "szenario"> = {
  personal: {
    geburtsdatumHerr: "1963-06-30",
    geburtsdatumFrau: "1964-12-31",
    einkommenTotal: 270,
    kinderAnzahl: 2,
    kinderStudierenJahre: 3,
  },
  vorsorge: {
    pkHerr: 470,
    pkFrau: 1490,
    freizuegigkeit1Herr: 235,
    freizuegigkeit2Herr: 44,
    saeule3aHerr1: 60,
    saeule3aHerr2: 80,
    saeule3aFrau1: 80,
    saeule3aFrau2: 13,
    saeule3aFrau3: 6,
    lebensversicherungBetrag: 70,
    lebensversicherungJahr: 2028,
  },
  liquiditaet: {
    liquiditaetHerr: 120,
    liquiditaetFrau: 200,
    etfFrau: 155,
  },
  liegenschaft: {
    verkehrswert: 3500,
    steuerwert: 2450,
    eigenmietwert: 73.5,
    hypothek1: 400,
    hypothek1Verfall: "2024-05-31",
    hypothek2: 800,
    hypothek2Verfall: "2024-10-31",
    hypothek3: 300,
    hypothek3Verfall: "2025-01-31",
    zinsSatzAlt: 0.0064,
    zinsSatzNeu: 0.03,
  },
};

export default function SimulationPage() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [szenarienOffen, setSzenarienOffen] = useState(false);
  const [speichernName, setSpeichernName] = useState("");
  const [speichernStatus, setSpeichernStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [szenarienKey, setSzenarienKey] = useState(0); // Refresh-Trigger

  function handleSimulate(newInputs: typeof DEFAULT_INPUTS) {
    setLoading(true);
    setInputs(newInputs);
    setTimeout(() => {
      const res = runAllSimulations(newInputs);
      setResults(res);
      setLoading(false);
    }, 300);
  }

  async function handleSpeichern() {
    const name = speichernName.trim() || `Szenario ${new Date().toLocaleDateString("de-CH")}`;
    setSpeichernStatus("saving");
    try {
      await speichereSzenario(name, inputs);
      setSpeichernStatus("ok");
      setSpeichernName("");
      setSzenarienKey((k) => k + 1); // Liste neu laden
      setTimeout(() => setSpeichernStatus("idle"), 2000);
    } catch {
      setSpeichernStatus("error");
      setTimeout(() => setSpeichernStatus("idle"), 3000);
    }
  }

  function handleLaden(geladeneInputs: typeof DEFAULT_INPUTS) {
    setInputs(geladeneInputs);
    setSzenarienOffen(false);
    setResults(null); // Ergebnisse zurücksetzen, neue Simulation nötig
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Simulation konfigurieren</h2>
          <p className="text-slate-600">
            Passen Sie die Eingabewerte an. Die Standardwerte entsprechen dem Beispielfall aus der Dokumentation.
          </p>
        </div>

        {/* Szenario speichern/laden */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSzenarienOffen((o) => !o)}
            className="text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {szenarienOffen ? "▲ Szenarien ausblenden" : "▼ Gespeicherte Szenarien"}
          </button>
        </div>
      </div>

      {/* Gespeicherte Szenarien Panel */}
      {szenarienOffen && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Gespeicherte Szenarien</h3>
          <SzenarienListe key={szenarienKey} onLaden={handleLaden} />
        </div>
      )}

      <SimulationForm initialInputs={inputs} onSimulate={handleSimulate} loading={loading} />

      {/* Szenario speichern (erscheint nach Simulation) */}
      {results && !loading && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-blue-900 mb-3">Szenario speichern</h3>
          <div className="flex gap-3 items-center flex-wrap">
            <input
              type="text"
              placeholder="Name (z. B. «Familie Müller, konservativ»)"
              value={speichernName}
              onChange={(e) => setSpeichernName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSpeichern()}
              className="border border-blue-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSpeichern}
              disabled={speichernStatus === "saving"}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {speichernStatus === "saving"
                ? "Wird gespeichert…"
                : speichernStatus === "ok"
                ? "✓ Gespeichert!"
                : speichernStatus === "error"
                ? "Fehler – nochmals versuchen"
                : "Speichern"}
            </button>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            Die aktuellen Eingabewerte werden gespeichert und können jederzeit wieder aufgerufen werden.
          </p>
        </div>
      )}

      {results && !loading && (
        <div className="mt-10">
          <SimulationResults results={results} />
        </div>
      )}
    </div>
  );
}
