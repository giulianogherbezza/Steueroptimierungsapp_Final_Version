// Laden und Aufbereiten der Steuerkonstanten und Steuertabellen aus Supabase.
//
// Die App unterscheidet zwei Arten von Stammdaten:
//   1. steuer_konstanten – einzelne Zahlenwerte (Zinssätze, Pauschalen, …)
//   2. steuer_tabellen   – Steuertabellen als JSON-Arrays [(steuerbares, steuer), …]
//
// Beide werden beim Laden der Simulationsseite aus Supabase abgerufen und
// an runAllSimulations() übergeben. Schlägt der Abruf fehl, greift die
// Simulation auf die eingebetteten Fallback-Werte in simulation.ts zurück.

import { supabase } from "./supabase";

/** Einzelne Zeile aus der Supabase-Tabelle steuer_konstanten */
export interface SteuerKonstante {
  schluessel: string;    // Eindeutiger Bezeichner, z. B. "inflationsrate"
  wert: number;          // Numerischer Wert
  beschreibung: string;  // Lesbare Beschreibung für die Anzeige auf der Konto-Seite
  einheit: string;       // Z. B. "%" oder "CHF 1000"
}

/** Typisiertes Objekt aller Konstanten, die die Simulation benötigt */
export interface SimulationsKonstanten {
  inflationsrate: number;         // Jährliche Teuerungsrate
  zins_anlage: number;            // Rendite des ETF-Portfolios
  zins_fk: number;                // Verzinsung Freizügigkeitskonten
  zins_sa3: number;               // Verzinsung Säule 3a
  zins_lv: number;                // Verzinsung Lebensversicherung
  zins_pk: number;                // Verzinsung PK-Kapital Frau (nach Pensionierung wartet)
  sicherheitsreserve: number;     // Feste Liquiditätsreserve in CHF 1000 (immer 100)
  unterhalt_prozent: number;      // Liegenschaftsunterhalt als Anteil des Verkehrswerts
  versicherungspauschale: number; // Pauschaler Versicherungsabzug (CHF 1000)
  vergabungen: number;            // Abzug für Vergabungen / Spenden (CHF 1000)
  sozialabzug_bern: number;       // Sozialabzug Kanton Bern (nicht in Zürich)
  sa3_pro_person: number;         // Max. steuerlich abziehbarer 3a-Beitrag pro Person
  ahv_einzel:  number;            // AHV-Rente Einzelperson (CHF 1000 p.a.)
  ahv_paar: number;               // AHV-Rente Ehepaar (CHF 1000 p.a.)
  pk_rente_herr: number;          // Jährliche PK-Rente Herr ab Pensionierung (CHF 1000)
}

/**
 * Rohdaten aus Supabase in ein typisiertes Objekt umwandeln.
 * Fehlende Schlüssel werden mit den Fallback-Werten aus simulation.ts aufgefüllt.
 */
export function konstantenZuMap(liste: SteuerKonstante[]): SimulationsKonstanten {
  const m: Record<string, number> = {};
  for (const k of liste) m[k.schluessel] = k.wert;
  return {
    inflationsrate:         m["inflationsrate"]         ?? 0.015,
    zins_anlage:            m["zins_anlage"]             ?? 0.03,
    zins_fk:                m["zins_fk"]                 ?? 0.003,
    zins_sa3:               m["zins_sa3"]                ?? 0.03,
    zins_lv:                m["zins_lv"]                 ?? 0.003,
    zins_pk:                m["zins_pk"]                 ?? 0.01,
    sicherheitsreserve:     m["sicherheitsreserve"]      ?? 100,
    unterhalt_prozent:      m["unterhalt_prozent"]       ?? 0.0075,
    versicherungspauschale: m["versicherungspauschale"]  ?? 3,
    vergabungen:            m["vergabungen"]             ?? 1.5,
    sozialabzug_bern:       m["sozialabzug_bern"]        ?? 10.4,
    sa3_pro_person:         m["sa3_pro_person"]          ?? 6.883,
    ahv_einzel:             m["ahv_einzel"]              ?? 29.4,
    ahv_paar:               m["ahv_paar"]                ?? 44.7,
    pk_rente_herr:          m["pk_rente_herr"]           ?? 40,
  };
}

/**
 * Steuertabellen-Typen: Jede Tabelle ist ein Array aus [steuerbarerBetrag, Steuer]-Paaren.
 * Die Beträge sind in CHF 1000, die Steuerwerte ebenfalls (dividiert durch 1000
 * in steuerberechnung.ts, um CHF zu erhalten).
 */
export interface SteuerTabellen {
  bernEink:  [number, number][];  // Bern Einkommenssteuer
  bernVerm:  [number, number][];  // Bern Vermögenssteuer
  zueriEink: [number, number][];  // Zürich Einkommenssteuer
  zueriVerm: [number, number][];  // Zürich Vermögenssteuer
}

/**
 * Steuertabellen aus der Supabase-Tabelle "steuer_tabellen" laden.
 * Jede Zeile enthält kanton, typ und daten (das JSON-Array der Wertepaare).
 * Gibt null zurück wenn die Tabelle leer ist oder ein Fehler auftritt.
 */
export async function ladeSteuerTabellen(): Promise<SteuerTabellen | null> {
  const { data, error } = await supabase
    .from("steuer_tabellen")
    .select("kanton, typ, daten");

  if (error || !data || data.length === 0) return null;

  const find = (kanton: string, typ: string) =>
    (data.find((r) => r.kanton === kanton && r.typ === typ)?.daten ?? []) as [number, number][];

  return {
    bernEink:  find("Bern",    "einkommen"),
    bernVerm:  find("Bern",    "vermoegen"),
    zueriEink: find("Zuerich", "einkommen"),
    zueriVerm: find("Zuerich", "vermoegen"),
  };
}

/** Alle Steuerkonstanten aus Supabase laden (alphabetisch sortiert) */
export async function ladeSteuerKonstanten(): Promise<SteuerKonstante[]> {
  const { data, error } = await supabase
    .from("steuer_konstanten")
    .select("*")
    .order("schluessel");

  if (error) throw new Error(error.message);
  return data ?? [];
}
