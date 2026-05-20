"use client";

import type { SimulationResult, Szenario, Kanton } from "@/types";

const SZENARIO_LABELS: Record<Szenario, string> = {
  fruehest: "Frühestmögliche Amortisation",
  spaetmoeglichst: "Spätmöglichste Amortisation",
  gestaffelt: "Gestaffelte Amortisation",
};

const SZENARIO_ERKLAERUNG: Record<Szenario, string> = {
  fruehest:
    "Die Hypotheken werden so schnell wie möglich getilgt. Damit entfallen die Hypothekarzinsen früh – die steuerlichen Abzugsmöglichkeiten sind gering, was zu einer höheren Einkommenssteuer führt. Zusätzlich steigt das steuerbare Vermögen, da die Hypothekenschulden wegfallen.",
  spaetmoeglichst:
    "Die Hypotheken bleiben möglichst lange bestehen. Die Hypothekarzinsen sind jahrelang als Abzug geltend zu machen, was das steuerbare Einkommen senkt. Zudem mindern die Schulden das steuerbare Vermögen. Dies führt zur tiefsten Gesamtsteuerbelastung.",
  gestaffelt:
    "Das Vorsorgekapital (PK, Freizügigkeit, Säule 3a) wird gestaffelt bezogen und direkt für Amortisationen verwendet. Dies ist ein Kompromiss: Die Kapitalbezugssteuern fallen an, aber die Hypothek bleibt teilweise bestehen.",
};

interface Props {
  results: SimulationResult[];
}

function fmt(n: number) {
  return `CHF ${Math.round(n).toLocaleString("de-CH")}k`;
}

export default function Empfehlung({ results }: Props) {
  if (results.length === 0) return null;

  // Sortiere nach Gesamtsteuerlast (aufsteigend = besser)
  const sortiert = [...results].sort((a, b) => a.totalSteuern - b.totalSteuern);
  const bestes = sortiert[0];
  const schlechtestes = sortiert[sortiert.length - 1];
  const ersparnis = schlechtestes.totalSteuern - bestes.totalSteuern;

  // Welches Szenario ist kantonsübergreifend am besten?
  const szenarioSummen = (["fruehest", "spaetmoeglichst", "gestaffelt"] as Szenario[]).map(
    (s) => ({
      szenario: s,
      total: results
        .filter((r) => r.szenario === s)
        .reduce((sum, r) => sum + r.totalSteuern, 0),
    })
  );
  szenarioSummen.sort((a, b) => a.total - b.total);
  const besteSzenario = szenarioSummen[0].szenario;

  // Welcher Kanton ist günstiger?
  const kantonSummen = (["Bern", "Zuerich"] as Kanton[]).map((k) => ({
    kanton: k,
    total: results
      .filter((r) => r.kanton === k)
      .reduce((sum, r) => sum + r.totalSteuern, 0),
  }));
  kantonSummen.sort((a, b) => a.total - b.total);
  const besserKanton = kantonSummen[0].kanton;
  const kantonDifferenz =
    (kantonSummen[1].total - kantonSummen[0].total) / 3; // pro Szenario ca.

  return (
    <div className="space-y-6">
      {/* Hauptempfehlung */}
      <div className="bg-green-50 border-2 border-green-400 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">✅</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-900 mb-1">
              Empfehlung: {SZENARIO_LABELS[besteSzenario]} in Kanton {besserKanton === "Zuerich" ? "Zürich" : "Bern"}
            </h3>
            <p className="text-sm text-green-800 leading-relaxed mb-4">
              {SZENARIO_ERKLAERUNG[besteSzenario]}
            </p>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-sm font-semibold text-green-900 mb-2">Warum dieses Szenario?</p>
              <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                <li>
                  Gesamtsteuereinsparung gegenüber dem schlechtesten Szenario:{" "}
                  <strong>{fmt(ersparnis)}</strong>
                </li>
                <li>
                  Kanton {besserKanton === "Zuerich" ? "Zürich" : "Bern"} ist gegenüber dem anderen Kanton im Durchschnitt um ca.{" "}
                  <strong>{fmt(Math.abs(kantonDifferenz))}</strong> günstiger
                </li>
                <li>
                  Durch das Beibehalten der Hypothek bis möglichst spät bleiben die
                  Hypothekarzinsen als Steuerabzug erhalten – der wichtigste Hebel
                </li>
                <li>
                  Nach der Pensionierung sind Abzugsmöglichkeiten ohnehin stark eingeschränkt
                  → Hypothek gibt Flexibilität und reduziert das steuerbare Vermögen
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking-Tabelle aller 6 Szenarien */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Ranking: Alle Szenarien nach Steuerbelastung (2023–2032)</h3>
          <p className="text-xs text-slate-500 mt-1">Alle Beträge in CHF 1000 | Tiefere Steuerlast = besser</p>
        </div>
        <div className="divide-y divide-slate-100">
          {sortiert.map((r, i) => {
            const isFirst = i === 0;
            const isLast = i === sortiert.length - 1;
            const diffZuBesten = r.totalSteuern - bestes.totalSteuern;
            return (
              <div
                key={`${r.kanton}-${r.szenario}`}
                className={`flex items-center gap-4 px-6 py-4 ${isFirst ? "bg-green-50" : isLast ? "bg-red-50" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isFirst
                      ? "bg-green-500 text-white"
                      : isLast
                      ? "bg-red-400 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 text-sm">
                    {r.kanton === "Zuerich" ? "Zürich" : r.kanton} — {SZENARIO_LABELS[r.szenario]}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Endvermögen: {fmt(r.endvermoegen)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{fmt(r.totalSteuern)}</div>
                  {diffZuBesten > 0 && (
                    <div className="text-xs text-red-500 mt-0.5">
                      +{fmt(diffZuBesten)} mehr
                    </div>
                  )}
                  {isFirst && (
                    <div className="text-xs text-green-600 font-semibold mt-0.5">
                      ✓ Optimal
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Erklärungskasten für alle 3 Szenarien */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["fruehest", "spaetmoeglichst", "gestaffelt"] as Szenario[]).map((s) => {
          const rank = szenarioSummen.findIndex((x) => x.szenario === s) + 1;
          const colors = {
            1: "border-green-300 bg-green-50",
            2: "border-amber-300 bg-amber-50",
            3: "border-red-300 bg-red-50",
          };
          const badges = {
            1: "bg-green-500 text-white",
            2: "bg-amber-500 text-white",
            3: "bg-red-400 text-white",
          };
          return (
            <div
              key={s}
              className={`rounded-xl border-2 p-4 ${colors[rank as 1 | 2 | 3]}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${badges[rank as 1 | 2 | 3]}`}
                >
                  Rang {rank}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {SZENARIO_LABELS[s]}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {SZENARIO_ERKLAERUNG[s]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
