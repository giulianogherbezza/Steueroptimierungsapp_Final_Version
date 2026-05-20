import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Steueroptimierung Hypothekar-Amortisation
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Vergleich der Steuerbelastung bei verschiedenen Amortisationsstrategien
          für die Kantone Bern und Zürich – vor und nach der Pensionierung.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-red-600 font-bold">1</span>
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Frühestmögliche Amortisation</h3>
          <p className="text-sm text-slate-600">
            Hypotheken so schnell wie möglich zurückzahlen. Höhere Steuerbelastung durch wegfallende Zinsabzüge.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-amber-600 font-bold">2</span>
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Spätmöglichste Amortisation</h3>
          <p className="text-sm text-slate-600">
            Hypotheken möglichst lange behalten. Steuerliche Vorteile durch höhere Zinsabzüge.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-green-600 font-bold">3</span>
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Gestaffelte Amortisation</h3>
          <p className="text-sm text-slate-600">
            Vorsorgekapital (PK, 3a, FK) direkt für Amortisationen nutzen – optimierter Mittelweg.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-blue-900 mb-2">Wie es funktioniert</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Persönliche Finanzdaten eingeben (Einkommen, Vermögen, Hypotheken)</li>
          <li>App berechnet alle 3 Szenarien für Bern und Zürich</li>
          <li>Vergleich der Steuerlast über 2023–2032 in Tabellen und Charts</li>
        </ol>
      </div>

      <div className="text-center">
        <Link
          href="/simulation"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Simulation starten →
        </Link>
      </div>
    </div>
  );
}
