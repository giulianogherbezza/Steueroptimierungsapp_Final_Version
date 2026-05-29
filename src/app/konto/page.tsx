"use client";

// Konto-Verwaltungsseite: Persönliche Angaben, gespeicherte Szenarien,
// Finanzangaben und Anzeige der kantonalen Steuerkonstanten.
// Alles wird parallel beim ersten Laden von Supabase abgerufen.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ladeProfil, speichereProfil } from "@/lib/profile";
import { ladeSzenarien, loescheSzenario } from "@/lib/szenarien";
import { ladeSteuerKonstanten } from "@/lib/steuerKonstanten";
import { DEFAULT_INPUTS } from "@/lib/defaultInputs";
import type { GespeichertesSzenario } from "@/lib/szenarien";
import type { SteuerKonstante } from "@/lib/steuerKonstanten";
import type { SimulationInputs } from "@/types";
import AuthGuard from "@/components/AuthGuard";
import SimulationForm from "@/components/SimulationForm";

export default function KontoPage() {
  const router = useRouter();

  // Profil-State
  const [email, setEmail]     = useState("");
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [telefon, setTelefon] = useState("");
  const [profilStatus, setProfilStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");

  // Szenarien und Steuerkonstanten
  const [szenarien, setSzenarien]   = useState<GespeichertesSzenario[]>([]);
  const [konstanten, setKonstanten] = useState<SteuerKonstante[]>([]);
  const [ladeStatus, setLadeStatus] = useState<"loading" | "ok" | "error">("loading");

  // Gespeicherte Finanzangaben (für SimulationForm)
  const [simInputs, setSimInputs] = useState<Omit<SimulationInputs, "kanton" | "szenario">>(DEFAULT_INPUTS);
  const [simSpeichernStatus, setSimSpeichernStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");

  // Alle Daten parallel laden beim ersten Render
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email ?? "");

      try {
        const [profil, scenarios, kons] = await Promise.all([
          ladeProfil(), ladeSzenarien(), ladeSteuerKonstanten()
        ]);
        if (profil) {
          setVorname(profil.vorname ?? "");
          setNachname(profil.nachname ?? "");
          setTelefon(profil.telefon ?? "");
          if (profil.simulation_inputs) setSimInputs(profil.simulation_inputs);
        }
        setSzenarien(scenarios);
        setKonstanten(kons);
        setLadeStatus("ok");
      } catch {
        setLadeStatus("error");
      }
    }
    init();
  }, []);

  async function handleProfilSpeichern(e: React.FormEvent) {
    e.preventDefault();
    setProfilStatus("saving");
    try {
      await speichereProfil({ vorname, nachname, telefon });
      setProfilStatus("ok");
      setTimeout(() => setProfilStatus("idle"), 2000);
    } catch {
      setProfilStatus("error");
      setTimeout(() => setProfilStatus("idle"), 3000);
    }
  }

  async function handleSzenarionLoeschen(id: string) {
    await loescheSzenario(id);
    setSzenarien((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSimInputsSpeichern(inputs: Omit<SimulationInputs, "kanton" | "szenario">) {
    setSimSpeichernStatus("saving");
    try {
      await speichereProfil({ simulation_inputs: inputs });
      setSimInputs(inputs);
      setSimSpeichernStatus("ok");
      setTimeout(() => setSimSpeichernStatus("idle"), 2000);
    } catch {
      setSimSpeichernStatus("error");
      setTimeout(() => setSimSpeichernStatus("idle"), 3000);
    }
  }

  // Szenario laden: Inputs in sessionStorage zwischenspeichern,
  // dann zur Simulation weiterleiten (laden=1 signalisiert das Laden aus Storage)
  function handleSzenarionLaden(inputs: Omit<SimulationInputs, "kanton" | "szenario">) {
    sessionStorage.setItem("geladeneInputs", JSON.stringify(inputs));
    router.push("/simulation?laden=1");
  }

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto space-y-8">
        <h2 className="text-2xl font-bold text-slate-900">Mein Konto</h2>

        {/* ── Persönliche Angaben ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-900">Persönliche Angaben</h3>
          </div>
          <form onSubmit={handleProfilSpeichern} className="p-6 space-y-4">
            {/* E-Mail ist schreibgeschützt (wird von Supabase Auth verwaltet) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail</label>
              <input type="email" value={email} disabled
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
              <p className="text-xs text-slate-400 mt-1">E-Mail kann nicht geändert werden.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vorname</label>
                <input type="text" value={vorname} onChange={(e) => setVorname(e.target.value)}
                  placeholder="Max"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nachname</label>
                <input type="text" value={nachname} onChange={(e) => setNachname(e.target.value)}
                  placeholder="Muster"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
              <input type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)}
                placeholder="+41 79 123 45 67"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={profilStatus === "saving"}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 transition-colors">
                {profilStatus === "saving" ? "Wird gespeichert…"
                  : profilStatus === "ok"    ? "✓ Gespeichert!"
                  : profilStatus === "error" ? "Fehler – nochmals versuchen"
                  : "Angaben speichern"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Gespeicherte Szenarien ────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Meine Szenarien</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gespeicherte Berechnungen – klicke auf «Laden» um sie in der Simulation zu öffnen.
              </p>
            </div>
            <span className="text-xs bg-slate-200 text-slate-600 font-medium px-2.5 py-1 rounded-full">
              {szenarien.length} gespeichert
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {ladeStatus === "loading" && <p className="px-6 py-4 text-sm text-slate-400 italic">Wird geladen…</p>}
            {ladeStatus === "error"   && <p className="px-6 py-4 text-sm text-red-500">Fehler beim Laden der Szenarien.</p>}
            {ladeStatus === "ok" && szenarien.length === 0 && (
              <p className="px-6 py-4 text-sm text-slate-400 italic">
                Noch keine Szenarien gespeichert. Führe eine Simulation durch und klicke auf «Speichern».
              </p>
            )}
            {szenarien.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(s.created_at).toLocaleDateString("de-CH", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSzenarionLaden(s.inputs)}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-1.5 rounded-md transition-colors">
                    Laden
                  </button>
                  <button onClick={() => handleSzenarionLoeschen(s.id)}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium px-3 py-1.5 rounded-md transition-colors">
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Finanzangaben (werden als Profil-Standardwerte gespeichert) ── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-900">Meine Finanzangaben</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Diese Werte werden als Standardwerte in der Simulation verwendet. Ändere sie hier und speichere sie für künftige Simulationen.
            </p>
          </div>
          <div className="p-6">
            {simSpeichernStatus === "ok" && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800">
                ✓ Angaben erfolgreich gespeichert.
              </div>
            )}
            {simSpeichernStatus === "error" && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
                Fehler beim Speichern – bitte nochmals versuchen.
              </div>
            )}
            {ladeStatus === "loading" && <p className="text-sm text-slate-400 italic py-4">Lade gespeicherte Angaben…</p>}
            {ladeStatus === "error"   && <p className="text-sm text-red-500 py-4">Fehler beim Laden der Profildaten.</p>}
            {ladeStatus === "ok" && (
              <SimulationForm
                initialInputs={simInputs}
                onSimulate={handleSimInputsSpeichern}
                loading={simSpeichernStatus === "saving"}
                buttonLabel="Angaben speichern"
              />
            )}
          </div>
        </div>

        {/* ── Steuerkonstanten (Nur-Lese-Anzeige aus Supabase) ──────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-900">Steuerparameter</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kantonale Steuerkonstanten – Grundlage der Berechnungen. Diese Parameter sind fest hinterlegt und können nicht geändert werden.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-slate-600 font-medium">Parameter</th>
                  <th className="text-right px-6 py-3 text-slate-600 font-medium">Wert</th>
                  <th className="text-left px-6 py-3 text-slate-600 font-medium">Einheit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {konstanten.map((k) => (
                  <tr key={k.schluessel} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-700">{k.beschreibung}</td>
                    <td className="px-6 py-3 text-right font-mono font-medium text-slate-900">
                      {/* Prozentwerte mit zwei Dezimalstellen, Zahlen mit Schweizer Trennzeichen */}
                      {k.einheit.includes("%")
                        ? `${(k.wert * 100).toFixed(2)}%`
                        : k.wert.toLocaleString("de-CH")}
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-xs">{k.einheit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
