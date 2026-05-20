import {
  BERN_EINK_MAP,
  BERN_VERM_MAP,
  ZUERICH_EINK_MAP,
  ZUERICH_VERM_TABLE,
} from "@/data/steuertabellen";
import type { Kanton } from "@/types";

// Exact INDEX/MATCH lookup (returns 0 if key not found)
function lookupExact(map: Map<number, number>, key: number): number {
  const rounded = Math.round(key);
  return map.get(rounded) ?? 0;
}

// XLOOKUP(-1,-1): largest key <= searchKey (Zürich Vermögenssteuer)
function xlookupLE(table: [number, number][], searchKey: number): number {
  let result = 0;
  for (const [k, v] of table) {
    if (k <= searchKey) result = v;
    else break;
  }
  return result;
}

export function berechneEinkommenssteuer(
  steuerbaresEinkommen: number,
  kanton: Kanton
): number {
  if (steuerbaresEinkommen <= 0) return 0;
  const raw =
    kanton === "Bern"
      ? lookupExact(BERN_EINK_MAP, steuerbaresEinkommen)
      : lookupExact(ZUERICH_EINK_MAP, steuerbaresEinkommen);
  return raw / 1000;
}

export function berechneVermoegenssteuer(
  steuerbaresVermoegen: number,
  kanton: Kanton
): number {
  if (steuerbaresVermoegen <= 0) return 0;
  const raw =
    kanton === "Bern"
      ? lookupExact(BERN_VERM_MAP, steuerbaresVermoegen)
      : xlookupLE(ZUERICH_VERM_TABLE, steuerbaresVermoegen);
  return raw / 1000;
}

// Approximate Kapitalauszahlungssteuer using rate tables calibrated from Excel
// Rates derived from Steueroptimierung.xlsx Steuern Bern!AF / Steuern Zürich!W columns
const KAPITAL_RATES_BERN: [number, number][] = [
  [62, 3.33], [87, 3.76], [90, 3.80], [159, 5.04],
  [239, 6.09], [700, 8.60], [869, 9.06],
];
const KAPITAL_RATES_ZUERICH: [number, number][] = [
  [62, 4.11], [87, 4.26], [90, 4.28], [159, 4.84],
  [239, 5.41], [700, 6.17], [869, 7.14],
];

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

export function berechneKapitalauszahlungssteuer(
  betrag: number,
  kanton: Kanton
): number {
  if (betrag <= 0) return 0;
  const rates = kanton === "Bern" ? KAPITAL_RATES_BERN : KAPITAL_RATES_ZUERICH;
  const rate = interpolateRate(rates, betrag);
  return (betrag * rate) / 100;
}
