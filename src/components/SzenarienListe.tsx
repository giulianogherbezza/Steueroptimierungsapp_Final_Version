"use client";

// Liste aller gespeicherten Szenarien des eingeloggten Benutzers.
// Ermöglicht das Laden und Löschen von Szenarien direkt in der Simulationsseite.
// Wird über den key-Prop von der Elternkomponente zum Neuladen gezwungen
// (z. B. nachdem ein neues Szenario gespeichert wurde).

import { useEffect, useState } from "react";
import type { GespeichertesSzenario } from "@/lib/szenarien";
import { ladeSzenarien, loescheSzenario } from "@/lib/szenarien";
import type { SimulationInputs } from "@/types";

interface Props {
  /** Callback wenn der Benutzer ein Szenario laden möchte */
  onLaden: (inputs: Omit<SimulationInputs, "kanton" | "szenario">) => void;
}

export default function SzenarienListe({ onLaden }: Props) {
  const [szenarien, setSzenarien] = useState<GespeichertesSzenario[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fehler, setFehler]       = useState<string | null>(null);

  async function laden() {
    setLoading(true);
    setFehler(null);
    try {
      const data = await ladeSzenarien();
      setSzenarien(data);
    } catch {
      setFehler("Szenarien konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function loeschen(id: string) {
    try {
      await loescheSzenario(id);
      // Lokal aus der Liste entfernen ohne neu zu laden
      setSzenarien((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setFehler("Löschen fehlgeschlagen.");
    }
  }

  useEffect(() => {
    laden();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-400 italic">Szenarien werden geladen…</p>;
  }
  if (fehler) {
    return <p className="text-sm text-red-500">{fehler}</p>;
  }
  if (szenarien.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic">
        Noch keine Szenarien gespeichert.
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {szenarien.map((s) => (
        <div key={s.id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">{s.name}</p>
            <p className="text-xs text-slate-400">
              {new Date(s.created_at).toLocaleDateString("de-CH", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onLaden(s.inputs)}
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-1.5 rounded-md transition-colors"
            >
              Laden
            </button>
            <button
              onClick={() => loeschen(s.id)}
              className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium px-3 py-1.5 rounded-md transition-colors"
            >
              Löschen
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
