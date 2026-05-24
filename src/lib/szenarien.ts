import { supabase } from "./supabase";
import type { SimulationInputs } from "@/types";

export interface GespeichertesSzenario {
  id: string;
  name: string;
  inputs: Omit<SimulationInputs, "kanton" | "szenario">;
  created_at: string;
}

// Alle gespeicherten Szenarien laden
export async function ladeSzenarien(): Promise<GespeichertesSzenario[]> {
  const { data, error } = await supabase
    .from("szenarien")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// Neues Szenario speichern (user_id wird automatisch aus der Auth-Session gelesen)
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

// Szenario löschen
export async function loescheSzenario(id: string): Promise<void> {
  const { error } = await supabase.from("szenarien").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
