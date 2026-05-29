// Datenbankoperationen für die Tabelle "profiles" in Supabase.
// Ein Profil speichert persönliche Angaben (Name, Telefon) sowie
// die zuletzt verwendeten Simulationseingaben des Benutzers.

import { supabase } from "./supabase";
import type { SimulationInputs } from "@/types";
import { DEFAULT_INPUTS } from "./defaultInputs";

// Kanton und Szenario werden nicht im Profil gespeichert –
// sie werden bei jeder Simulation neu gewählt.
type SimInputs = Omit<SimulationInputs, "kanton" | "szenario">;

export interface Profil {
  id: string;
  vorname: string | null;
  nachname: string | null;
  telefon: string | null;
  simulation_inputs: SimInputs | null;
  updated_at: string;
}

/** Profil des eingeloggten Benutzers aus Supabase laden */
export async function ladeProfil(): Promise<Profil | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // PGRST116 = kein Treffer (Profil noch nicht angelegt) – kein echter Fehler
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!data) return null;

  // Rückwärtskompatibilität: ältere Profile verwendeten zinsSatzAlt / zinsSatzNeu
  // als gemeinsame Felder für alle drei Hypotheken. Neue Felder sind pro Hypothek.
  if (data.simulation_inputs?.liegenschaft) {
    const l = data.simulation_inputs.liegenschaft as Record<string, unknown>;
    if (!("hypothek1ZinsSatzAlt" in l)) {
      const zAlt = (l.zinsSatzAlt as number) ?? DEFAULT_INPUTS.liegenschaft.hypothek1ZinsSatzAlt;
      const zNeu = (l.zinsSatzNeu as number) ?? DEFAULT_INPUTS.liegenschaft.hypothek1ZinsSatzNeu;
      l.hypothek1ZinsSatzAlt = zAlt; l.hypothek1ZinsSatzNeu = zNeu;
      l.hypothek2ZinsSatzAlt = zAlt; l.hypothek2ZinsSatzNeu = zNeu;
      l.hypothek3ZinsSatzAlt = zAlt; l.hypothek3ZinsSatzNeu = zNeu;
      delete l.zinsSatzAlt; delete l.zinsSatzNeu;
    }
    // etfHerr wurde nachträglich hinzugefügt – Standardwert 0 für ältere Profile
    if (!("etfHerr" in (data.simulation_inputs.liquiditaet as Record<string, unknown>))) {
      (data.simulation_inputs.liquiditaet as Record<string, unknown>).etfHerr = 0;
    }
  }

  return data;
}

/**
 * Profildaten speichern oder aktualisieren (upsert).
 * Nur die übergebenen Felder werden überschrieben.
 */
export async function speichereProfil(profil: {
  vorname?: string;
  nachname?: string;
  telefon?: string;
  simulation_inputs?: SimInputs;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt");

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...profil, updated_at: new Date().toISOString() });

  if (error) throw new Error(error.message);
}
