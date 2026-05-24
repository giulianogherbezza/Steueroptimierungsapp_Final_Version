import { supabase } from "./supabase";

export interface SteuerKonstante {
  schluessel: string;
  wert: number;
  beschreibung: string;
  einheit: string;
}

export async function ladeSteuerKonstanten(): Promise<SteuerKonstante[]> {
  const { data, error } = await supabase
    .from("steuer_konstanten")
    .select("*")
    .order("schluessel");

  if (error) throw new Error(error.message);
  return data ?? [];
}
