import type {
  SimulationInputs,
  SimulationResult,
  JahresDaten,
  Kanton,
  Szenario,
} from "@/types";
import {
  berechneEinkommenssteuer,
  berechneVermoegenssteuer,
  berechneKapitalauszahlungssteuer,
} from "./steuerberechnung";

const START_JAHR = 2023;
const END_JAHR = 2032;
const INFLATIONSRATE = 0.015;
const ZINS_ANLAGEVERMOEGEN = 0.03;
const ZINS_PK = 0.01;
const ZINS_FK = 0.003;
const ZINS_SAEULE3A = 0.03;
const ZINS_LEBENSVERSICHERUNG = 0.003;
const SICHERHEITSRESERVE = 100; // CHF 100k
const LEBENSHALTUNGSKOSTEN_VOR_PENSION = 110;
const LEBENSHALTUNGSKOSTEN_NACH_PENSION = 80;
const AHV_EINZELRENTE = 29.4;
const AHV_EHEPAARRENTE = 44.7;
const EIGENMIETWERT_BERN = 73.5;
const EIGENMIETWERT_ZUERICH = 73.5;
const UNTERHALT_PROZENT = 0.0075;
const STEUERWERT_LIEGENSCHAFT = 2450; // CHF in 1000er
const VERSICHERUNGSPAUSCHALE = 3;
const VERGABUNGEN = 1.5;
const SOZIALABZUG_BERN = 10.4;
const SOZIALABZUG_ZUERICH = 10.4;
const BERUFSAUSLAGEN = 12;
const ZWEIVERDIENERABZUG = 9.3;
const KINDERABZUG = 8;
const STEUERFREIER_BETRAG_BERN_PRO_KIND = 18; // pro Kind in Ausbildung
const SAEULE3A_MAX = 7.258; // 2024er Wert pro Person (wird als 13.766 total verwendet)

function getAlter(geburtsjahr: number, jahr: number): number {
  return jahr - geburtsjahr;
}

function isPensioniert(geburtsdatum: string, jahr: number): boolean {
  const geburtsjahr = parseInt(geburtsdatum.substring(0, 4));
  const geburtsmonat = parseInt(geburtsdatum.substring(5, 7));
  // Pensionierung im Jahr des 65. Geburtstags
  return getAlter(geburtsjahr, jahr) >= 65;
}

function getAmortisationen(
  szenario: Szenario,
  jahr: number,
  hypothek1: number,
  hypothek2: number,
  hypothek3: number,
  kumulativeKapitalauszahlungen?: number
): { betrag: number; h1Rest: number; h2Rest: number; h3Rest: number } {
  // Diese Funktion berechnet die Amortisation je nach Szenario
  // Vereinfachte Version basierend auf dem Excel-Modell

  if (szenario === "fruehest") {
    // S1: Alle Hypotheken so früh wie möglich zurückzahlen
    if (jahr === 2024) return { betrag: 1000, h1Rest: 0, h2Rest: 0, h3Rest: hypothek3 };
    if (jahr === 2025) return { betrag: 200, h1Rest: 0, h2Rest: 0, h3Rest: 100 };
    if (jahr === 2026) return { betrag: 200, h1Rest: 0, h2Rest: 0, h3Rest: 0 };
    return { betrag: 0, h1Rest: 0, h2Rest: 0, h3Rest: 0 };
  }

  if (szenario === "spaetmoeglichst") {
    // S2: Hypotheken erst 2032 tilgen
    if (jahr === 2032) return { betrag: 1500, h1Rest: 0, h2Rest: 0, h3Rest: 0 };
    return { betrag: 0, h1Rest: hypothek1, h2Rest: hypothek2, h3Rest: hypothek3 };
  }

  if (szenario === "gestaffelt") {
    // S3: Kapital aus Vorsorgeauszahlungen direkt amortisieren
    // Vereinfacht: ähnlich S2 aber mit Amortisationen wenn Kapital verfügbar
    if (jahr === 2029) return { betrag: 700, h1Rest: hypothek1 / 2, h2Rest: hypothek2 / 2, h3Rest: 0 };
    if (jahr === 2032) return { betrag: 800, h1Rest: 0, h2Rest: 0, h3Rest: 0 };
    return { betrag: 0, h1Rest: hypothek1, h2Rest: hypothek2, h3Rest: hypothek3 };
  }

  return { betrag: 0, h1Rest: hypothek1, h2Rest: hypothek2, h3Rest: hypothek3 };
}

