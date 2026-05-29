// Standardwerte für das Beispielpaar aus der Aufgabenstellung (Dokumentation, Kap. 3).
// Diese Werte werden als Vorausfüllung im Formular angezeigt, wenn kein Profil
// gespeichert ist oder der Benutzer die App zum ersten Mal öffnet.
// Alle Geldbeträge in CHF (Tausend).

import type { SimulationInputs } from "@/types";

export const DEFAULT_INPUTS: Omit<SimulationInputs, "kanton" | "szenario"> = {
  personal: {
    geburtsdatumHerr: "1963-06-30",   // Pensionierung 2028 (65. Geburtstag)
    geburtsdatumFrau: "1964-12-31",   // Pensionierung 2029
    einkommenTotal: 270,              // Gemeinsames Nettoeinkommen CHF 270'000
    kinderAnzahl: 2,
    kinderStudierenJahre: 3,          // Kinder studieren noch 3 Jahre ab 2023
  },
  vorsorge: {
    pkHerr: 470,                      // Pensionskassenguthaben Herr
    pkFrau: 1490,                     // Pensionskassenguthaben Frau (Kapitalwahlrecht)
    freizuegigkeit1Herr: 235,         // Freizügigkeitskonto 1 Herr
    freizuegigkeit2Herr: 44,          // Freizügigkeitskonto 2 Herr
    saeule3aHerr1: 60,
    saeule3aHerr2: 80,
    saeule3aFrau1: 80,
    saeule3aFrau2: 13,
    saeule3aFrau3: 6,
    lebensversicherungBetrag: 70,     // Rückkaufswert LV per 01.01.2023
    lebensversicherungJahr: 2028,     // Auszahlung bei Pension Frau (2029 – wird intern berechnet)
  },
  liquiditaet: {
    liquiditaetHerr: 120,             // Bankguthaben Herr per 01.01.2023
    liquiditaetFrau: 200,             // Bankguthaben Frau per 01.01.2023
    etfHerr: 0,                       // ETF-Portfolio Herr (im Beispiel nicht vorhanden)
    etfFrau: 155,                     // ETF-Portfolio Frau per 01.01.2023
  },
  liegenschaft: {
    verkehrswert: 3500,
    steuerwert: 2450,                 // Steuerwert ≈ 70% des Verkehrswerts
    eigenmietwert: 73.5,              // Jährlicher Eigenmietwert (steuerliches Zusatzeinkommen)
    hypothek1: 400,
    hypothek1Verfall: "2024-05-31",
    hypothek1ZinsSatzAlt: 0.0064,    // 0.64% bis Verfall
    hypothek1ZinsSatzNeu: 0.03,      // 3.00% nach Erneuerung
    hypothek2: 800,
    hypothek2Verfall: "2024-10-31",
    hypothek2ZinsSatzAlt: 0.0064,
    hypothek2ZinsSatzNeu: 0.03,
    hypothek3: 300,
    hypothek3Verfall: "2025-01-31",
    hypothek3ZinsSatzAlt: 0.0064,
    hypothek3ZinsSatzNeu: 0.03,
  },
};
