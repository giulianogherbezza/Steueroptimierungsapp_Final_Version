// Kernlogik der Steueroptimierungs-Simulation.
//
// runAllSimulations() berechnet alle 6 Kombinationen (2 Kantone × 3 Szenarien)
// und gibt die vollständigen Jahresreihen zurück.
//
// Aufbau einer Jahresberechnung:
//   1. Einnahmen ermitteln (Lohn, AHV, PK-Rente – abhängig vom Pensionierungsstatus)
//   2. Ausgaben ermitteln (Lebenshaltung, Hypothekarzinsen, Unterhalt, Amortisation, 3a)
//   3. Vorsorgebezüge und Kapitalauszahlungssteuern berechnen
//   4. Zwei-Durchlauf-Besteuerung: erst mit Start-Portfolio schätzen, dann mit
//      End-Portfolio präzisieren (Excel löst das mit einer zirkulären Referenz)
//   5. Portfolio fortschreiben und Jahreswerte in die Ergebnisliste eintragen
//
// Alle Beträge in CHF 1000, sofern nicht anders angegeben.

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
import type { SimulationsKonstanten, SteuerTabellen } from "./steuerKonstanten";

const START_JAHR = 2023;
const END_JAHR   = 2032;

/**
 * Fallback-Konstanten – werden verwendet wenn Supabase nicht erreichbar ist.
 * Entsprechen den Werten in der Aufgabenstellung / Excel-Vorlage.
 */
const DEFAULTS: SimulationsKonstanten = {
  inflationsrate:         0.015,  // 1.5% p.a.
  zins_anlage:            0.03,   // 3.0% Portfoliorendite
  zins_fk:                0.003,  // 0.3% Freizügigkeitskonten
  zins_sa3:               0.03,   // 3.0% Säule 3a
  zins_lv:                0.003,  // 0.3% Lebensversicherung
  zins_pk:                0.01,   // 1.0% PK-Kapital Frau (wartet bis Auszahlung)
  sicherheitsreserve:     100,    // CHF 100'000 feste Liquiditätsreserve
  unterhalt_prozent:      0.0075, // 0.75% des Verkehrswerts p.a.
  versicherungspauschale: 3,      // CHF 3'000 Versicherungsabzug
  vergabungen:            1.5,    // CHF 1'500 Vergabungen/Spenden
  sozialabzug_bern:       10.4,   // CHF 10'400 Sozialabzug Kanton Bern
  sa3_pro_person:         6.883,  // Max. 3a-Einzahlung pro Person (CHF 6'883)
  ahv_einzel:             29.4,   // CHF 29'400 AHV-Rente Einzelperson p.a.
  ahv_paar:               44.7,   // CHF 44'700 AHV-Rente Ehepaar p.a.
  pk_rente_herr:          40,     // CHF 40'000 PK-Rente Herr p.a.
};

/** Rückgabetyp der internen Steuerberechnungsfunktion */
interface TaxResult {
  steuern: number;
  einkommenssteuer: number;
  vermoegenssteuer: number;
  steuerbaresEinkommen: number;
  steuerbaresVermoegen: number;
}

/**
 * Steuerbares Einkommen und Vermögen berechnen und daraus die kantonalen
 * Einkommens- und Vermögenssteuern ableiten.
 *
 * Steuerbares Einkommen:
 *   Einnahmen + Wertschriftenerträge (1.5% des Portfolios) + Eigenmietwert
 *   − Hypothekarzinsen − Unterhaltsabzug (20% der Unterhaltskosten)
 *   − Versicherungspauschale − Berufsauslagen − Zweiverdienerabzug
 *   − Säule 3a − Kinderabzug − Vergabungen − Sozialabzug (nur Bern)
 *
 * Steuerbares Vermögen:
 *   Portfolio + Sicherheitsreserve + LV-Rückkaufswert + Steuerwert Liegenschaft
 *   − Hypothekenschulden − Steuerfreier Betrag (nur Bern)
 */
