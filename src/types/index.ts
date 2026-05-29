// ─────────────────────────────────────────────────────────────────────────────
// Gemeinsame TypeScript-Typen für die gesamte Steueroptimierungs-App
// Alle Geldbeträge sind in CHF (Tausend), sofern nicht anders angegeben.
// ─────────────────────────────────────────────────────────────────────────────

/** Unterstützte Kantone */
export type Kanton = "Bern" | "Zuerich";

/** Die drei möglichen Amortisationsstrategien */
export type Szenario = "fruehest" | "spaetmoeglichst" | "gestaffelt";

// ─── Eingabedaten ─────────────────────────────────────────────────────────────

/** Persönliche Angaben zum Ehepaar */
export interface PersonalData {
  geburtsdatumHerr: string;       // ISO-Format, z. B. "1963-06-30"
  geburtsdatumFrau: string;       // ISO-Format, z. B. "1964-12-31"
  einkommenTotal: number;         // Gemeinsames Nettoeinkommen in CHF 1000
  kinderAnzahl: number;           // Anzahl Kinder (für Steuerabzüge)
  kinderStudierenJahre: number;   // Wie viele weitere Jahre studieren die Kinder noch
}

/** Vorsorgevermögen (Pensionskasse, Freizügigkeit, Säule 3a, Lebensversicherung) */
export interface VorsorgeData {
  pkHerr: number;                  // PK-Kapital Herr in CHF 1000
  pkFrau: number;                  // PK-Kapital Frau in CHF 1000
  freizuegigkeit1Herr: number;     // Freizügigkeitskonto 1 Herr
  freizuegigkeit2Herr: number;     // Freizügigkeitskonto 2 Herr
  saeule3aHerr1: number;           // Säule 3a Konto I Herr
  saeule3aHerr2: number;           // Säule 3a Konto II Herr
  saeule3aFrau1: number;           // Säule 3a Konto I Frau
  saeule3aFrau2: number;           // Säule 3a Konto II Frau
  saeule3aFrau3: number;           // Säule 3a Konto III Frau (laufende Einzahlungen)
  lebensversicherungBetrag: number; // Rückkaufswert der Lebensversicherung
  lebensversicherungJahr: number;   // Jahr, in dem die LV ausgezahlt wird (= Pension Frau)
}

/** Flüssige Mittel und ETF-Anlagen zu Beginn der Simulation */
export interface LiquiditaetData {
  liquiditaetHerr: number; // Kontostand Herr per 01.01.2023
  liquiditaetFrau: number; // Kontostand Frau per 01.01.2023
  etfHerr: number;         // ETF-Portfolio Herr per 01.01.2023
  etfFrau: number;         // ETF-Portfolio Frau per 01.01.2023
}

/** Liegenschaft und die drei Hypothekentranchen */
export interface LiegenschaftData {
  verkehrswert: number;            // Marktwert der Liegenschaft in CHF 1000
  steuerwert: number;              // Steuerwert (für Vermögenssteuer)
  eigenmietwert: number;           // Jährlicher Eigenmietwert (steuerliches Einkommen)
  // Hypothek 1
  hypothek1: number;               // Ausstehender Betrag per 01.01.2023
  hypothek1Verfall: string;        // Verfallsdatum, z. B. "2024-05-31"
  hypothek1ZinsSatzAlt: number;    // Zinssatz bis Verfall (als Dezimalzahl, z. B. 0.0064)
  hypothek1ZinsSatzNeu: number;    // Zinssatz nach Erneuerung
  // Hypothek 2
  hypothek2: number;
  hypothek2Verfall: string;
  hypothek2ZinsSatzAlt: number;
  hypothek2ZinsSatzNeu: number;
  // Hypothek 3
  hypothek3: number;
  hypothek3Verfall: string;
  hypothek3ZinsSatzAlt: number;
  hypothek3ZinsSatzNeu: number;
}

/** Vollständige Eingabedaten für eine Simulation (inkl. Kanton und Szenario) */
export interface SimulationInputs {
  personal: PersonalData;
  vorsorge: VorsorgeData;
  liquiditaet: LiquiditaetData;
  liegenschaft: LiegenschaftData;
  kanton: Kanton;
  szenario: Szenario;
}

// ─── Ausgabedaten ─────────────────────────────────────────────────────────────

/** Alle berechneten Werte für ein einzelnes Simulationsjahr */
export interface JahresDaten {
  jahr: number;

  // Einnahmen
  einkommenHerr: number;       // Lohn Herr (0 nach Pensionierung)
  einkommenFrau: number;       // Lohn Frau (0 nach Pensionierung)
  ahvRente: number;            // AHV-Rente (Einzel oder Ehepaar, je nach Pensionierungsstatus)
  pkRenteHerr: number;         // PK-Rente Herr (nur nach Pensionierung Herr)
  totalEinnahmen: number;

  // Ausgaben
  lebenshaltungskosten: number; // Vor Pension: CHF 110k; nach Pension: CHF 80k (inflationsbereinigt)
  hypothekarzinsen: number;     // Zinslast aller drei Hypotheken im jeweiligen Jahr
  unterhaltskosten: number;     // 0.75% des Verkehrswerts (Liegenschaftsunterhalt)
  amortisationen: number;       // Tilgung gemäss Szenario (0 wenn nicht fällig)
  saeule3aBeitraege: number;    // Jährliche Einzahlungen in 3a-Konten
  steuern: number;              // Einkommens- + Vermögenssteuern (ohne Kapitalauszahlungssteuern)
  totalAusgaben: number;

  // Sparquote: positiv = Zufluss ins Portfolio, negativ = Portfolioverzehr
  sparenVerzehr: number;

  // Vermögenspositionen per Jahresende
  liquiditaetsreserve: number;  // Immer CHF 100k (feste Sicherheitsreserve)
  anlagevermoegen: number;      // Reines ETF-Portfolio (ohne Sicherheitsreserve)
  totalFreiesVermoegen: number; // Anlagevermögen + Liquiditätsreserve
  totalBeweglichesVermoegen: number; // Reserviert für spätere Erweiterung (aktuell 0)
  liegenschaft: number;         // Verkehrswert (unverändert über die Simulationsperiode)
  hypothekenTotal: number;      // Ausstehende Hypothekenschulden per Jahresende
  totalVermoegen: number;       // = totalFreiesVermoegen (wie in Excel-Vorlage)

  // Steuerdetails (für Steuer-Tab in der Detailansicht)
  steuerbaresEinkommen: number;
  steuerbaresVermoegen: number;
  einkommenssteuer: number;
  vermoegenssteuer: number;
}

/** Ergebnis einer einzelnen Simulation (ein Kanton, ein Szenario) */
export interface SimulationResult {
  kanton: Kanton;
  szenario: Szenario;
  jahre: JahresDaten[];           // 10 Jahreszeilen (2023–2032)
  totalSteuern: number;           // Kumulierte Einkommens- + Vermögenssteuern über alle Jahre
  endvermoegen: number;           // totalVermoegen per 31.12.2032 (= Anlagevermögen + 100k Reserve)
}
