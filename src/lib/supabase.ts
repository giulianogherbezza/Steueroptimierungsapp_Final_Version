// Supabase-Client Singleton
// Die Verbindungsdaten kommen aus den .env.local-Umgebungsvariablen.
// NEXT_PUBLIC_* Variablen sind im Browser sichtbar – das ist bei Supabase so vorgesehen,
// da die Row Level Security (RLS) den Datenzugriff serverseitig absichert.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
