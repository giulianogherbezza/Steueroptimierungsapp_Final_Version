"use client";

// Formular zur Eingabe aller Simulationsdaten.
// Wird auf drei Seiten verwendet: /simulation, /onboarding und /konto.
// Der buttonLabel-Prop erlaubt es, die Beschriftung des Abschicken-Buttons
// je nach Kontext anzupassen (Standard: "Simulation berechnen").

import type { SimulationInputs } from "@/types";
import { useState } from "react";

type Inputs = Omit<SimulationInputs, "kanton" | "szenario">;

interface Props {
  initialInputs: Inputs;
  onSimulate: (inputs: Inputs) => void;
  loading: boolean;
  buttonLabel?: string;
}

// Wiederverwendbares Eingabefeld mit Label und optionaler Einheitenangabe
function InputField({
  label,
  value,
  onChange,
  suffix = "CHF (in 1000)",
  type = "number",
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  suffix?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {suffix && <span className="text-xs text-slate-400 whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

export default function SimulationForm({ initialInputs, onSimulate, loading, buttonLabel }: Props) {
  const [inputs, setInputs] = useState(initialInputs);

  // Generische Update-Funktion für alle Sektionen und Felder.
  // Datum- und Verfall-Felder bleiben als String, alles andere wird in eine Zahl konvertiert.
  function update<T extends keyof Inputs>(section: T, field: keyof Inputs[T], value: string) {
    setInputs((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: field.toString().includes("datum") || field.toString().includes("Verfall")
          ? value
          : parseFloat(value) || 0,
      },
    }));
  }

  return (
    <div className="space-y-6">

      {/* ── Persönliche Daten ──────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded text-xs flex items-center justify-center font-bold">P</span>
          Persönliche Daten
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label="Geburtsdatum Herr" value={inputs.personal.geburtsdatumHerr}
            onChange={(v) => update("personal", "geburtsdatumHerr", v)} suffix="" type="date" />
          <InputField label="Geburtsdatum Frau" value={inputs.personal.geburtsdatumFrau}
            onChange={(v) => update("personal", "geburtsdatumFrau", v)} suffix="" type="date" />
          <InputField label="Nettoeinkommen Total" value={inputs.personal.einkommenTotal}
            onChange={(v) => update("personal", "einkommenTotal", v)} />
          <InputField label="Anzahl Kinder" value={inputs.personal.kinderAnzahl}
            onChange={(v) => update("personal", "kinderAnzahl", v)} suffix="Kinder" />
          <InputField label="Kinder studieren noch (Jahre)" value={inputs.personal.kinderStudierenJahre}
            onChange={(v) => update("personal", "kinderStudierenJahre", v)} suffix="Jahre" />
        </div>
      </section>

      {/* ── Vorsorge ───────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-green-100 text-green-700 rounded text-xs flex items-center justify-center font-bold">V</span>
          Vorsorge (CHF in 1000)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField label="PK Herr"       value={inputs.vorsorge.pkHerr}             onChange={(v) => update("vorsorge", "pkHerr", v)} />
          <InputField label="PK Frau"       value={inputs.vorsorge.pkFrau}             onChange={(v) => update("vorsorge", "pkFrau", v)} />
          <InputField label="FZ 1 Herr"     value={inputs.vorsorge.freizuegigkeit1Herr} onChange={(v) => update("vorsorge", "freizuegigkeit1Herr", v)} />
          <InputField label="FZ 2 Herr"     value={inputs.vorsorge.freizuegigkeit2Herr} onChange={(v) => update("vorsorge", "freizuegigkeit2Herr", v)} />
          <InputField label="3a I Herr"     value={inputs.vorsorge.saeule3aHerr1}      onChange={(v) => update("vorsorge", "saeule3aHerr1", v)} />
          <InputField label="3a II Herr"    value={inputs.vorsorge.saeule3aHerr2}      onChange={(v) => update("vorsorge", "saeule3aHerr2", v)} />
          <InputField label="3a I Frau"     value={inputs.vorsorge.saeule3aFrau1}      onChange={(v) => update("vorsorge", "saeule3aFrau1", v)} />
          <InputField label="3a II Frau"    value={inputs.vorsorge.saeule3aFrau2}      onChange={(v) => update("vorsorge", "saeule3aFrau2", v)} />
          <InputField label="3a III Frau"   value={inputs.vorsorge.saeule3aFrau3}      onChange={(v) => update("vorsorge", "saeule3aFrau3", v)} />
          <InputField label="Lebensversicherung" value={inputs.vorsorge.lebensversicherungBetrag}
            onChange={(v) => update("vorsorge", "lebensversicherungBetrag", v)} />
        </div>
      </section>

      {/* ── Liquidität & Anlagen ───────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded text-xs flex items-center justify-center font-bold">L</span>
          Liquidität &amp; Anlagen (CHF in 1000)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField label="Liquidität Herr"  value={inputs.liquiditaet.liquiditaetHerr} onChange={(v) => update("liquiditaet", "liquiditaetHerr", v)} />
          <InputField label="Liquidität Frau"  value={inputs.liquiditaet.liquiditaetFrau} onChange={(v) => update("liquiditaet", "liquiditaetFrau", v)} />
          <InputField label="ETF-Anlagen Herr" value={inputs.liquiditaet.etfHerr}         onChange={(v) => update("liquiditaet", "etfHerr", v)} />
          <InputField label="ETF-Anlagen Frau" value={inputs.liquiditaet.etfFrau}         onChange={(v) => update("liquiditaet", "etfFrau", v)} />
        </div>
      </section>

      {/* ── Liegenschaft & Hypotheken ─────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-slate-200 text-slate-700 rounded text-xs flex items-center justify-center font-bold">H</span>
          Liegenschaft &amp; Hypotheken (CHF in 1000)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField label="Verkehrswert"  value={inputs.liegenschaft.verkehrswert}  onChange={(v) => update("liegenschaft", "verkehrswert", v)} />
          <InputField label="Steuerwert"    value={inputs.liegenschaft.steuerwert}    onChange={(v) => update("liegenschaft", "steuerwert", v)} />
          <InputField label="Eigenmietwert" value={inputs.liegenschaft.eigenmietwert} onChange={(v) => update("liegenschaft", "eigenmietwert", v)} />
        </div>

        {/* Hypotheken: eine Tabellenzeile pro Tranche mit Betrag, Verfall und Zinssätzen */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-y-2">
            <thead>
              <tr className="text-xs text-slate-500 text-left">
                <th className="font-medium pb-1 pr-3">Hypothek</th>
                <th className="font-medium pb-1 pr-3">Betrag (CHF in 1000)</th>
                <th className="font-medium pb-1 pr-3">Verfall</th>
                <th className="font-medium pb-1 pr-3">Zinssatz alt</th>
                <th className="font-medium pb-1">Zinssatz neu</th>
              </tr>
            </thead>
            <tbody>
              {([1, 2, 3] as const).map((n) => {
                const hKey    = `hypothek${n}`            as const;
                const vKey    = `hypothek${n}Verfall`     as const;
                const zAltKey = `hypothek${n}ZinsSatzAlt` as const;
                const zNeuKey = `hypothek${n}ZinsSatzNeu` as const;
                return (
                  <tr key={n} className="align-top">
                    <td className="pr-3 pt-1.5 text-slate-600 font-medium whitespace-nowrap">Hypothek {n}</td>
                    <td className="pr-3">
                      <input type="number" value={inputs.liegenschaft[hKey]}
                        onChange={(e) => update("liegenschaft", hKey, e.target.value)}
                        className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="pr-3">
                      <input type="date" value={inputs.liegenschaft[vKey]}
                        onChange={(e) => update("liegenschaft", vKey, e.target.value)}
                        className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="pr-3">
                      <input type="number" value={inputs.liegenschaft[zAltKey]}
                        onChange={(e) => update("liegenschaft", zAltKey, e.target.value)}
                        placeholder="0.0064"
                        className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td>
                      <input type="number" value={inputs.liegenschaft[zNeuKey]}
                        onChange={(e) => update("liegenschaft", zNeuKey, e.target.value)}
                        placeholder="0.03"
                        className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={() => onSimulate(inputs)}
          disabled={loading}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Berechnung läuft…" : (buttonLabel ?? "Simulation berechnen")}
        </button>
      </div>
    </div>
  );
}