function berechneTaxen(
  portfolioEnd: number,
  lvEnd: number,
  steuerwertLiegenschaft: number,
  hypothekenTotal: number,
  totalEinnahmen: number,
  hypothekarzinsen: number,
  unterhaltsabzug: number,
  saeule3aBeitraege: number,
  berufsauslagen: number,
  zweiverdienerabzug: number,
  kinderabzug: number,
  sozialabzug: number,
  steuerfreierBetrag: number,
  kanton: Kanton,
  eigenmietwert: number,
  k: SimulationsKonstanten,
  tabellen?: SteuerTabellen
): TaxResult {
  // Wertschriftenerträge: pauschal 1.5% des Portfolios (Dividenden / Zinsen)
  const wertschriften = Math.round(portfolioEnd * 0.015 * 1000) / 1000;

  const steuerbaresEinkommen = Math.max(0, Math.round((
    totalEinnahmen + wertschriften + eigenmietwert
    - hypothekarzinsen - unterhaltsabzug - k.versicherungspauschale
    - berufsauslagen - zweiverdienerabzug - saeule3aBeitraege
    - kinderabzug - k.vergabungen - sozialabzug
  ) * 1000) / 1000);

  // Steuerbare Aktiven: Portfolio + Sicherheitsreserve + LV (solange nicht ausbezahlt)
  const steuerbarAktiven = portfolioEnd + k.sicherheitsreserve + lvEnd;
  const steuerbaresVermoegen = Math.max(0, Math.round((
    steuerbarAktiven + steuerwertLiegenschaft - hypothekenTotal - steuerfreierBetrag
  ) * 1000) / 1000);

  const einkommenssteuer = berechneEinkommenssteuer(steuerbaresEinkommen, kanton, tabellen);
  const vermoegenssteuer = berechneVermoegenssteuer(steuerbaresVermoegen, kanton, tabellen);
  const steuern = Math.round((einkommenssteuer + vermoegenssteuer) * 1000) / 1000;

  return { steuern, einkommenssteuer, vermoegenssteuer, steuerbaresEinkommen, steuerbaresVermoegen };
}

/**
 * Einzelne Simulation für einen Kanton und ein Szenario.
 * Gibt alle Jahreszeilen (2023–2032) sowie die Gesamtsteuern zurück.
 */