function berechneHypothekarzinsen(
  h1: number, h2: number, h3: number,
  jahr: number,
  zinsSatzAlt: number,
  zinsSatzNeu: number,
  h1VerfalJahr: number, h2VerfalJahr: number, h3VerfalJahr: number
): number {
  const z1 = jahr <= h1VerfalJahr ? zinsSatzAlt : zinsSatzNeu;
  const z2 = jahr <= h2VerfalJahr ? zinsSatzAlt : zinsSatzNeu;
  const z3 = jahr <= h3VerfalJahr ? zinsSatzAlt : zinsSatzNeu;

  // Für 2024: anteilige Berechnung (Hypotheken laufen zu unterschiedlichen Zeiten ab)
  if (jahr === 2024) {
    const anteilH1 = (5 / 12) * zinsSatzAlt + (7 / 12) * zinsSatzNeu; // Verfall Mai
    const anteilH2 = (10 / 12) * zinsSatzAlt + (2 / 12) * zinsSatzNeu; // Verfall Okt
    return Math.round((h1 * anteilH1 + h2 * anteilH2 + h3 * zinsSatzAlt) * 1000) / 1000;
  }

  return Math.round((h1 * z1 + h2 * z2 + h3 * z3) * 1000) / 1000;
}

export function runSimulation(inputs: SimulationInputs): SimulationResult {
  const { personal, vorsorge, liquiditaet, liegenschaft, kanton, szenario } = inputs;

  const geburtsjahrHerr = parseInt(personal.geburtsdatumHerr.substring(0, 4));
  const geburtsjahrFrau = parseInt(personal.geburtsdatumFrau.substring(0, 4));
  const h1VerfalJahr = parseInt(liegenschaft.hypothek1Verfall.substring(0, 4));
  const h2VerfalJahr = parseInt(liegenschaft.hypothek2Verfall.substring(0, 4));
  const h3VerfalJahr = parseInt(liegenschaft.hypothek3Verfall.substring(0, 4));

  const eigenmietwert = kanton === "Bern" ? EIGENMIETWERT_BERN : EIGENMIETWERT_ZUERICH;

  // Anfangswerte
  let anlagevermoegen = liquiditaet.etfFrau; // 155k
  let h1 = liegenschaft.hypothek1;
  let h2 = liegenschaft.hypothek2;
  let h3 = liegenschaft.hypothek3;

  // Bewegliche Vermögen (werden gestaffelt ausgezahlt)
  let pkHerr = vorsorge.pkHerr;
  let pkFrau = vorsorge.pkFrau;
  let fk1Herr = vorsorge.freizuegigkeit1Herr;
  let fk2Herr = vorsorge.freizuegigkeit2Herr;
  let s3a1Herr = vorsorge.saeule3aHerr1;
  let s3a2Herr = vorsorge.saeule3aHerr2;
  let s3a3Herr = 0; // neu in 2023 aufgebaut
  let s3a1Frau = vorsorge.saeule3aFrau1;
  let s3a2Frau = vorsorge.saeule3aFrau2;
  let s3a3Frau = vorsorge.saeule3aFrau3;
  let s3a4Frau = 0; // neu nach Pensionierung
  let lebensversicherung = vorsorge.lebensversicherungBetrag;

  const jahre: JahresDaten[] = [];
  let totalSteuern = 0;

  // Im ersten Jahr: überschüssige Liquidität ins Anlagevermögen
  const initialLiquiditaet = liquiditaet.liquiditaetHerr + liquiditaet.liquiditaetFrau;
  const abbauLiquiditaet = initialLiquiditaet - SICHERHEITSRESERVE; // 230 - 100 = 130

  for (let jahr = START_JAHR; jahr <= END_JAHR; jahr++) {
    const alterHerr = getAlter(geburtsjahrHerr, jahr);
    const alterFrau = getAlter(geburtsjahrFrau, jahr);
    const herrPensioniert = alterHerr >= 65;
    const frauPensioniert = alterFrau >= 65;
    const beidePensioniert = herrPensioniert && frauPensioniert;

    // ─── EINNAHMEN ───────────────────────────────────────────────
    const einkommenHerr = herrPensioniert ? 0 : (alterHerr === 65 ? personal.einkommenTotal / 2 / 2 : personal.einkommenTotal / 2);
    const einkommenFrau = frauPensioniert ? 0 : (alterFrau === 65 ? personal.einkommenTotal / 2 / 2 : personal.einkommenTotal / 2);

    let ahvRente = 0;
    if (herrPensioniert && !frauPensioniert) ahvRente = AHV_EINZELRENTE;
    else if (herrPensioniert && frauPensioniert) ahvRente = AHV_EHEPAARRENTE;
    else if (alterHerr === 65) ahvRente = AHV_EINZELRENTE / 2; // halbes Jahr

    const pkRenteHerr = herrPensioniert ? 40 : (alterHerr === 65 ? 20 : 0);
    const totalEinnahmen = einkommenHerr + einkommenFrau + ahvRente + pkRenteHerr;

    // ─── AUSGABEN ────────────────────────────────────────────────
    const jahreNachStart = jahr - START_JAHR;
    let lebenshaltungskosten: number;
    if (!beidePensioniert && !herrPensioniert) {
      lebenshaltungskosten = LEBENSHALTUNGSKOSTEN_VOR_PENSION * Math.pow(1 + INFLATIONSRATE, jahreNachStart);
    } else {
      lebenshaltungskosten = LEBENSHALTUNGSKOSTEN_NACH_PENSION * Math.pow(1 + INFLATIONSRATE, jahreNachStart);
    }
    lebenshaltungskosten = Math.round(lebenshaltungskosten * 1000) / 1000;

    const hypothekarzinsen = berechneHypothekarzinsen(
      h1, h2, h3, jahr,
      liegenschaft.zinsSatzAlt, liegenschaft.zinsSatzNeu,
      h1VerfalJahr, h2VerfalJahr, h3VerfalJahr
    );
    const unterhaltskosten = Math.round(liegenschaft.verkehrswert * UNTERHALT_PROZENT * 1000) / 1000;

    // Amortisationen (szenarioabhängig)
    const amortiResultat = getAmortisationen(szenario, jahr, h1, h2, h3);
    const amortisationen = amortiResultat.betrag;
    h1 = amortiResultat.h1Rest;
    h2 = amortiResultat.h2Rest;
    h3 = amortiResultat.h3Rest;

    const saeule3aBeitraege = beidePensioniert ? 0 : (herrPensioniert || frauPensioniert ? 6.883 : 13.766);

    // ─── STEUERTABELLE (vorläufig mit Schätzwerten, wird unten berechnet) ───
    // Hilfstabelle Steuern
    const steuerbareEinnahmen = totalEinnahmen;
    const wertschriftenertraege = Math.round(anlagevermoegen * 0.015 * 1000) / 1000;

    // Abzüge
    const kinderInAusbildung = Math.max(0, personal.kinderStudierenJahre - (jahr - START_JAHR));
    const kinderabzug = kinderInAusbildung > 0 ? KINDERABZUG : 0;
    const berufsauslagen = beidePensioniert ? 0 : (herrPensioniert || frauPensioniert ? 6 : BERUFSAUSLAGEN);
    const zweiverdienerabzug = beidePensioniert ? 0 : (herrPensioniert || frauPensioniert ? 4.65 : ZWEIVERDIENERABZUG);
    const steuerfreierBetrag = kanton === "Bern"
      ? (kinderInAusbildung > 0 ? STEUERFREIER_BETRAG_BERN_PRO_KIND * Math.min(kinderInAusbildung, 2) : 18)
      : 0;

    const steuerbaresEinkommen = Math.max(0, Math.round((
      steuerbareEinnahmen
      + wertschriftenertraege
      + eigenmietwert
      - hypothekarzinsen
      - unterhaltskosten * 0.20
      - VERSICHERUNGSPAUSCHALE
      - berufsauslagen
      - zweiverdienerabzug
      - saeule3aBeitraege
      - kinderabzug
      - VERGABUNGEN
      - SOZIALABZUG_BERN
    ) * 1000) / 1000);

    const steuerbarAktiven = liquiditaet.liquiditaetHerr > SICHERHEITSRESERVE
      ? SICHERHEITSRESERVE + anlagevermoegen
      : SICHERHEITSRESERVE + anlagevermoegen;

    const steuerbaresVermoegen = Math.max(0, Math.round((
      steuerbarAktiven
      + STEUERWERT_LIEGENSCHAFT
      - (h1 + h2 + h3)
      - steuerfreierBetrag
    ) * 1000) / 1000);

    const einkommenssteuer = berechneEinkommenssteuer(steuerbaresEinkommen, kanton);
    const vermoegenssteuer = berechneVermoegenssteuer(steuerbaresVermoegen, kanton);
    const steuern = Math.round((einkommenssteuer + vermoegenssteuer) * 1000) / 1000;

    const totalAusgaben = Math.round((
      lebenshaltungskosten + hypothekarzinsen + unterhaltskosten +
      amortisationen + saeule3aBeitraege + steuern
    ) * 1000) / 1000;

    const sparenVerzehr = Math.round((totalEinnahmen - totalAusgaben) * 1000) / 1000;

    // ─── BEWEGLICHES VERMÖGEN (Verzinsung + Auszahlungen) ──────
    // Kapitalauszahlungen aus Vorsorge (gestaffelt, basierend auf Excel-Modell)
    let steuerbareKapitalauszahlungen = 0;
    let nichtSteuerbareKapitalauszahlungen = 0;

    if (jahr === START_JAHR) {
      // 2023: Säule 3a I Hr. ausgezahlt (60k)
      steuerbareKapitalauszahlungen += s3a1Herr;
      s3a1Herr = 0;
    }
    if (jahr === 2024) {
      // 2024: PK Fr. Vorauszahlung 700k
      steuerbareKapitalauszahlungen += 700;
      pkFrau -= 700;
    }
    if (jahr === 2025) {
      // 2025: Säule 3a II Hr. (87k)
      steuerbareKapitalauszahlungen += s3a2Herr;
      s3a2Herr = 0;
    }
    if (jahr === 2026) {
      steuerbareKapitalauszahlungen += s3a1Frau;
      s3a1Frau = 0;
    }
    if (jahr === 2027) {
      steuerbareKapitalauszahlungen += fk1Herr;
      fk1Herr = 0;
    }
    if (herrPensioniert && alterHerr === 65) {
      // PK Hr. als Rentenbezug → kein Kapitalbezug
      steuerbareKapitalauszahlungen += fk2Herr + s3a3Herr;
      fk2Herr = 0;
      s3a3Herr = 0;
    }
    if (beidePensioniert && alterFrau === 65) {
      // PK Fr. Rest als Kapital
      steuerbareKapitalauszahlungen += pkFrau + s3a2Frau + s3a3Frau + s3a4Frau;
      nichtSteuerbareKapitalauszahlungen += lebensversicherung;
      pkFrau = 0;
      s3a2Frau = 0;
      s3a3Frau = 0;
      s3a4Frau = 0;
      lebensversicherung = 0;
    }

    const kapitalauszahlungssteuern = berechneKapitalauszahlungssteuer(
      steuerbareKapitalauszahlungen, kanton
    );

    // Anlagevermögen Berechnung (Hilfstabelle)
    const abbauLiqThisJahr = jahr === START_JAHR ? abbauLiquiditaet : 0;
    anlagevermoegen = Math.round((
      anlagevermoegen * (1 + ZINS_ANLAGEVERMOEGEN)
      + sparenVerzehr
      + abbauLiqThisJahr
      + nichtSteuerbareKapitalauszahlungen
      + steuerbareKapitalauszahlungen
      - kapitalauszahlungssteuern
      - amortisationen
    ) * 1000) / 1000;

    // Bewegliches Vermögen mit Verzinsung
    pkHerr = herrPensioniert ? 0 : Math.round(pkHerr * (1 + ZINS_PK) * 1000) / 1000;
    pkFrau = Math.round(pkFrau * (1 + ZINS_PK) * 1000) / 1000;
    fk1Herr = Math.round(fk1Herr * (1 + ZINS_FK) * 1000) / 1000;
    fk2Herr = Math.round(fk2Herr * (1 + ZINS_FK) * 1000) / 1000;
    s3a2Herr = Math.round(s3a2Herr * (1 + ZINS_SAEULE3A) * 1000) / 1000;
    s3a3Herr = Math.round((s3a3Herr + SAEULE3A_MAX) * (1 + ZINS_SAEULE3A) * 1000) / 1000;
    s3a1Frau = Math.round(s3a1Frau * (1 + ZINS_SAEULE3A) * 1000) / 1000;
    s3a2Frau = Math.round(s3a2Frau * (1 + ZINS_SAEULE3A) * 1000) / 1000;
    s3a3Frau = Math.round((s3a3Frau + SAEULE3A_MAX) * (1 + ZINS_SAEULE3A) * 1000) / 1000;
    lebensversicherung = Math.round(lebensversicherung * (1 + ZINS_LEBENSVERSICHERUNG) * 1000) / 1000;

    const totalBeweglichesVermoegen = pkHerr + pkFrau + fk1Herr + fk2Herr +
      s3a1Herr + s3a2Herr + s3a3Herr + s3a1Frau + s3a2Frau + s3a3Frau + s3a4Frau + lebensversicherung;

    const totalFreiesVermoegen = SICHERHEITSRESERVE + anlagevermoegen;
    const hypothekenTotal = h1 + h2 + h3;
    const totalVermoegen = totalFreiesVermoegen + liegenschaft.verkehrswert - hypothekenTotal;

    totalSteuern += steuern;

    jahre.push({
      jahr,
      einkommenHerr,
      einkommenFrau,
      ahvRente,
      pkRenteHerr,
      totalEinnahmen,
      lebenshaltungskosten,
      hypothekarzinsen,
      unterhaltskosten,
      amortisationen,
      saeule3aBeitraege,
      steuern,
      totalAusgaben,
      sparenVerzehr,
      liquiditaetsreserve: SICHERHEITSRESERVE,
      anlagevermoegen,
      totalFreiesVermoegen,
      totalBeweglichesVermoegen,
      liegenschaft: liegenschaft.verkehrswert,
      hypothekenTotal,
      totalVermoegen,
      steuerbaresEinkommen,
      steuerbaresVermoegen,
      einkommenssteuer,
      vermoegenssteuer,
    });
  }

  return {
    kanton,
    szenario,
    jahre,
    totalSteuern: Math.round(totalSteuern * 1000) / 1000,
    endvermoegen: jahre[jahre.length - 1].totalVermoegen,
  };
}

export function runAllSimulations(
  inputs: Omit<SimulationInputs, "kanton" | "szenario">
): SimulationResult[] {
  const kantone: Kanton[] = ["Bern", "Zuerich"];
  const szenarien: Szenario[] = ["fruehest", "spaetmoeglichst", "gestaffelt"];
  const results: SimulationResult[] = [];

  for (const kanton of kantone) {
    for (const szenario of szenarien) {
      results.push(runSimulation({ ...inputs, kanton, szenario }));
    }
  }

  return results;
}
