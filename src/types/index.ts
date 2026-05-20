export type Kanton = "Bern" | "Zuerich";
export type Szenario = "fruehest" | "spaetmoeglichst" | "gestaffelt";

export interface PersonalData {
  geburtsdatumHerr: string; // "1963-06-30"
  geburtsdatumFrau: string; // "1964-12-31"
  einkommenTotal: number;   // CHF in 1000er
  kinderAnzahl: number;
  kinderStudierenJahre: number;
}

export interface VorsorgeData {
  pkHerr: number;
  pkFrau: number;
  freizuegigkeit1Herr: number;
  freizuegigkeit2Herr: number;
  saeule3aHerr1: number;
  saeule3aHerr2: number;
  saeule3aFrau1: number;
  saeule3aFrau2: number;
  saeule3aFrau3: number;
  lebensversicherungBetrag: number;
  lebensversicherungJahr: number;
}

export interface LiquiditaetData {
  liquiditaetHerr: number;
  liquiditaetFrau: number;
  etfFrau: number;
}

export interface LiegenschaftData {
  verkehrswert: number;
  steuerwert: number;
  eigenmietwert: number;
  hypothek1: number;
  hypothek1Verfall: string; // "2024-05-31"
  hypothek2: number;
  hypothek2Verfall: string;
  hypothek3: number;
  hypothek3Verfall: string;
  zinsSatzAlt: number; // 0.0064
  zinsSatzNeu: number; // 0.03
}

export interface SimulationInputs {
  personal: PersonalData;
  vorsorge: VorsorgeData;
  liquiditaet: LiquiditaetData;
  liegenschaft: LiegenschaftData;
  kanton: Kanton;
  szenario: Szenario;
}

export interface JahresDaten {
  jahr: number;
  // Einnahmen
  einkommenHerr: number;
  einkommenFrau: number;
  ahvRente: number;
  pkRenteHerr: number;
  totalEinnahmen: number;
  // Ausgaben
  lebenshaltungskosten: number;
  hypothekarzinsen: number;
  unterhaltskosten: number;
  amortisationen: number;
  saeule3aBeitraege: number;
  steuern: number;
  totalAusgaben: number;
  // Sparquote
  sparenVerzehr: number;
  // Vermögen
  liquiditaetsreserve: number;
  anlagevermoegen: number;
  totalFreiesVermoegen: number;
  totalBeweglichesVermoegen: number;
  liegenschaft: number;
  hypothekenTotal: number;
  totalVermoegen: number;
  // Steuern detail
  steuerbaresEinkommen: number;
  steuerbaresVermoegen: number;
  einkommenssteuer: number;
  vermoegenssteuer: number;
}

export interface SimulationResult {
  kanton: Kanton;
  szenario: Szenario;
  jahre: JahresDaten[];
  totalSteuern: number;
  endvermoegen: number;
}
