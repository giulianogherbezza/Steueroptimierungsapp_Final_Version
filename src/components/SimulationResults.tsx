"use client";

import type { SimulationResult, Kanton, Szenario } from "@/types";
import Empfehlung from "./Empfehlung";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const SZENARIO_LABELS: Record<Szenario, string> = {
  fruehest: "S1 – Frühest",
  spaetmoeglichst: "S2 – Spätestmöglich",
  gestaffelt: "S3 – Gestaffelt",
};

const KANTON_COLORS: Record<string, string> = {
  "Bern-fruehest": "#ef4444",
  "Bern-spaetmoeglichst": "#f97316",
  "Bern-gestaffelt": "#eab308",
  "Zuerich-fruehest": "#3b82f6",
  "Zuerich-spaetmoeglichst": "#8b5cf6",
  "Zuerich-gestaffelt": "#10b981",
};

function fmt(n: number) {
  return `CHF ${n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, "'")}k`;
}

interface Props {
  results: SimulationResult[];
}

export default function SimulationResults({ results }: Props) {
  // Vergleichstabelle Total Steuern
  const kantone: Kanton[] = ["Bern", "Zuerich"];
  const szenarien: Szenario[] = ["fruehest", "spaetmoeglichst", "gestaffelt"];

  const getResult = (k: Kanton, s: Szenario) =>
    results.find((r) => r.kanton === k && r.szenario === s);

  // Chart-Daten: Steuern pro Jahr, alle Szenarien
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

  // Chart-Daten: Gesamtvermögen pro Jahr
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

  // Vergleichs-BarChart Daten
  const barData = szenarien.map((s) => ({
    name: SZENARIO_LABELS[s],
    Bern: Math.round(getResult("Bern", s)?.totalSteuern ?? 0),
    Zuerich: Math.round(getResult("Zuerich", s)?.totalSteuern ?? 0),
  }));

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-900">Simulationsergebnisse</h2>

      {/* Empfehlung ganz oben */}
      <Empfehlung results={results} />

      {/* Vergleichstabelle */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Gesamtsteuerbelastung 2023–2032 (CHF in 1000)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Szenario</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium">Kanton Bern</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium">Kanton Zürich</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium">Differenz (B–Z)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {szenarien.map((s) => {
                const bern = getResult("Bern", s);
                const zuerich = getResult("Zuerich", s);
                const diff = (bern?.totalSteuern ?? 0) - (zuerich?.totalSteuern ?? 0);
                return (
                  <tr key={s} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{SZENARIO_LABELS[s]}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(bern?.totalSteuern ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(zuerich?.totalSteuern ?? 0)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${diff > 0 ? "text-red-600" : "text-green-600"}`}>
                      {diff > 0 ? "+" : ""}{fmt(diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar Chart Gesamtsteuer */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-6">Gesamtsteuerbelastung nach Szenario und Kanton</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v}k`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`CHF ${Number(v)}k`, ""]} />
            <Legend />
            <Bar dataKey="Bern" fill="#ef4444" name="Kanton Bern" />
            <Bar dataKey="Zuerich" fill="#3b82f6" name="Kanton Zürich" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart Steuern pro Jahr */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-6">Steuerlast pro Jahr – alle Szenarien</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartDataSteuern}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="jahr" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v}k`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`CHF ${Number(v)}k`, ""]} />
            <Legend />
            {results.map((r) => {
              const key = `${r.kanton}-${r.szenario}`;
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={KANTON_COLORS[key]}
                  name={`${r.kanton} ${SZENARIO_LABELS[r.szenario]}`}
                  strokeWidth={2}
                  dot={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart Gesamtvermögen */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-6">Gesamtvermögen pro Jahr</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartDataVermoegen}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="jahr" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v}k`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`CHF ${Number(v)}k`, ""]} />
            <Legend />
            {results.map((r) => {
              const key = `${r.kanton}-${r.szenario}`;
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={KANTON_COLORS[key]}
                  name={`${r.kanton} ${SZENARIO_LABELS[r.szenario]}`}
                  strokeWidth={2}
                  dot={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailtabelle pro Szenario */}
      {results.slice(0, 3).map((r) => (
        <div key={`${r.kanton}-${r.szenario}`} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-900">
              {r.kanton} – {SZENARIO_LABELS[r.szenario]}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-600">Jahr</th>
                  <th className="text-right px-3 py-2 text-slate-600">Einnahmen</th>
                  <th className="text-right px-3 py-2 text-slate-600">Ausgaben</th>
                  <th className="text-right px-3 py-2 text-slate-600">Sparen</th>
                  <th className="text-right px-3 py-2 text-slate-600">Steuern</th>
                  <th className="text-right px-3 py-2 text-slate-600">Anlagevermögen</th>
                  <th className="text-right px-3 py-2 text-slate-600">Total Vermögen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {r.jahre.map((j) => (
                  <tr key={j.jahr} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{j.jahr}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{j.totalEinnahmen.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{j.totalAusgaben.toFixed(1)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${j.sparenVerzehr >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {j.sparenVerzehr.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">{j.steuern.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{j.anlagevermoegen.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-800">{j.totalVermoegen.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
