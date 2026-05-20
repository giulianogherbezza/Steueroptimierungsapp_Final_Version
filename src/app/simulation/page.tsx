"use client";

import { useState } from "react";
import type { SimulationInputs, SimulationResult } from "@/types";
import { runAllSimulations } from "@/lib/simulation";
import SimulationForm from "@/components/SimulationForm";
import SimulationResults from "@/components/SimulationResults";

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

  function handleSimulate(newInputs: typeof DEFAULT_INPUTS) {
    setLoading(true);
    setInputs(newInputs);
    // Kurze Verzögerung für UI-Feedback
    setTimeout(() => {
      const res = runAllSimulations(newInputs);
      setResults(res);
      setLoading(false);
    }, 300);
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Simulation konfigurieren</h2>
        <p className="text-slate-600">
          Passen Sie die Eingabewerte an. Die Standardwerte entsprechen dem Beispielfall aus der Dokumentation.
        </p>
      </div>

      <SimulationForm initialInputs={inputs} onSimulate={handleSimulate} loading={loading} />

      {results && !loading && (
        <div className="mt-10">
          <SimulationResults results={results} />
        </div>
      )}
    </div>
  );
}
