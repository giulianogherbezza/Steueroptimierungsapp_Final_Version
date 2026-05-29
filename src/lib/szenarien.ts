// Datenbankoperationen für die Tabelle "szenarien" in Supabase.
// Ein Szenario speichert einen benannten Satz von Simulationseingaben,
// damit Benutzer verschiedene Fallkonstellationen vergleichen können.

import { supabase } from "./supabase";
import type { SimulationInputs } from "@/types";

export interface GespeichertesSzenario {
  id: string;
  name: string;
  inputs: Omit<SimulationInputs, "kanton" | "szenario">;
  created_at: string;
}

/** Alle gespeicherten Szenarien des eingeloggten Benutzers laden, neueste zuerst */
export async function ladeSzenarien(): Promise<GespeichertesSzenario[]> {
  const { data, error } = await supabase
    .from("szenarien")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Neues Szenario speichern.
 * Die user_id wird automatisch aus der aktiven Supabase-Session übernommen –
 * die RLS-Policy stellt sicher, dass jeder Benutzer nur seine eigenen Szenarien sieht.
 */
export async function speichereSzenario(
  name: string,
  inputs: Omit<SimulationInputs, "kanton" | "szenario">
): Promise<GespeichertesSzenario> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("szenarien")
    .insert({ name, inputs, user_id: user?.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Szenario anhand seiner ID löschen */
export async function loescheSzenario(id: string): Promise<void> {
  const { error } = await supabase.from("szenarien").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
