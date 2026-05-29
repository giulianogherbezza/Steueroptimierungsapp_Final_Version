"use client";

// Ergebnisdarstellung der Simulation.
// Zeigt alle 6 Szenarien (2 Kantone × 3 Strategien) in verschiedenen Formaten:
//   - Empfehlung mit Ranking (Komponente Empfehlung.tsx)
//   - Gesamtsteuervergleich-Tabelle
//   - Balkendiagramm: Gesamtsteuer nach Szenario
//   - Liniendiagramm: Jährliche Steuerlast
//   - Liniendiagramm: Freies Vermögen pro Jahr
//   - Detailtabellen pro Szenario (Cashflow / Steuerdetail, umschaltbar)

import { useState } from "react";
import type { SimulationResult, Kanton, Szenario, JahresDaten } from "@/types";
import Empfehlung from "./Empfehlung";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

// Kurzbezeichnungen für die Szenario-Labels in Tabellen und Legenden
const SZENARIO_LABELS: Record<Szenario, string> = {
  fruehest:        "S1 – Frühestmöglich",
  spaetmoeglichst: "S2 – Spätmöglichst",
  gestaffelt:      "S3 – Gestaffelt",
};

// Linienfarben für die Charts: Bern = Warmtöne, Zürich = Kalttöne
const KANTON_COLORS: Record<string, string> = {
  "Bern-fruehest":        "#ef4444",
  "Bern-spaetmoeglichst": "#f97316",
  "Bern-gestaffelt":      "#eab308",
  "Zuerich-fruehest":     "#3b82f6",
  "Zuerich-spaetmoeglichst": "#8b5cf6",
  "Zuerich-gestaffelt":   "#10b981",
};

