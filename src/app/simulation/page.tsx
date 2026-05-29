"use client";

// Simulationsseite: Herzstück der App.
// Kombiniert Formular, Ergebnistabellen und Szenarienverwaltung.
//
// Ladeverhalten beim Start:
//   - Wenn ?laden=1 in der URL → gespeicherte Inputs aus sessionStorage laden
//   - Sonst → Profildaten und Steuerkonstanten aus Supabase laden
//
// useSearchParams() erfordert eine Suspense-Grenze (Next.js App Router).
// Daher ist die eigentliche Logik in SimulationPageInner ausgelagert.

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { SimulationInputs, SimulationResult } from "@/types";
import { runAllSimulations } from "@/lib/simulation";
import { speichereSzenario } from "@/lib/szenarien";
import { ladeProfil } from "@/lib/profile";
import { ladeSteuerKonstanten, konstantenZuMap, ladeSteuerTabellen } from "@/lib/steuerKonstanten";
import type { SimulationsKonstanten, SteuerTabellen } from "@/lib/steuerKonstanten";
import { DEFAULT_INPUTS } from "@/lib/defaultInputs";
import SimulationForm from "@/components/SimulationForm";
import SimulationResults from "@/components/SimulationResults";
import SzenarienListe from "@/components/SzenarienListe";
import AuthGuard from "@/components/AuthGuard";

function SimulationPageInner() {
  const searchParams = useSearchParams();
  const [inputs, setInputs]           = useState(DEFAULT_INPUTS);
  const [inputsReady, setInputsReady] = useState(false);
  const [konstanten, setKonstanten]   = useState<SimulationsKonstanten | undefined>(undefined);
  const [steuerTabellen, setSteuerTabellen] = useState<SteuerTabellen | undefined>(undefined);

  // Beim ersten Laden: entweder gespeichertes Szenario oder Profildaten verwenden
  useEffect(() => {
    if (searchParams.get("laden") === "1") {
      // Szenario aus sessionStorage wiederherstellen (wurde von /konto übergeben)
      const gespeichert = sessionStorage.getItem("geladeneInputs");
      if (gespeichert) {
        setInputs(JSON.parse(gespeichert));
        sessionStorage.removeItem("geladeneInputs");
      }
      setInputsReady(true);
    } else {
      // Profil-Simulationsangaben und Steuerdaten parallel laden
      Promise.all([
        ladeProfil().catch(() => null),
        ladeSteuerKonstanten().catch(() => []),
        ladeSteuerTabellen().catch(() => null),
      ]).then(([profil, steuerListe, tabellen]) => {
        if (profil?.simulation_inputs) setInputs(profil.simulation_inputs);
        if (steuerListe.length > 0) setKonstanten(konstantenZuMap(steuerListe));
        if (tabellen) setSteuerTabellen(tabellen);
      }).finally(() => setInputsReady(true));
    }
  }, [searchParams]);

  const [results, setResults]           = useState<SimulationResult[] | null>(null);
  const [loading, setLoading]           = useState(false);
  const [szenarienOffen, setSzenarienOffen] = useState(false);
  const [speichernName, setSpeichernName]   = useState("");
  const [speichernStatus, setSpeichernStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  // Erhöhen erzwingt Neu-Render der SzenarienListe (key-Trick)
  const [szenarienKey, setSzenarienKey] = useState(0);

  // Simulation starten: kleines Timeout damit der Ladeindikator sichtbar wird
  function handleSimulate(newInputs: typeof DEFAULT_INPUTS) {
    setLoading(true);
    setInputs(newInputs);
    setTimeout(() => {
      const res = runAllSimulations(newInputs, konstanten, steuerTabellen);
      setResults(res);
      setLoading(false);
    }, 300);
  }

  // Aktuellen Eingabezustand als benanntes Szenario in Supabase speichern
  async function handleSpeichern() {
    const name = speichernName.trim() || `Szenario ${new Date().toLocaleDateString("de-CH")}`;
    setSpeichernStatus("saving");
    try {
      await speichereSzenario(name, inputs);
      setSpeichernStatus("ok");
      setSpeichernName("");
      setSzenarienKey((k) => k + 1);
      setTimeout(() => setSpeichernStatus("idle"), 2000);
    } catch {
      setSpeichernStatus("error");
      setTimeout(() => setSpeichernStatus("idle"), 3000);
    }
  }

  // Gespeichertes Szenario laden: Formular befüllen, Ergebnisse zurücksetzen
  function handleLaden(geladeneInputs: typeof DEFAULT_INPUTS) {
    setInputs(geladeneInputs);
    setSzenarienOffen(false);
    setResults(null);
  }

  return (
    <AuthGuard>
    <div>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Simulation konfigurieren</h2>
          <p className="text-slate-600">
            Passen Sie die Eingabewerte an. Die Standardwerte entsprechen dem Beispielfall aus der Dokumentation.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSzenarienOffen((o) => !o)}
            className="text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {szenarienOffen ? "▲ Szenarien ausblenden" : "▼ Gespeicherte Szenarien"}
          </button>
        </div>
      </div>

      {/* Klapppanel mit gespeicherten Szenarien */}
      {szenarienOffen && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Gespeicherte Szenarien</h3>
          {/* key erzwingt Neu-Laden nach dem Speichern eines neuen Szenarios */}
          <SzenarienListe key={szenarienKey} onLaden={handleLaden} />
        </div>
      )}

      {/* Formular erst anzeigen wenn die Profildaten geladen sind */}
      {!inputsReady ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400 italic">
          Lade Profildaten…
        </div>
      ) : (
        <SimulationForm initialInputs={inputs} onSimulate={handleSimulate} loading={loading} />
      )}

      {/* Szenario speichern – erscheint nach der ersten Berechnung */}
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
              {speichernStatus === "saving" ? "Wird gespeichert…"
                : speichernStatus === "ok"    ? "✓ Gespeichert!"
                : speichernStatus === "error" ? "Fehler – nochmals versuchen"
                : "Speichern"}
            </button>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            Die aktuellen Eingabewerte werden gespeichert und können jederzeit wieder aufgerufen werden.
          </p>
        </div>
      )}

      {/* Ergebnisse (alle 6 Szenarien mit Detailtabellen und Empfehlung) */}
      {results && !loading && (
        <div className="mt-10">
          <SimulationResults results={results} />
        </div>
      )}
    </div>
    </AuthGuard>
  );
}

// Suspense-Wrapper nötig weil useSearchParams() statisches Rendering verhindert
export default function SimulationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16 text-sm text-slate-400 italic">Lade…</div>}>
      <SimulationPageInner />
    </Suspense>
  );
}
