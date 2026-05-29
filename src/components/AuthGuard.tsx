"use client";

// Schutzhülle für Seiten, die eine aktive Session voraussetzen.
// Prüft beim Mounten ob ein eingeloggter Benutzer vorhanden ist.
// Wenn nicht, wird direkt auf /login weitergeleitet.
// Solange die Prüfung läuft, erscheint ein einfacher Ladehinweis.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-400 text-sm">Wird geladen…</p>
      </div>
    );
  }

  return <>{children}</>;
}
