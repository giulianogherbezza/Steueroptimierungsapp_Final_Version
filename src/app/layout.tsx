import type { Metadata } from "next";
import "./globals.css";
import UserNav from "@/components/UserNav";

export const metadata: Metadata = {
  title: "Steueroptimierung – Hypothekar-Amortisation Bern & Zürich",
  description: "Steueroptimierungs-App für Hypothekar-Amortisationsszenarien",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Steueroptimierung</h1>
                <p className="text-xs text-slate-500">Hypothekar-Amortisation – Bern &amp; Zürich</p>
              </div>
            </div>
            <UserNav />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
        <footer className="border-t border-slate-200 mt-12 py-4 text-center text-xs text-slate-400">
          Berner Fachhochschule – Praxisprojekt EPRP | Alle Angaben sind fiktiv
        </footer>
      </body>
    </html>
  );
}