export function runSimulation(
  inputs: SimulationInputs,
  k: SimulationsKonstanten = DEFAULTS,
  tabellen?: SteuerTabellen
): SimulationResult {
  const { personal, vorsorge, liquiditaet, liegenschaft, kanton, szenario } = inputs;

  // Konstanten in lokale Variablen entpacken für bessere Lesbarkeit
  const INFLATIONSRATE         = k.inflationsrate;
  const ZINS_ANLAGE            = k.zins_anlage;
  const ZINS_FK                = k.zins_fk;
  const ZINS_SA3               = k.zins_sa3;
  const ZINS_LV                = k.zins_lv;
  const ZINS_PK                = k.zins_pk;
  const SICHERHEITSRESERVE     = k.sicherheitsreserve;
  const UNTERHALT_PROZENT      = k.unterhalt_prozent;
  const SOZIALABZUG_BERN       = k.sozialabzug_bern;
  const SA3_PRO_PERSON         = k.sa3_pro_person;
  const AHV_EINZEL             = k.ahv_einzel;
  const AHV_PAAR               = k.ahv_paar;
  const PK_RENTE_HERR          = k.pk_rente_herr;

  // Geburtsjahr und -monat für Pensionierungsberechnung
  const geburtsjahrHerr  = parseInt(personal.geburtsdatumHerr.substring(0, 4));
  const geburtsmonatHerr = parseInt(personal.geburtsdatumHerr.substring(5, 7));
  const geburtsjahrFrau  = parseInt(personal.geburtsdatumFrau.substring(0, 4));
  const geburtsmonatFrau = parseInt(personal.geburtsdatumFrau.substring(5, 7));

  // Verfallsjahr und -monat der drei Hypotheken (für Zinssatz-Wechsel)
  const h1VJ = parseInt(liegenschaft.hypothek1Verfall.substring(0, 4));
  const h2VJ = parseInt(liegenschaft.hypothek2Verfall.substring(0, 4));
  const h3VJ = parseInt(liegenschaft.hypothek3Verfall.substring(0, 4));
  const h1VM = parseInt(liegenschaft.hypothek1Verfall.substring(5, 7));
  const h2VM = parseInt(liegenschaft.hypothek2Verfall.substring(5, 7));
  const h3VM = parseInt(liegenschaft.hypothek3Verfall.substring(5, 7));

  const pensionJahrHerr = geburtsjahrHerr + 65;
  const pensionJahrFrau = geburtsjahrFrau + 65;

  // Pensioniert = Alter über 65 (volle Jahreswirkung)
  const isPensioniert = (gebJahr: number, _gebMonat: number, j: number) => {
    return (j - gebJahr) > 65;
  };
  // Mid-Year = Pensionierungsjahr bei Geburtsmonat Jan–Jun (halbe Jahreswirkung)
  const isMidYear = (gebJahr: number, gebMonat: number, j: number) => {
    const alter = j - gebJahr;
    return alter === 65 && gebMonat >= 1 && gebMonat <= 6;
  };

  // Anfangswerte der veränderlichen Grössen
  let portfolio = liquiditaet.etfFrau + (liquiditaet.etfHerr ?? 0);
  let h1 = liegenschaft.hypothek1;
  let h2 = liegenschaft.hypothek2;
  let h3 = liegenschaft.hypothek3;

  // Vorsorgekonten – werden im Laufe der Simulation schrittweise aufgelöst
  let s3aH1 = vorsorge.saeule3aHerr1;
  let s3aH2 = vorsorge.saeule3aHerr2;
  let s3aF1 = vorsorge.saeule3aFrau1;
  let s3aF2 = vorsorge.saeule3aFrau2;
  let s3aF3 = vorsorge.saeule3aFrau3;
  let fk1H  = vorsorge.freizuegigkeit1Herr;
  let fk2H  = vorsorge.freizuegigkeit2Herr;
  let pkF   = vorsorge.pkFrau;
  let lv    = vorsorge.lebensversicherungBetrag;
  // Angesammeltes 3a-Konto Frau (laufende Einzahlungen, bis Pensionierung Herr)
  let s3aFAccum = 0;

  const jahre: JahresDaten[] = [];
  let totalSteuern = 0;

  for (let jahr = START_JAHR; jahr <= END_JAHR; jahr++) {
    const jahreNachStart = jahr - START_JAHR;
    const hP   = isPensioniert(geburtsjahrHerr, geburtsmonatHerr, jahr);
    const hM   = isMidYear(geburtsjahrHerr, geburtsmonatHerr, jahr);
    const fP   = isPensioniert(geburtsjahrFrau, geburtsmonatFrau, jahr);
    const fM   = isMidYear(geburtsjahrFrau, geburtsmonatFrau, jahr);
    const beideP = hP && fP;

    // ─── EINNAHMEN ──────────────────────────────────────────────────────────
    // Im Pensionierungsjahr (hM/fM) gilt je nur ein Viertel des Gesamteinkommens,
    // da beide Ehegatten je die Hälfte des Einkommens beziehen und Herr/Frau nur
    // ein halbes Jahr arbeitet.
    const einkommenHerr = hP ? 0 : hM ? personal.einkommenTotal / 4 : personal.einkommenTotal / 2;
    const einkommenFrau = fP ? 0 : fM ? personal.einkommenTotal / 4 : personal.einkommenTotal / 2;

    // AHV: Ehepaarrente wenn beide pensioniert, sonst Einzelrente, anteilig im Übergangsjahr
    let ahvRente = 0;
    if (hP && fP)     ahvRente = AHV_PAAR;
    else if (hP)      ahvRente = AHV_EINZEL;
    else if (fP)      ahvRente = AHV_EINZEL;
    else if (hM)      ahvRente = AHV_EINZEL * (12 - geburtsmonatHerr) / 12;
    else if (fM)      ahvRente = AHV_EINZEL * (12 - geburtsmonatFrau) / 12;

    // PK-Rente Herr: volle Rente ab dem Jahr nach Pensionierung, anteilig im Übergangsjahr
    const pkRenteHerr = hP ? PK_RENTE_HERR
      : hM ? PK_RENTE_HERR * (12 - geburtsmonatHerr) / 12
      : 0;

    const totalEinnahmen = Math.round((einkommenHerr + einkommenFrau + ahvRente + pkRenteHerr) * 1000) / 1000;

    // ─── AUSGABEN ───────────────────────────────────────────────────────────
    // Lebenshaltungskosten: CHF 110k vor Pension, CHF 80k ab Pension (inflationsbereinigt)
    let lhk: number;
    if (hP || hM) {
      lhk = 80 * Math.pow(1 + INFLATIONSRATE, jahr - pensionJahrHerr + 1);
    } else {
      lhk = 110 * Math.pow(1 + INFLATIONSRATE, jahreNachStart);
    }
    const lebenshaltungskosten = Math.round(lhk * 1000) / 1000;

    // Hypothekarzinsen: gewichteter Jahreszins, beim Verfalljahr anteilig alt/neu
    const hypothekenTotalStart = h1 + h2 + h3;
    const hypothekarzinsen = berechneHyp(
      h1, h2, h3, jahr,
      liegenschaft.hypothek1ZinsSatzAlt, liegenschaft.hypothek1ZinsSatzNeu,
      liegenschaft.hypothek2ZinsSatzAlt, liegenschaft.hypothek2ZinsSatzNeu,
      liegenschaft.hypothek3ZinsSatzAlt, liegenschaft.hypothek3ZinsSatzNeu,
      h1VJ, h2VJ, h3VJ, h1VM, h2VM, h3VM
    );

    // Liegenschaftsunterhalt: 0.75% des Verkehrswerts; steuerlich abziehbar: 20% davon
    const unterhaltskosten  = Math.round(liegenschaft.verkehrswert * UNTERHALT_PROZENT * 1000) / 1000;
    const unterhaltsabzug   = Math.round(unterhaltskosten * 0.20 * 1000) / 1000;

    // Amortisation und neue Hypothekenwerte gemäss Szenario
    const { amortisation, nH1, nH2, nH3 } = getAmort(szenario, jahr, h1, h2, h3);
    const hypothekenTotalEnd = nH1 + nH2 + nH3;

    // Säule 3a: Herr zahlt noch im Pensionierungsjahr ein, Frau bis zur eigenen Pension
    const saeule3aBeitraege = beideP ? 0
      : SA3_PRO_PERSON * ((!hP || jahr === pensionJahrHerr ? 1 : 0) + (!fP ? 1 : 0));

    // Steuerabzüge
    const kinderInAusbildung  = Math.max(0, personal.kinderStudierenJahre - jahreNachStart);
    const berufsauslagen      = beideP ? 0 : hP || fP ? 6 : hM || fM ? 9 : 12;
    const zweiverdienerabzug  = beideP ? 0 : hP || fP ? 0 : hM || fM ? 4.65 : 9.3;
    const kinderabzug         = kinderInAusbildung > 0 ? (kanton === "Bern" ? 8 : 9) : 0;
    const sozialabzug         = kanton === "Bern" ? SOZIALABZUG_BERN : 0;
    const steuerfreierBetrag  = kanton === "Bern"
      ? (kinderInAusbildung > 0 ? personal.kinderAnzahl * 18 : 18)
      : 0;

    // ─── PENSIONSKASSE / VORSORGE-CASHFLOWS ─────────────────────────────────
    // Zu Beginn der Simulation: Liquidität (abzgl. Sicherheitsreserve) ins Portfolio überführen
    const liqZufluss = jahr === START_JAHR
      ? Math.max(0, liquiditaet.liquiditaetHerr + liquiditaet.liquiditaetFrau - SICHERHEITSRESERVE)
      : 0;

    // Lebensversicherung: wächst jährlich, wird bei Pensionierung Frau ausbezahlt
    const lvEnd     = lv > 0 ? Math.round(lv * (1 + ZINS_LV) * 1000) / 1000 : 0;
    const lvZufluss = (jahr === pensionJahrFrau && lvEnd > 0) ? lvEnd : 0;

    // Alle Vorsorgekonten wachsen zuerst, dann werden die Bezüge abgezogen
    const s3aH1This     = Math.round(s3aH1 * (1 + ZINS_SA3) * 1000) / 1000;
    const s3aH2This     = Math.round(s3aH2 * (1 + ZINS_SA3) * 1000) / 1000;
    const s3aF1This     = Math.round(s3aF1 * (1 + ZINS_SA3) * 1000) / 1000;
    const s3aF2This     = Math.round(s3aF2 * (1 + ZINS_SA3) * 1000) / 1000;
    const s3aF3Contrib  = (!fP && !fM) ? SA3_PRO_PERSON : 0;
    const s3aF3This     = Math.round((s3aF3 + s3aF3Contrib) * (1 + ZINS_SA3) * 1000) / 1000;
    const fk1HThis      = Math.round(fk1H * (1 + ZINS_FK) * 1000) / 1000;
    const fk2HThis      = Math.round(fk2H * (1 + ZINS_FK) * 1000) / 1000;
    const pkFThis       = Math.round(pkF * (1 + ZINS_PK) * 1000) / 1000;
    const s3aFAccumContrib = (!fP && !fM) ? SA3_PRO_PERSON : 0;
    const s3aFAccumThis = Math.round((s3aFAccum + s3aFAccumContrib) * (1 + ZINS_SA3) * 1000) / 1000;

    // Vorsorgebezüge gemäss Szenario und Pensionierungsjahr
    const pb = getPensionBezug(szenario, jahr, pensionJahrHerr, pensionJahrFrau,
      { s3aH1This, s3aH2This, s3aF1This, fk1HThis, fk2HThis, pkFThis, s3aF2This, s3aF3This, s3aFAccumThis },
      SA3_PRO_PERSON);
    // Kapitalauszahlungssteuer auf Vorsorgebezüge (wird vom Portfolio abgezogen)
    const kapitalsteuer = berechneKapitalauszahlungssteuer(pb.total, kanton);

    // ─── ZWEI-DURCHLAUF-BESTEUERUNG ─────────────────────────────────────────
    // Excel verwendet eine zirkuläre Referenz: Steuern hängen vom End-Portfolio ab,
    // das selbst von den Steuern abhängt. Hier wird dies mit zwei Durchläufen
    // approximiert: Schätzung mit Start-Portfolio, danach Präzisierung mit End-Portfolio.

    // Alle gleichbleibenden Tax-Argumente als Tuple zusammenfassen
    const taxArgs = [
      hypothekarzinsen, unterhaltsabzug, saeule3aBeitraege, berufsauslagen,
      zweiverdienerabzug, kinderabzug, sozialabzug, steuerfreierBetrag,
      kanton, liegenschaft.eigenmietwert, k, tabellen,
    ] as const;

    // Durchlauf 1: Steuern mit Start-Portfolio schätzen → Portfolio-Ende abschätzen
    const tax1 = berechneTaxen(portfolio, lvEnd, liegenschaft.steuerwert, hypothekenTotalStart, totalEinnahmen, ...taxArgs);
    const ausgaben1    = Math.round((lebenshaltungskosten + hypothekarzinsen + unterhaltskosten + amortisation + saeule3aBeitraege + tax1.steuern) * 1000) / 1000;
    const sparen1      = Math.round((totalEinnahmen - ausgaben1) * 1000) / 1000;
    const portfolioEnd = Math.round((portfolio + sparen1 + liqZufluss + lvZufluss + pb.total - kapitalsteuer) * (1 + ZINS_ANLAGE) * 1000) / 1000;

    // Durchlauf 2: Steuern mit End-Portfolio präzisieren (LV ist ab Auszahlungsjahr 0)
    const tax = berechneTaxen(portfolioEnd, lvZufluss > 0 ? 0 : lvEnd, liegenschaft.steuerwert, hypothekenTotalStart, totalEinnahmen, ...taxArgs);

    const totalAusgaben = Math.round((lebenshaltungskosten + hypothekarzinsen + unterhaltskosten + amortisation + saeule3aBeitraege + tax.steuern) * 1000) / 1000;
    const sparenVerzehr = Math.round((totalEinnahmen - totalAusgaben) * 1000) / 1000;

    // ─── ZUSTAND FORTSCHREIBEN ───────────────────────────────────────────────
    portfolio = portfolioEnd;
    h1 = nH1; h2 = nH2; h3 = nH3;

    // Vorsorgekonten: auf 0 setzen wenn bezogen, sonst gewachsenen Wert behalten
    lv    = lvZufluss > 0 ? 0 : lvEnd;
    s3aH1 = pb.s3aH1Used ? 0 : s3aH1This;
    s3aH2 = pb.s3aH2Used ? 0 : s3aH2This;
    s3aF1 = pb.s3aF1Used ? 0 : s3aF1This;
    s3aF2 = pb.s3aF2Used ? 0 : s3aF2This;
    s3aF3 = pb.s3aF3Used ? 0 : s3aF3This;
    fk1H  = pb.fk1HUsed  ? 0 : fk1HThis;
    fk2H  = pb.fk2HUsed  ? 0 : fk2HThis;
    // PK Frau: bei Teilbezug den Rest behalten, bei Vollbezug auf 0 setzen
    if (pb.pkFRestUsed)        pkF = 0;
    else if (pb.pkFPartial > 0) pkF = Math.max(0, Math.round((pkFThis - pb.pkFPartial) * 1000) / 1000);
    else                        pkF = pkFThis;
    s3aFAccum = pb.s3aFAccumUsed ? 0 : s3aFAccumThis;

    totalSteuern += tax.steuern;

    // Freies Vermögen = Anlagevermögen (Portfolio) + Sicherheitsreserve (CHF 100k)
    const totalFreiesVermoegen = SICHERHEITSRESERVE + portfolio;
    const totalVermoegen = totalFreiesVermoegen;

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
      amortisationen: amortisation,
      saeule3aBeitraege,
      steuern: tax.steuern,
      totalAusgaben,
      sparenVerzehr,
      liquiditaetsreserve: SICHERHEITSRESERVE,
      anlagevermoegen: portfolio,
      totalFreiesVermoegen,
      totalBeweglichesVermoegen: 0,
      liegenschaft: liegenschaft.verkehrswert,
      hypothekenTotal: hypothekenTotalEnd,
      totalVermoegen,
      steuerbaresEinkommen: tax.steuerbaresEinkommen,
      steuerbaresVermoegen: tax.steuerbaresVermoegen,
      einkommenssteuer: tax.einkommenssteuer,
      vermoegenssteuer: tax.vermoegenssteuer,
    });
  }

  return {
    kanton,
    szenario,
    jahre,
    totalSteuern: Math.round(totalSteuern * 1000) / 1000,
    // endvermoegen = Portfolio + 100k Reserve (für Empfehlung: −100 für reines Anlagevermögen)
    endvermoegen: jahre[jahre.length - 1].totalVermoegen,
  };
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

