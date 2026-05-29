// Steuerberechnungs-Funktionen für Bern und Zürich.
//
// Die Steuertabellen liegen als diskrete Wertepaare vor (steuerbares Einkommen → Steuer).
// Da die Tabelle für Zürich Einkommenssteuern Lücken enthält (z. B. fehlen die Einträge
// für 147–160 und 176–239 kCHF), wird zwischen den bekannten Stützpunkten linear
// interpoliert. Damit werden auch Werte innerhalb der Lücken korrekt berechnet.
//
// Alle Beträge in CHF 1000. Der Rückgabewert wird noch durch 1000 dividiert (→ CHF).

import {
  BERN_EINK_MAP,
  BERN_VERM_MAP,
  ZUERICH_EINK_MAP,
  ZUERICH_VERM_TABLE,
} from "@/data/steuertabellen";
import type { Kanton } from "@/types";
import type { SteuerTabellen } from "./steuerKonstanten";

/**
 * Interpolierender Lookup für Array-basierte Steuertabellen (aus Supabase).
 * Findet entweder den exakten Eintrag oder interpoliert linear zwischen
 * den zwei benachbarten Stützpunkten.
 */
function lookupExactArr(table: [number, number][], key: number): number {
  if (table.length === 0) return 0;
  const k = Math.round(key);

  // Exakten Treffer suchen
  const exact = table.find(([x]) => x === k);
  if (exact) return exact[1];

  // Werte ausserhalb des Tabellenbereichs: Randwert zurückgeben
  if (k <= table[0][0]) return table[0][1];
  if (k >= table[table.length - 1][0]) return table[table.length - 1][1];

  // Lineare Interpolation zwischen den zwei nächsten Stützpunkten
  for (let i = 0; i < table.length - 1; i++) {
    if (table[i][0] <= k && k < table[i + 1][0]) {
      const [x0, y0] = table[i];
      const [x1, y1] = table[i + 1];
      return y0 + ((k - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return 0;
}

/**
 * Identische Interpolations-Logik für Map-basierte Tabellen (statischer Fallback
 * aus steuertabellen.ts, verwendet wenn Supabase nicht verfügbar ist).
 */
function lookupExact(map: Map<number, number>, key: number): number {
  const k = Math.round(key);
  const exact = map.get(k);
  if (exact !== undefined) return exact;

  // Schlüsselliste sortieren für die Interpolation
  const keys = [...map.keys()].sort((a, b) => a - b);
  if (keys.length === 0) return 0;
  if (k <= keys[0]) return map.get(keys[0])!;
  if (k >= keys[keys.length - 1]) return map.get(keys[keys.length - 1])!;

  for (let i = 0; i < keys.length - 1; i++) {
    if (keys[i] <= k && k < keys[i + 1]) {
      const y0 = map.get(keys[i])!;
      const y1 = map.get(keys[i + 1])!;
      return y0 + ((k - keys[i]) / (keys[i + 1] - keys[i])) * (y1 - y0);
    }
  }
  return 0;
}

/**
 * XLOOKUP(-1, -1): Grössten Tabellenschlüssel ≤ searchKey zurückgeben.
 * Wird für die Zürich Vermögenssteuer verwendet, die als Stufentarif aufgebaut ist
 * (anders als die interpolierten Einkommenstabellen).
 */
function xlookupLE(table: [number, number][], searchKey: number): number {
  let result = 0;
  for (const [k, v] of table) {
    if (k <= searchKey) result = v;
    else break;
  }
  return result;
}

// ─── Öffentliche Berechnungsfunktionen ────────────────────────────────────────

/**
 * Kantonale Einkommenssteuer berechnen.
 * Wenn Supabase-Tabellen verfügbar sind, werden diese verwendet; sonst
 * greifen die statisch eingebetteten Maps als Fallback.
 *
 * @param steuerbaresEinkommen  In CHF 1000
 * @returns Steuer in CHF (bereits durch 1000 dividiert)
 */
export function berechneEinkommenssteuer(
  steuerbaresEinkommen: number,
  kanton: Kanton,
  tabellen?: SteuerTabellen
): number {
  if (steuerbaresEinkommen <= 0) return 0;
  if (tabellen) {
    const raw = kanton === "Bern"
      ? lookupExactArr(tabellen.bernEink, steuerbaresEinkommen)
      : lookupExactArr(tabellen.zueriEink, steuerbaresEinkommen);
    return raw / 1000;
  }
  // Fallback: statische Tabellen aus steuertabellen.ts
  const raw = kanton === "Bern"
    ? lookupExact(BERN_EINK_MAP, steuerbaresEinkommen)
    : lookupExact(ZUERICH_EINK_MAP, steuerbaresEinkommen);
  return raw / 1000;
}

/**
 * Kantonale Vermögenssteuer berechnen.
 * Zürich verwendet einen Stufentarif (xlookupLE), Bern wird interpoliert.
 *
 * @param steuerbaresVermoegen  In CHF 1000
 * @returns Steuer in CHF (bereits durch 1000 dividiert)
 */
export function berechneVermoegenssteuer(
  steuerbaresVermoegen: number,
  kanton: Kanton,
  tabellen?: SteuerTabellen
): number {
  if (steuerbaresVermoegen <= 0) return 0;
  if (tabellen) {
    const raw = kanton === "Bern"
      ? lookupExactArr(tabellen.bernVerm, steuerbaresVermoegen)
      : xlookupLE(tabellen.zueriVerm, steuerbaresVermoegen);
    return raw / 1000;
  }
  const raw = kanton === "Bern"
    ? lookupExact(BERN_VERM_MAP, steuerbaresVermoegen)
    : xlookupLE(ZUERICH_VERM_TABLE, steuerbaresVermoegen);
  return raw / 1000;
}

// ─── Kapitalauszahlungssteuer ─────────────────────────────────────────────────
// Sondersteuersatz für Auszahlungen aus PK, Freizügigkeit und Säule 3a.
// Die Steuersätze (in %) sind aus den Excel-Spalten "Steuern Bern!AF" und
// "Steuern Zürich!W" der Aufgabenstellung abgeleitet und decken den Bereich
// CHF 62'000 bis CHF 869'000 ab.

const KAPITAL_RATES_BERN: [number, number][] = [
  [62, 3.33], [87, 3.76], [90, 3.80], [159, 5.04],
  [239, 6.09], [700, 8.60], [869, 9.06],
];
const KAPITAL_RATES_ZUERICH: [number, number][] = [
  [62, 4.11], [87, 4.26], [90, 4.28], [159, 4.84],
  [239, 5.41], [700, 6.17], [869, 7.14],
];

/** Linearer Steuersatz für einen gegebenen Auszahlungsbetrag (interpoliert) */
function interpolateRate(rates: [number, number][], betrag: number): number {
  if (betrag <= rates[0][0]) return rates[0][1];
  for (let i = 1; i < rates.length; i++) {
    if (betrag <= rates[i][0]) {
      const t = (betrag - rates[i - 1][0]) / (rates[i][0] - rates[i - 1][0]);
      return rates[i - 1][1] + t * (rates[i][1] - rates[i - 1][1]);
    }
  }
  return rates[rates.length - 1][1];
}

/**
 * Kapitalauszahlungssteuer berechnen (Einmalsteuer auf Vorsorgebezüge).
 *
 * @param betrag  Gesamter Auszahlungsbetrag im jeweiligen Jahr in CHF 1000
 * @returns Steuer in CHF 1000
 */
export function berechneKapitalauszahlungssteuer(
  betrag: number,
  kanton: Kanton
): number {
  if (betrag <= 0) return 0;
  const rates = kanton === "Bern" ? KAPITAL_RATES_BERN : KAPITAL_RATES_ZUERICH;
  const rate = interpolateRate(rates, betrag);
  return (betrag * rate) / 100;
}
