// Hilfsfunktionen für die Supabase-Authentifizierung.
// Alle Funktionen werfen einen Error mit lesbarer Meldung – die aufrufende
// Komponente ist für das Handling (try/catch) zuständig.

import { supabase } from "./supabase";

/** Bestehenden Benutzer anmelden */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

/** Neues Konto erstellen */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

/** Aktuelle Session beenden */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/** Eingeloggten Benutzer abrufen – gibt null zurück wenn keine Session besteht */
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
