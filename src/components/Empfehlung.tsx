"use client";

// Empfehlungskomponente: analysiert alle 6 Simulationsergebnisse und leitet
// die steuerlich optimale Strategie ab.
//
// Aufbau:
//   1. Hauptempfehlung: bestes Szenario + bester Kanton (farblich hervorgehoben)
//   2. Ranking-Tabelle: alle 6 Szenarien sortiert nach Gesamtsteuerlast
//   3. Erklärungskasten: Rang jeder der 3 Strategien mit kurzer Begründung

import type { SimulationResult, Szenario, Kanton } from "@/types";

const SZENARIO_LABELS: Record<Szenario, string> = {
  fruehest:        "Frühestmögliche Amortisation",
  spaetmoeglichst: "Spätmöglichste Amortisation",
  gestaffelt:      "Gestaffelte Amortisation",
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

// Volle CHF-Zahl aus CHF-1000-Einheit: fmtCHF(569.541) → "CHF 569'541"
function fmtCHF(n: number) {
  const full = Math.round(n * 1000);
  return `CHF ${full.toLocaleString("de-CH")}`;
}

export default function Empfehlung({ results }: Props) {
  if (results.length === 0) return null;

  // Rangliste nach aufsteigender Gesamtsteuerlast
  const sortiert = [...results].sort((a, b) => a.totalSteuern - b.totalSteuern);
  const bestes       = sortiert[0];
  const schlechtestes = sortiert[sortiert.length - 1];
  const ersparnis    = schlechtestes.totalSteuern - bestes.totalSteuern;

  // Welches Szenario ist kantonsübergreifend am günstigsten?
  const szenarioSummen = (["fruehest", "spaetmoeglichst", "gestaffelt"] as Szenario[]).map((s) => ({
    szenario: s,
    total: results.filter((r) => r.szenario === s).reduce((sum, r) => sum + r.totalSteuern, 0),
  }));
  szenarioSummen.sort((a, b) => a.total - b.total);
  const besteSzenario = szenarioSummen[0].szenario;

  // Welcher Kanton ist insgesamt günstiger?
  const kantonSummen = (["Bern", "Zuerich"] as Kanton[]).map((k) => ({
    kanton: k,
    total: results.filter((r) => r.kanton === k).reduce((sum, r) => sum + r.totalSteuern, 0),
  }));
  kantonSummen.sort((a, b) => a.total - b.total);
  const besserKanton   = kantonSummen[0].kanton;
  // Durchschnittliche Ersparnis pro Szenario (3 Szenarien je Kanton)
  const kantonDifferenz = (kantonSummen[1].total - kantonSummen[0].total) / 3;

  return (
    <div className="space-y-6">

      {/* ── Hauptempfehlung ───────────────────────────────────────── */}
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
                  Steuerersparnis gegenüber dem ungünstigsten Szenario (kumuliert 2023–2032):{" "}
                  <strong>{fmtCHF(ersparnis)}</strong>
                </li>
                <li>
                  Kanton {besserKanton === "Zuerich" ? "Zürich" : "Bern"} ist gegenüber dem anderen Kanton
                  im Schnitt um ca. <strong>{fmtCHF(Math.abs(kantonDifferenz))}</strong> günstiger pro Szenario
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

      {/* ── Ranking-Tabelle ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Ranking: Alle Szenarien nach Steuerbelastung (2023–2032)</h3>
          <p className="text-xs text-slate-500 mt-1">
            Gesamte Einkommens- und Vermögenssteuern kumuliert über 10 Jahre — tiefere Steuerbelastung = finanziell besser
          </p>
        </div>

        {/* Legende der drei Spalten */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-3 gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">Gesamtsteuer</span><br />
            Kumulierte Einkommens- und Vermögenssteuern 2023–2032 (ohne Kapitalauszahlungssteuern)
          </div>
          <div>
            <span className="font-semibold text-slate-700">Anlagevermögen (Ende 2032)</span><br />
            Reines ETF-Portfolio per 31.12.2032, ohne Liquiditätsreserve (CHF 100k). Nicht enthalten: Liegenschaft, noch ausstehende Vorsorgegelder.
          </div>
          <div>
            <span className="font-semibold text-slate-700">Differenz</span><br />
            Mehrbetrag Steuern gegenüber dem steuerlich optimalen Szenario (Rang 1)
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {sortiert.map((r, i) => {
            const isFirst = i === 0;
            const isLast  = i === sortiert.length - 1;
            const diffZuBesten = r.totalSteuern - bestes.totalSteuern;
            return (
              <div
                key={`${r.kanton}-${r.szenario}`}
                className={`flex items-start gap-4 px-6 py-4 ${isFirst ? "bg-green-50" : isLast ? "bg-red-50" : ""}`}
              >
                {/* Rang-Badge: grün für Platz 1, rot für letzten Platz */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${
                  isFirst ? "bg-green-500 text-white" : isLast ? "bg-red-400 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 text-sm">
                    {r.kanton === "Zuerich" ? "Zürich" : r.kanton} — {SZENARIO_LABELS[r.szenario]}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {/* −100 entfernt die CHF 100k Sicherheitsreserve → reines Anlagevermögen wie in Excel */}
                    Anlagevermögen Ende 2032: <span className="font-medium text-slate-700">{fmtCHF(r.endvermoegen - 100)}</span>
                    <span className="ml-1 text-slate-400">(reines ETF-Portfolio, ohne Liquiditätsreserve)</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-slate-900 text-base">{fmtCHF(r.totalSteuern)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Gesamtsteuer 2023–2032</div>
                  {diffZuBesten > 0 && (
                    <div className="text-xs text-red-500 mt-0.5 font-medium">
                      +{fmtCHF(diffZuBesten)} mehr Steuern als Rang 1
                    </div>
                  )}
                  {isFirst && (
                    <div className="text-xs text-green-600 font-semibold mt-0.5">
                      ✓ Steuerlich optimal
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Hinweis: Die Kapitalauszahlungssteuern (auf PK, Freizügigkeit, Säule 3a) sind separat berücksichtigt und reduzieren das Anlagevermögen, sind aber nicht in der obigen Gesamtsteuer enthalten. Das Anlagevermögen entspricht dem reinen ETF-Portfolio; die Liquiditätsreserve von CHF 100k ist separat gehalten (sichtbar im «Freies Total» der Detailansicht).
          </p>
        </div>
      </div>

      {/* ── Erklärungsboxen für alle 3 Strategien ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["fruehest", "spaetmoeglichst", "gestaffelt"] as Szenario[]).map((s) => {
          const rank = szenarioSummen.findIndex((x) => x.szenario === s) + 1;
          const colors = { 1: "border-green-300 bg-green-50", 2: "border-amber-300 bg-amber-50", 3: "border-red-300 bg-red-50" };
          const badges = { 1: "bg-green-500 text-white",      2: "bg-amber-500 text-white",      3: "bg-red-400 text-white" };
          return (
            <div key={s} className={`rounded-xl border-2 p-4 ${colors[rank as 1 | 2 | 3]}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${badges[rank as 1 | 2 | 3]}`}>
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