/**
 * Jährliche Hypothekarzinsen für alle drei Tranchen berechnen.
 * Im Verfallsjahr wird der Zins anteilig (Monate mit altem/neuem Satz) berechnet.
 */
function berechneHyp(
  h1: number, h2: number, h3: number, jahr: number,
  h1ZAlt: number, h1ZNeu: number,
  h2ZAlt: number, h2ZNeu: number,
  h3ZAlt: number, h3ZNeu: number,
  h1VJ: number, h2VJ: number, h3VJ: number,
  h1VM: number, h2VM: number, h3VM: number
): number {
  // Für eine Tranche: Zins je nach Relation zum Verfallsjahr berechnen
  const calc = (h: number, vj: number, vm: number, zAlt: number, zNeu: number) => {
    if (h === 0) return 0;
    if (jahr < vj) return h * zAlt;  // Noch alter Satz
    if (jahr > vj) return h * zNeu;  // Neuer Satz gilt das ganze Jahr
    // Verfallsjahr: vm Monate zu altem Satz, Rest zu neuem Satz
    return h * (vm / 12 * zAlt + (12 - vm) / 12 * zNeu);
  };
  return Math.round((
    calc(h1, h1VJ, h1VM, h1ZAlt, h1ZNeu) +
    calc(h2, h2VJ, h2VM, h2ZAlt, h2ZNeu) +
    calc(h3, h3VJ, h3VM, h3ZAlt, h3ZNeu)
  ) * 1000) / 1000;
}

