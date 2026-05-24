import { supabase } from "./supabase";

export interface Profil {
  id: string;
  vorname: string | null;
  nachname: string | null;
  telefon: string | null;
  updated_at: string;
}

export async function ladeProfil(): Promise<Profil | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data ?? null;
}

export async function speichereProfil(profil: {
  vorname: string;
  nachname: string;
  telefon: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt");

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...profil, updated_at: new Date().toISOString() });

  if (error) throw new Error(error.message);
}