// Zahl in CHF 1000 mit Schweizer Tausendertrenner formatieren; 0 als "–"
function fmtN(n: number, dec = 1) {
  if (n === 0) return "–";
  return n.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

// Volle CHF-Zahl aus CHF-1000-Einheit: fmtCHF(569.541) → "CHF 569'541"
function fmtCHF(n: number) {
  const full = Math.round(n * 1000);
  return `CHF ${full.toLocaleString("de-CH")}`;
}

interface Props {
  results: SimulationResult[];
}

// ─── CashflowTabelle ──────────────────────────────────────────────────────────
// Haupttabelle: spiegelt die Haupttabelle aus dem Excel-Modell wider.
// Zeigt Einnahmen, Ausgaben, Sparen/Verzehr und Vermögenspositionen je Jahr.
// Letzte Zeile = Zeilensummen über alle 10 Jahre (ausser Vermögen).
function CashflowTabelle({ jahre, kanton }: { jahre: JahresDaten[]; kanton: Kanton }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs whitespace-nowrap">
        <thead>
          <tr className="bg-slate-100">
            <th className="text-left px-3 py-2 text-slate-500 font-medium" rowSpan={2}>Jahr</th>
            <th className="text-center px-3 py-2 text-blue-700 font-semibold border-l border-slate-200" colSpan={5}>
              Einnahmen (CHF 1000)
            </th>
            <th className="text-center px-3 py-2 text-red-700 font-semibold border-l border-slate-200" colSpan={7}>
              Ausgaben (CHF 1000)
            </th>
            <th className="text-center px-3 py-2 text-slate-600 font-semibold border-l border-slate-200" colSpan={1}>
              &nbsp;
            </th>
            <th className="text-center px-3 py-2 text-green-700 font-semibold border-l border-slate-200" colSpan={2}>
              Freies Vermögen
            </th>
            <th className="text-center px-3 py-2 text-amber-700 font-semibold border-l border-slate-200" colSpan={2}>
              Festes Vermögen
            </th>
          </tr>
          <tr className="bg-slate-50 text-slate-600">
            <th className="text-right px-3 py-1.5 font-medium border-l border-slate-200">Lohn Herr</th>
            <th className="text-right px-3 py-1.5 font-medium">Lohn Frau</th>
            <th className="text-right px-3 py-1.5 font-medium">AHV</th>
            <th className="text-right px-3 py-1.5 font-medium">PK Rente</th>
            <th className="text-right px-3 py-1.5 font-medium font-semibold text-blue-800">Total</th>
            <th className="text-right px-3 py-1.5 font-medium border-l border-slate-200">Lebenshalt.</th>
            <th className="text-right px-3 py-1.5 font-medium">Hypo-Zinsen</th>
            <th className="text-right px-3 py-1.5 font-medium">Unterhalt</th>
            <th className="text-right px-3 py-1.5 font-medium">Amortisation</th>
            <th className="text-right px-3 py-1.5 font-medium">Säule 3a</th>
            <th className="text-right px-3 py-1.5 font-medium">Steuern</th>
            <th className="text-right px-3 py-1.5 font-medium font-semibold text-red-800">Total</th>
            <th className="text-right px-3 py-1.5 font-medium border-l border-slate-200 text-slate-700">
              Sparen/<br/>Verzehr
            </th>
            {/* Freies Vermögen: Anlagevermögen (reines Portfolio) + Freies Total (inkl. 100k Reserve) */}
            <th className="text-right px-3 py-1.5 font-medium border-l border-slate-200">Anlageverm.</th>
            <th className="text-right px-3 py-1.5 font-medium font-semibold text-green-800">Freies Total</th>
            <th className="text-right px-3 py-1.5 font-medium border-l border-slate-200">Liegenschaft</th>
            <th className="text-right px-3 py-1.5 font-medium text-amber-700">- Hypotheken</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jahre.map((j) => {
            const festes = j.liegenschaft - j.hypothekenTotal; // Nettowert Liegenschaft
            return (
              <tr key={j.jahr} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-semibold text-slate-800">{j.jahr}</td>
                <td className="px-3 py-2 text-right text-slate-600 border-l border-slate-100">{fmtN(j.einkommenHerr)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmtN(j.einkommenFrau)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmtN(j.ahvRente)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmtN(j.pkRenteHerr)}</td>
                <td className="px-3 py-2 text-right font-semibold text-blue-800">{fmtN(j.totalEinnahmen)}</td>
                <td className="px-3 py-2 text-right text-slate-600 border-l border-slate-100">{fmtN(j.lebenshaltungskosten)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmtN(j.hypothekarzinsen)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmtN(j.unterhaltskosten)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmtN(j.amortisationen)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmtN(j.saeule3aBeitraege)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{fmtN(j.steuern)}</td>
                <td className="px-3 py-2 text-right font-semibold text-red-800">{fmtN(j.totalAusgaben)}</td>
                {/* Grün = gespart, Rot = Vermögensverzehr */}
                <td className={`px-3 py-2 text-right font-semibold border-l border-slate-100 ${j.sparenVerzehr >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {j.sparenVerzehr >= 0 ? "+" : ""}{fmtN(j.sparenVerzehr)}
                </td>
                <td className="px-3 py-2 text-right text-slate-700 border-l border-slate-100">{fmtN(j.anlagevermoegen, 0)}</td>
                <td className="px-3 py-2 text-right font-semibold text-green-800">{fmtN(j.totalFreiesVermoegen, 0)}</td>
                <td className="px-3 py-2 text-right text-slate-600 border-l border-slate-100">{fmtN(j.liegenschaft, 0)}</td>
                <td className="px-3 py-2 text-right text-amber-700">{fmtN(festes, 0)}</td>
              </tr>
            );
          })}
        </tbody>
        {/* Summenzeile über alle 10 Jahre */}
        <tfoot>
          <tr className="bg-slate-50 border-t-2 border-slate-300 font-semibold">
            <td className="px-3 py-2 text-slate-700">Total</td>
            <td className="px-3 py-2 text-right text-blue-800 border-l border-slate-100">{fmtN(jahre.reduce((s, j) => s + j.einkommenHerr, 0))}</td>
            <td className="px-3 py-2 text-right text-blue-800">{fmtN(jahre.reduce((s, j) => s + j.einkommenFrau, 0))}</td>
            <td className="px-3 py-2 text-right text-blue-800">{fmtN(jahre.reduce((s, j) => s + j.ahvRente, 0))}</td>
            <td className="px-3 py-2 text-right text-blue-800">{fmtN(jahre.reduce((s, j) => s + j.pkRenteHerr, 0))}</td>
            <td className="px-3 py-2 text-right text-blue-900">{fmtN(jahre.reduce((s, j) => s + j.totalEinnahmen, 0))}</td>
            <td className="px-3 py-2 text-right text-red-800 border-l border-slate-100">{fmtN(jahre.reduce((s, j) => s + j.lebenshaltungskosten, 0))}</td>
            <td className="px-3 py-2 text-right text-red-800">{fmtN(jahre.reduce((s, j) => s + j.hypothekarzinsen, 0))}</td>
            <td className="px-3 py-2 text-right text-red-800">{fmtN(jahre.reduce((s, j) => s + j.unterhaltskosten, 0))}</td>
            <td className="px-3 py-2 text-right text-red-800">{fmtN(jahre.reduce((s, j) => s + j.amortisationen, 0))}</td>
            <td className="px-3 py-2 text-right text-red-800">{fmtN(jahre.reduce((s, j) => s + j.saeule3aBeitraege, 0))}</td>
            <td className="px-3 py-2 text-right text-red-800">{fmtN(jahre.reduce((s, j) => s + j.steuern, 0))}</td>
            <td className="px-3 py-2 text-right text-red-900">{fmtN(jahre.reduce((s, j) => s + j.totalAusgaben, 0))}</td>
            <td colSpan={4} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── SteuerDetailTabelle ──────────────────────────────────────────────────────
// Entspricht der gelben Hilfstabelle im Excel.
// Zeigt steuerbares Einkommen / Vermögen sowie Einkommens- und Vermögenssteuern
// je Jahr, mit Summenzeile. Kapitalauszahlungssteuern sind hier nicht enthalten.
function SteuerDetailTabelle({ jahre }: { jahre: JahresDaten[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs whitespace-nowrap">
        <thead>
          <tr className="bg-yellow-50">
            <th className="text-left px-3 py-2 text-slate-600 font-medium">Jahr</th>
            <th className="text-right px-3 py-2 text-slate-600 font-medium">Steuerbares Einkommen</th>
            <th className="text-right px-3 py-2 text-slate-600 font-medium">Steuerbares Vermögen</th>
            <th className="text-right px-3 py-2 text-slate-600 font-medium">Einkommenssteuer</th>
            <th className="text-right px-3 py-2 text-slate-600 font-medium">Vermögenssteuer</th>
            <th className="text-right px-3 py-2 text-slate-700 font-semibold">Total Steuern</th>
          </tr>
          <tr className="bg-yellow-50 border-b border-slate-200">
            <td className="px-3 py-1 text-xs text-slate-400 italic" colSpan={6}>Alle Beträge in CHF 1000</td>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jahre.map((j) => (
            <tr key={j.jahr} className="hover:bg-yellow-50">
              <td className="px-3 py-2 font-semibold text-slate-800">{j.jahr}</td>
              <td className="px-3 py-2 text-right text-slate-700">{fmtN(j.steuerbaresEinkommen)}</td>
              <td className="px-3 py-2 text-right text-slate-700">{fmtN(j.steuerbaresVermoegen, 0)}</td>
              <td className="px-3 py-2 text-right text-slate-700">{fmtN(j.einkommenssteuer)}</td>
              <td className="px-3 py-2 text-right text-slate-700">{fmtN(j.vermoegenssteuer)}</td>
              <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmtN(j.steuern)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-yellow-50 border-t-2 border-slate-300 font-semibold text-slate-800">
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right">{fmtN(jahre.reduce((s, j) => s + j.einkommenssteuer, 0))}</td>
            <td className="px-3 py-2 text-right">{fmtN(jahre.reduce((s, j) => s + j.vermoegenssteuer, 0))}</td>
            <td className="px-3 py-2 text-right text-slate-900">{fmtN(jahre.reduce((s, j) => s + j.steuern, 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── SzenarioPanel ────────────────────────────────────────────────────────────
// Einzelnes aufklappbares Panel pro Szenario.
// Tab-Umschaltung zwischen Cashflow-Tabelle und Steuerdetail-Tabelle.
function SzenarioPanel({ r }: { r: SimulationResult }) {
  const [tabAktiv, setTabAktiv] = useState<"cashflow" | "steuern">("cashflow");

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Panel-Kopf mit Gesamtsteuer und Anlagevermögen als Kurzübersicht */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">
            {r.kanton === "Zuerich" ? "Zürich" : r.kanton} – {SZENARIO_LABELS[r.szenario]}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Gesamtsteuer 2023–2032:{" "}
            <strong className="text-slate-700">{fmtCHF(r.totalSteuern)}</strong>
            {" | "}Anlagevermögen Ende 2032:{" "}
            {/* −100 entfernt die Sicherheitsreserve (CHF 100k) → reines Portfolio wie in Excel */}
            <strong className="text-slate-700">{fmtCHF(r.endvermoegen - 100)}</strong>
            <span className="text-slate-400 ml-1">(ohne Liquiditätsreserve)</span>
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
          <button
            onClick={() => setTabAktiv("cashflow")}
            className={`px-3 py-1.5 font-medium transition-colors ${tabAktiv === "cashflow" ? "bg-slate-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            Einnahmen / Ausgaben / Vermögen
          </button>
          <button
            onClick={() => setTabAktiv("steuern")}
            className={`px-3 py-1.5 font-medium transition-colors border-l border-slate-200 ${tabAktiv === "steuern" ? "bg-yellow-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            Steuerdetail
          </button>
        </div>
      </div>

      {tabAktiv === "cashflow" ? (
        <>
          <div className="px-4 pt-2 pb-1 bg-slate-50 border-b border-slate-100">
            <p className="text-xs text-slate-400">
              Beträge in CHF 1000 (Endwerte per 31. Dezember jedes Jahres) |
              Sparen: positiv = Einnahmen übersteigen Ausgaben | Freies Vermögen = Liquiditätsreserve + Anlagevermögen |
              Festes Vermögen netto = Liegenschaftswert minus ausstehende Hypotheken
            </p>
          </div>
          <CashflowTabelle jahre={r.jahre} kanton={r.kanton} />
        </>
      ) : (
        <>
          <div className="px-4 pt-2 pb-1 bg-yellow-50 border-b border-slate-100">
            <p className="text-xs text-yellow-700">
              Hilfstabelle Steuern (entspricht der gelben Hilfstabelle im Excel) |
              Steuerbares Einkommen = Einnahmen + Wertschriftenerträge (1.5%) + Eigenmietwert − alle Abzüge |
              Steuerbares Vermögen = Aktiven + Liegenschaftssteuerwert − Hypotheken − steuerfreier Betrag |
              Kapitalauszahlungssteuern sind separat erfasst und nicht in dieser Tabelle
            </p>
          </div>
          <SteuerDetailTabelle jahre={r.jahre} />
        </>
      )}
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function SimulationResults({ results }: Props) {
  const kantone:   Kanton[]   = ["Bern", "Zuerich"];
  const szenarien: Szenario[] = ["fruehest", "spaetmoeglichst", "gestaffelt"];

  // Hilfsfunktion: Ergebnis für eine bestimmte Kanton/Szenario-Kombination finden
  const getResult = (k: Kanton, s: Szenario) =>
    results.find((r) => r.kanton === k && r.szenario === s);

  // Chart-Daten aufbereiten: ein Eintrag pro Jahr, Schlüssel = "Kanton-Szenario"
  const chartDataSteuern = Array.from({ length: 10 }, (_, i) => {
    const jahr = 2023 + i;
    const row: Record<string, number | string> = { jahr };
    results.forEach((r) => {
      const key = `${r.kanton}-${r.szenario}`;
      const j = r.jahre.find((j) => j.jahr === jahr);
      if (j) row[key] = Math.round(j.steuern);
    });
    return row;
  });

  const chartDataVermoegen = Array.from({ length: 10 }, (_, i) => {
    const jahr = 2023 + i;
    const row: Record<string, number | string> = { jahr };
    results.forEach((r) => {
      const key = `${r.kanton}-${r.szenario}`;
      const j = r.jahre.find((j) => j.jahr === jahr);
      if (j) row[key] = Math.round(j.totalVermoegen);
    });
    return row;
  });

  // Gesamtsteuer für BarChart (ein Balken pro Szenario, zwei Farben für Kantone)
  const barData = szenarien.map((s) => ({
    name: SZENARIO_LABELS[s],
    Bern:    Math.round(getResult("Bern",    s)?.totalSteuern ?? 0),
    Zuerich: Math.round(getResult("Zuerich", s)?.totalSteuern ?? 0),
  }));

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-900">Simulationsergebnisse</h2>

      {/* Empfehlung mit Ranking aller 6 Szenarien */}
      <Empfehlung results={results} />

      {/* ── Gesamtsteuervergleich-Tabelle ─────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Gesamtsteuervergleich 2023–2032</h3>
          <p className="text-xs text-slate-500 mt-1">
            Kumulierte Einkommens- und Vermögenssteuern pro Szenario | Beträge in CHF (gerundet)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Szenario</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium">Kanton Bern</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium">Kanton Zürich</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium">Differenz Bern − Zürich</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {szenarien.map((s) => {
                const bern    = getResult("Bern",    s);
                const zuerich = getResult("Zuerich", s);
                const diff    = (bern?.totalSteuern ?? 0) - (zuerich?.totalSteuern ?? 0);
                return (
                  <tr key={s} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{SZENARIO_LABELS[s]}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtCHF(bern?.totalSteuern ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtCHF(zuerich?.totalSteuern ?? 0)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${diff > 0 ? "text-red-600" : "text-green-600"}`}>
                      {diff > 0 ? "+" : ""}{fmtCHF(diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Balkendiagramm: Gesamtsteuer nach Szenario ────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-1">Gesamtsteuerbelastung nach Szenario und Kanton</h3>
        <p className="text-xs text-slate-500 mb-6">Kumulierte Einkommens- und Vermögenssteuern 2023–2032, in CHF 1000</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v}k`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`CHF ${(Number(v) * 1000).toLocaleString("de-CH")}`, ""]} />
            <Legend />
            <Bar dataKey="Bern"    fill="#ef4444" name="Kanton Bern" />
            <Bar dataKey="Zuerich" fill="#3b82f6" name="Kanton Zürich" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Liniendiagramm: Jährliche Steuerlast ──────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-1">Jährliche Steuerlast – alle Szenarien</h3>
        <p className="text-xs text-slate-500 mb-6">Einkommens- und Vermögenssteuern pro Jahr, in CHF 1000</p>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartDataSteuern}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="jahr" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v}k`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`CHF ${(Number(v) * 1000).toLocaleString("de-CH")}`, ""]} />
            <Legend />
            {results.map((r) => {
              const key = `${r.kanton}-${r.szenario}`;
              return (
                <Line key={key} type="monotone" dataKey={key}
                  stroke={KANTON_COLORS[key]}
                  name={`${r.kanton === "Zuerich" ? "Zürich" : r.kanton} ${SZENARIO_LABELS[r.szenario]}`}
                  strokeWidth={2} dot={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Liniendiagramm: Freies Vermögen ───────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-1">Freies Anlagevermögen pro Jahr</h3>
        <p className="text-xs text-slate-500 mb-6">
          Liquiditätsreserve (CHF 100k) + ETF-Portfolio, in CHF 1000 — nicht enthalten: Liegenschaft, Vorsorgegelder
        </p>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartDataVermoegen}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="jahr" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v}k`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`CHF ${(Number(v) * 1000).toLocaleString("de-CH")}`, ""]} />
            <Legend />
            {results.map((r) => {
              const key = `${r.kanton}-${r.szenario}`;
              return (
                <Line key={key} type="monotone" dataKey={key}
                  stroke={KANTON_COLORS[key]}
                  name={`${r.kanton === "Zuerich" ? "Zürich" : r.kanton} ${SZENARIO_LABELS[r.szenario]}`}
                  strokeWidth={2} dot={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Detailtabellen pro Szenario ────────────────────────────── */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Detailansicht: Jahrestabellen pro Szenario</h3>
        <p className="text-sm text-slate-500 mb-4">
          Entspricht der Haupttabelle und der Hilfstabelle Steuern aus dem Excel. Kanton wählen und zwischen
          Cashflow-Ansicht und Steuerdetail umschalten.
        </p>
      </div>

      {/* Szenarien gruppiert nach Kanton */}
      {kantone.map((k) => (
        <div key={k} className="space-y-4">
          <h4 className="text-base font-semibold text-slate-700 border-b border-slate-200 pb-2">
            Kanton {k === "Zuerich" ? "Zürich" : k}
          </h4>
          {szenarien.map((s) => {
            const r = getResult(k, s);
            return r ? <SzenarioPanel key={`${k}-${s}`} r={r} /> : null;
          })}
        </div>
      ))}
    </div>
  );
}