/**
 * Amortisationsbetrag und neue Hypothekenwerte für das jeweilige Jahr bestimmen.
 * Die Tilgungszeitpunkte sind direkt aus der Aufgabenstellung übernommen.
 *
 * Frühest:        2024 Tilgung CHF 1000k (H1 auf 0, H2 auf 100), 2025+2026 je 200k
 * Spätmöglichst:  Alles in 2032 (CHF 1500k)
 * Gestaffelt:     2024 CHF 400k (H1), 2025 CHF 100k, 2028 CHF 700k (H2+H3 mittels PKF)
 */
function getAmort(
  szenario: Szenario, jahr: number, h1: number, h2: number, h3: number
): { amortisation: number; nH1: number; nH2: number; nH3: number } {
  if (szenario === "fruehest") {
    if (jahr === 2024) return { amortisation: 1000, nH1: 0, nH2: 100, nH3: h3 };
    if (jahr === 2025) return { amortisation: 200,  nH1: 0, nH2: 0,   nH3: 200 };
    if (jahr === 2026) return { amortisation: 200,  nH1: 0, nH2: 0,   nH3: 0 };
  }
  if (szenario === "spaetmoeglichst") {
    if (jahr === 2032) return { amortisation: 1500, nH1: 0, nH2: 0, nH3: 0 };
  }
  if (szenario === "gestaffelt") {
    if (jahr === 2024) return { amortisation: 400, nH1: 0, nH2: h2, nH3: h3 };
    if (jahr === 2025) return { amortisation: 100, nH1: 0, nH2: 700, nH3: h3 };
    if (jahr === 2028) return { amortisation: 700, nH1: 0, nH2: 0,   nH3: 0 };
  }
  // Kein Amortisationsereignis in diesem Jahr
  return { amortisation: 0, nH1: h1, nH2: h2, nH3: h3 };
}

