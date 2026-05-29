"use client";

// Navigationsbereich oben rechts: zeigt die E-Mail-Adresse des eingeloggten
// Benutzers und einen Abmelden-Button. Reagiert in Echtzeit auf Authentifizierungs-
// Ereignisse (Login / Logout in einem anderen Tab).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

export default function UserNav() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Aktuellen User beim Laden der Seite setzen
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    // Auf Auth-Zustandsänderungen hören (Login/Logout auch in anderen Tabs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Listener beim Unmount entfernen
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  // Nicht eingeloggt → nichts anzeigen
  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-500 hidden sm:block">{user.email}</span>
      <button
        onClick={handleLogout}
        className="text-sm border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
      >
        Abmelden
      </button>
    </div>
  );
}
