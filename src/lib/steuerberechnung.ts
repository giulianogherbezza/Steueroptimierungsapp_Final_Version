import {
  EINKOMMENSSTEUER_BERN,
  VERMOEGENSSTEUER_BERN,
  EINKOMMENSSTEUER_ZUERICH,
  VERMOEGENSSTEUER_ZUERICH,
} from "@/data/steuertabellen";
import type { Kanton } from "@/types";

// Interpoliert den Steuerbetrag aus einer Steuertabelle (Stufentarif)
function interpoliereSteuertabelle(
  tabelle: [number, number, number][],
  betrag: number
): number {
  if (betrag <= 0) return 0;

  let result = 0;
  for (let i = 0; i < tabelle.length; i++) {
    const [grenze, grundsteuer, grenzsteuersatz] = tabelle[i];
    const naechsteGrenze = i + 1 < tabelle.length ? tabelle[i + 1][0] : Infinity;

    if (betrag <= grenze) {
      // Unterhalb der ersten Grenze: proportional
      if (i === 0) {
        result = betrag * grenzsteuersatz;
      }
      break;
    }

    if (betrag <= naechsteGrenze) {
      result = grundsteuer + (betrag - grenze) * grenzsteuersatz;
      break;
    }

    if (i === tabelle.length - 1) {
      result = grundsteuer + (betrag - grenze) * grenzsteuersatz;
    }
  }
  return Math.round(result * 100) / 100;
}

export function berechneEinkommenssteuer(
  steuerbaresEinkommen: number,
  kanton: Kanton
): number {
  const tabelle =
    kanton === "Bern" ? EINKOMMENSSTEUER_BERN : EINKOMMENSSTEUER_ZUERICH;
  return interpoliereSteuertabelle(tabelle, steuerbaresEinkommen);
}

export function berechneVermoegenssteuer(
  steuerbaresVermoegen: number,
  kanton: Kanton
): number {
  if (steuerbaresVermoegen <= 0) return 0;
  const tabelle =
    kanton === "Bern" ? VERMOEGENSSTEUER_BERN : VERMOEGENSSTEUER_ZUERICH;
  return interpoliereSteuertabelle(tabelle, steuerbaresVermoegen / 1000) * 1000 / 1000;
}

export function berechneKapitalauszahlungssteuer(
  betrag: number,
  kanton: Kanton
): number {
  if (betrag <= 0) return 0;
  if (kanton === "Bern") {
    // Spezialtarif Bern für Kapitalleistungen (1/5-Satz)
    const jahressteuer = berechneEinkommenssteuer(betrag * 5, "Bern");
    return jahressteuer / 5;
  } else {
    // Zürich: 2/5 der normalen Einkommenssteuer auf das Kapital
    const jahressteuer = berechneEinkommenssteuer(betrag * 5, "Zuerich");
    return jahressteuer * 0.4;
  }
}