/** Gewachsene Vorsorgewerte für die Bezugsberechnung (alle nach Verzinsung) */
interface PensionGrownValues {
  s3aH1This: number; s3aH2This: number; s3aF1This: number;
  fk1HThis: number;  fk2HThis: number;  pkFThis: number;
  s3aF2This: number; s3aF3This: number; s3aFAccumThis: number;
}

/** Ergebnis der Bezugsberechnung: Gesamtbetrag und Flags welche Konten geleert wurden */
interface PensionBezug {
  total: number;
  pkFPartial: number;      // Teilbezug PK Frau 2024
  s3aH1Used: boolean;      // 3a I Herr vollständig bezogen
  s3aH2Used: boolean;
  s3aF1Used: boolean;
  fk1HUsed: boolean;
  fk2HUsed: boolean;
  pkFRestUsed: boolean;    // PK Frau Restbetrag vollständig bezogen (bei Pension Frau)
  s3aF2Used: boolean;
  s3aF3Used: boolean;
  s3aFAccumUsed: boolean;  // Angesammeltes 3a Frau bezogen
}

/**
 * Vorsorgebezüge für das jeweilige Jahr berechnen.
 * Die Bezugsjahre sind aus der Aufgabenstellung fixiert:
 *   2023 – 3a I Herr
 *   2024 – PK Frau Teilbezug (700k normal, 400k gestaffelt) + Amortisation
 *   2025 – 3a II Herr
 *   2026 – 3a I Frau
 *   2027 – FK 1 Herr
 *   PensionJahrHerr – FK 2 Herr, 3a Frau II+III+Accum
 *   PensionJahrFrau – PK Frau Rest + neuer 3a-Beitrag
 */
function getPensionBezug(
  szenario: Szenario, jahr: number,
  pensionJahrHerr: number, pensionJahrFrau: number,
  g: PensionGrownValues,
  sa3ProPerson: number
): PensionBezug {
  const r: PensionBezug = {
    total: 0, pkFPartial: 0,
    s3aH1Used: false, s3aH2Used: false, s3aF1Used: false,
    fk1HUsed: false,  fk2HUsed: false,  pkFRestUsed: false,
    s3aF2Used: false, s3aF3Used: false, s3aFAccumUsed: false,
  };

  // Fixierte Bezugsjahre (nach Verzinsung des jeweiligen Jahres)
  if (jahr === 2023) { r.s3aH1Used = true;  r.total += g.s3aH1This; }
  if (jahr === 2025) { r.s3aH2Used = true;  r.total += g.s3aH2This; }
  if (jahr === 2026) { r.s3aF1Used = true;  r.total += g.s3aF1This; }
  if (jahr === 2027) { r.fk1HUsed  = true;  r.total += g.fk1HThis;  }

  // Pensionierung Herr: FK 2, angesammeltes 3a Frau, 3a II + III Frau
  if (jahr === pensionJahrHerr) {
    r.fk2HUsed      = true; r.total += g.fk2HThis;
    r.s3aFAccumUsed = true; r.total += g.s3aFAccumThis;
    r.s3aF2Used     = true; r.total += g.s3aF2This;
    r.s3aF3Used     = true; r.total += g.s3aF3This;
  }

  // Pensionierung Frau: PK Frau Restbezug + letzter 3a-Beitrag
  if (jahr === pensionJahrFrau) {
    r.pkFRestUsed = true;
    r.total += g.pkFThis + sa3ProPerson;
  }

  // PK Frau Teilbezug 2024 für Amortisation (Betrag abhängig vom Szenario)
  if (jahr === 2024) {
    r.pkFPartial = szenario === "gestaffelt" ? 400 : 700;
    r.total += r.pkFPartial;
  }

  return r;
}

/**
 * Alle 6 Simulationen ausführen (2 Kantone × 3 Szenarien).
 * Kanton und Szenario werden intern kombiniert, sodass der Aufrufer
 * nur die gemeinsamen Eingabedaten übergeben muss.
 */
export function runAllSimulations(
  inputs: Omit<SimulationInputs, "kanton" | "szenario">,
  konstanten?: SimulationsKonstanten,
  tabellen?: SteuerTabellen
): SimulationResult[] {
  const kantone:   Kanton[]   = ["Bern", "Zuerich"];
  const szenarien: Szenario[] = ["fruehest", "spaetmoeglichst", "gestaffelt"];
  const results: SimulationResult[] = [];
  for (const kanton of kantone) {
    for (const szenario of szenarien) {
      results.push(runSimulation({ ...inputs, kanton, szenario }, konstanten, tabellen));
    }
  }
  return results;
}
