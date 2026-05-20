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
const ZINS_ANLAGE = 0.03;
const ZINS_FK = 0.003;
const ZINS_SA3 = 0.03;
const ZINS_LV = 0.003;
const ZINS_PK = 0.01;
const SICHERHEITSRESERVE = 100;
const EIGENMIETWERT = 73.5;
const UNTERHALT_PROZENT = 0.0075;
const VERSICHERUNGSPAUSCHALE = 3;
const VERGABUNGEN = 1.5;
const SOZIALABZUG_BERN = 10.4;
const SA3_PRO_PERSON = 6.883;
const AHV_EINZEL = 29.4;
const AHV_PAAR = 44.7;
const PK_RENTE_HERR = 40;

interface TaxResult {
  steuern: number;
  einkommenssteuer: number;
  vermoegenssteuer: number;
  steuerbaresEinkommen: number;
  steuerbaresVermoegen: number;
}

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
  kanton: Kanton
): TaxResult {
  const wertschriften = Math.round(portfolioEnd * 0.015 * 1000) / 1000;

  const steuerbaresEinkommen = Math.max(0, Math.round((
    totalEinnahmen + wertschriften + EIGENMIETWERT
    - hypothekarzinsen - unterhaltsabzug - VERSICHERUNGSPAUSCHALE
    - berufsauslagen - zweiverdienerabzug - saeule3aBeitraege
    - kinderabzug - VERGABUNGEN - sozialabzug
  ) * 1000) / 1000);

  const steuerbarAktiven = portfolioEnd + SICHERHEITSRESERVE + lvEnd;
  const steuerbaresVermoegen = Math.max(0, Math.round((
    steuerbarAktiven + steuerwertLiegenschaft - hypothekenTotal - steuerfreierBetrag
  ) * 1000) / 1000);

  const einkommenssteuer = berechneEinkommenssteuer(steuerbaresEinkommen, kanton);
  const vermoegenssteuer = berechneVermoegenssteuer(steuerbaresVermoegen, kanton);
  const steuern = Math.round((einkommenssteuer + vermoegenssteuer) * 1000) / 1000;

  return { steuern, einkommenssteuer, vermoegenssteuer, steuerbaresEinkommen, steuerbaresVermoegen };
}

export function runSimulation(inputs: SimulationInputs): SimulationResult {
  const { personal, vorsorge, liquiditaet, liegenschaft, kanton, szenario } = inputs;

  const geburtsjahrHerr = parseInt(personal.geburtsdatumHerr.substring(0, 4));
  const geburtsmonatHerr = parseInt(personal.geburtsdatumHerr.substring(5, 7));
  const geburtsjahrFrau = parseInt(personal.geburtsdatumFrau.substring(0, 4));
  const geburtsmonatFrau = parseInt(personal.geburtsdatumFrau.substring(5, 7));

  const h1VJ = parseInt(liegenschaft.hypothek1Verfall.substring(0, 4));
  const h2VJ = parseInt(liegenschaft.hypothek2Verfall.substring(0, 4));
  const h3VJ = parseInt(liegenschaft.hypothek3Verfall.substring(0, 4));
  const h1VM = parseInt(liegenschaft.hypothek1Verfall.substring(5, 7));
  const h2VM = parseInt(liegenschaft.hypothek2Verfall.substring(5, 7));
  const h3VM = parseInt(liegenschaft.hypothek3Verfall.substring(5, 7));

  const pensionJahrHerr = geburtsjahrHerr + 65;
  const pensionJahrFrau = geburtsjahrFrau + 65;

  // Born Jan–Jun → retire July 1st at 65 (mid-year); born Jul–Dec → retire Jan 1st next year (full year at 65)
  const isPensioniert = (gebJahr: number, gebMonat: number, j: number) => {
    return (j - gebJahr) > 65;
  };
  const isMidYear = (gebJahr: number, gebMonat: number, j: number) => {
    const alter = j - gebJahr;
    return alter === 65 && gebMonat >= 1 && gebMonat <= 6;
  };

  let portfolio = liquiditaet.etfFrau;
  let h1 = liegenschaft.hypothek1;
  let h2 = liegenschaft.hypothek2;
  let h3 = liegenschaft.hypothek3;

  let s3aH1 = vorsorge.saeule3aHerr1;
  let s3aH2 = vorsorge.saeule3aHerr2;
  let s3aF1 = vorsorge.saeule3aFrau1;
  let s3aF2 = vorsorge.saeule3aFrau2;
  let s3aF3 = vorsorge.saeule3aFrau3;
  let fk1H = vorsorge.freizuegigkeit1Herr;
  let fk2H = vorsorge.freizuegigkeit2Herr;
  let pkF = vorsorge.pkFrau;
  let lv = vorsorge.lebensversicherungBetrag;
  let s3aFAccum = 0;

  const jahre: JahresDaten[] = [];
  let totalSteuern = 0;

  for (let jahr = START_JAHR; jahr <= END_JAHR; jahr++) {
    const jahreNachStart = jahr - START_JAHR;
    const hP = isPensioniert(geburtsjahrHerr, geburtsmonatHerr, jahr);
    const hM = isMidYear(geburtsjahrHerr, geburtsmonatHerr, jahr);
    const fP = isPensioniert(geburtsjahrFrau, geburtsmonatFrau, jahr);
    const fM = isMidYear(geburtsjahrFrau, geburtsmonatFrau, jahr);
    const beideP = hP && fP;

    // ─── EINNAHMEN ─────────────────────────────────────────────────
    const einkommenHerr = hP ? 0 : hM ? personal.einkommenTotal / 4 : personal.einkommenTotal / 2;
    const einkommenFrau = fP ? 0 : fM ? personal.einkommenTotal / 4 : personal.einkommenTotal / 2;

    let ahvRente = 0;
    if (hP && fP) ahvRente = AHV_PAAR;
    else if (hP) ahvRente = AHV_EINZEL;
    else if (fP) ahvRente = AHV_EINZEL;
    else if (hM) ahvRente = AHV_EINZEL * (12 - geburtsmonatHerr) / 12;
    else if (fM) ahvRente = AHV_EINZEL * (12 - geburtsmonatFrau) / 12;

    const pkRenteHerr = hP ? PK_RENTE_HERR
      : hM ? PK_RENTE_HERR * (12 - geburtsmonatHerr) / 12
      : 0;

    const totalEinnahmen = Math.round((einkommenHerr + einkommenFrau + ahvRente + pkRenteHerr) * 1000) / 1000;

    // ─── AUSGABEN (non-steuern parts) ──────────────────────────────
    // Pension-mode LHK (80k base) kicks in when Herr retires (mid-year or full), inflating from pensionJahrHerr-1
    let lhk: number;
    if (hP || hM) {
      lhk = 80 * Math.pow(1 + INFLATIONSRATE, jahr - pensionJahrHerr + 1);
    } else {
      lhk = 110 * Math.pow(1 + INFLATIONSRATE, jahreNachStart);
    }
    const lebenshaltungskosten = Math.round(lhk * 1000) / 1000;

    const hypothekenTotalStart = h1 + h2 + h3;
    const hypothekarzinsen = berechneHyp(h1, h2, h3, jahr, liegenschaft.zinsSatzAlt, liegenschaft.zinsSatzNeu, h1VJ, h2VJ, h3VJ, h1VM, h2VM, h3VM);
    const unterhaltskosten = Math.round(liegenschaft.verkehrswert * UNTERHALT_PROZENT * 1000) / 1000;
    const unterhaltsabzug = Math.round(unterhaltskosten * 0.20 * 1000) / 1000;

    const { amortisation, nH1, nH2, nH3 } = getAmort(szenario, jahr, h1, h2, h3);
    const hypothekenTotalEnd = nH1 + nH2 + nH3;

    // Herr contributes in his retirement year (account withdrawn same year); Frau contributes while not yet retired
    const saeule3aBeitraege = beideP ? 0
      : SA3_PRO_PERSON * ((!hP || jahr === pensionJahrHerr ? 1 : 0) + (!fP ? 1 : 0));

    const kinderInAusbildung = Math.max(0, personal.kinderStudierenJahre - jahreNachStart);
    const berufsauslagen = beideP ? 0 : hP || fP ? 6 : hM || fM ? 9 : 12;
    const zweiverdienerabzug = beideP ? 0 : hP || fP ? 0 : hM || fM ? 4.65 : 9.3;
    const kinderabzug = kinderInAusbildung > 0 ? (kanton === "Bern" ? 8 : 9) : 0;
    const sozialabzug = kanton === "Bern" ? SOZIALABZUG_BERN : 0;
    const steuerfreierBetrag = kanton === "Bern"
      ? (kinderInAusbildung > 0 ? personal.kinderAnzahl * 18 : 18)
      : 0;

    // ─── PENSION CASHFLOWS ─────────────────────────────────────────
    const liqZufluss = jahr === START_JAHR
      ? Math.max(0, liquiditaet.liquiditaetHerr + liquiditaet.liquiditaetFrau - SICHERHEITSRESERVE)
      : 0;

    // LV: grow to end-of-year value, then cash out if Frau retires
    const lvEnd = lv > 0 ? Math.round(lv * (1 + ZINS_LV) * 1000) / 1000 : 0;
    const lvZufluss = (jahr === pensionJahrFrau && lvEnd > 0) ? lvEnd : 0;

    // Compute all post-growth values (each account grows first, then withdrawals are taken from grown value)
    const s3aH1This = Math.round(s3aH1 * (1 + ZINS_SA3) * 1000) / 1000;
    const s3aH2This = Math.round(s3aH2 * (1 + ZINS_SA3) * 1000) / 1000;
    const s3aF1This = Math.round(s3aF1 * (1 + ZINS_SA3) * 1000) / 1000;
    const s3aF2This = Math.round(s3aF2 * (1 + ZINS_SA3) * 1000) / 1000;
    const s3aF3Contrib = (!fP && !fM) ? SA3_PRO_PERSON : 0;
    const s3aF3This = Math.round((s3aF3 + s3aF3Contrib) * (1 + ZINS_SA3) * 1000) / 1000;
    const fk1HThis = Math.round(fk1H * (1 + ZINS_FK) * 1000) / 1000;
    const fk2HThis = Math.round(fk2H * (1 + ZINS_FK) * 1000) / 1000;
    const pkFThis = Math.round(pkF * (1 + ZINS_PK) * 1000) / 1000;
    const s3aFAccumContrib = (!fP && !fM) ? SA3_PRO_PERSON : 0;
    const s3aFAccumThis = Math.round((s3aFAccum + s3aFAccumContrib) * (1 + ZINS_SA3) * 1000) / 1000;

    const pb = getPensionBezug(szenario, jahr, pensionJahrHerr, pensionJahrFrau,
      { s3aH1This, s3aH2This, s3aF1This, fk1HThis, fk2HThis, pkFThis, s3aF2This, s3aF3This, s3aFAccumThis });
    const kapitalsteuer = berechneKapitalauszahlungssteuer(pb.total, kanton);

    // ─── TWO-PASS TAX CALCULATION ──────────────────────────────────
    // Pass 1: approximate portfolio_end using start portfolio for taxes
    const taxArgs = [hypothekarzinsen, unterhaltsabzug, saeule3aBeitraege, berufsauslagen, zweiverdienerabzug, kinderabzug, sozialabzug, steuerfreierBetrag] as const;
    const tax1 = berechneTaxen(portfolio, lvEnd, liegenschaft.steuerwert, hypothekenTotalStart, totalEinnahmen, ...taxArgs, kanton);

    const ausgaben1 = Math.round((lebenshaltungskosten + hypothekarzinsen + unterhaltskosten + amortisation + saeule3aBeitraege + tax1.steuern) * 1000) / 1000;
    const sparen1 = Math.round((totalEinnahmen - ausgaben1) * 1000) / 1000;
    const portfolioEnd = Math.round((portfolio + sparen1 + liqZufluss + lvZufluss + pb.total - kapitalsteuer) * (1 + ZINS_ANLAGE) * 1000) / 1000;

    // Pass 2: compute accurate taxes using end-of-year portfolio
    const tax = berechneTaxen(portfolioEnd, lvZufluss > 0 ? 0 : lvEnd, liegenschaft.steuerwert, hypothekenTotalStart, totalEinnahmen, ...taxArgs, kanton);

    const totalAusgaben = Math.round((lebenshaltungskosten + hypothekarzinsen + unterhaltskosten + amortisation + saeule3aBeitraege + tax.steuern) * 1000) / 1000;
    const sparenVerzehr = Math.round((totalEinnahmen - totalAusgaben) * 1000) / 1000;

    portfolio = portfolioEnd;
    h1 = nH1; h2 = nH2; h3 = nH3;

    // Update LV and pension accounts (use pre-computed grown values)
    lv = lvZufluss > 0 ? 0 : lvEnd;
    s3aH1 = pb.s3aH1Used ? 0 : s3aH1This;
    s3aH2 = pb.s3aH2Used ? 0 : s3aH2This;
    s3aF1 = pb.s3aF1Used ? 0 : s3aF1This;
    s3aF2 = pb.s3aF2Used ? 0 : s3aF2This;
    s3aF3 = pb.s3aF3Used ? 0 : s3aF3This;
    fk1H = pb.fk1HUsed ? 0 : fk1HThis;
    fk2H = pb.fk2HUsed ? 0 : fk2HThis;
    // pkF: grew this year; partial withdrawal subtracts from grown value; full withdrawal zeroes it
    if (pb.pkFRestUsed) pkF = 0;
    else if (pb.pkFPartial > 0) pkF = Math.max(0, Math.round((pkFThis - pb.pkFPartial) * 1000) / 1000);
    else pkF = pkFThis;
    s3aFAccum = pb.s3aFAccumUsed ? 0 : s3aFAccumThis;

    totalSteuern += tax.steuern;
    const totalFreiesVermoegen = SICHERHEITSRESERVE + portfolio;
    const totalVermoegen = totalFreiesVermoegen + liegenschaft.verkehrswert - hypothekenTotalEnd;

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
    endvermoegen: jahre[jahre.length - 1].totalVermoegen,
  };
}

function berechneHyp(
  h1: number, h2: number, h3: number, jahr: number,
  zAlt: number, zNeu: number,
  h1VJ: number, h2VJ: number, h3VJ: number,
  h1VM: number, h2VM: number, h3VM: number
): number {
  const calc = (h: number, vj: number, vm: number) => {
    if (h === 0) return 0;
    if (jahr < vj) return h * zAlt;
    if (jahr > vj) return h * zNeu;
    return h * (vm / 12 * zAlt + (12 - vm) / 12 * zNeu);
  };
  return Math.round((calc(h1, h1VJ, h1VM) + calc(h2, h2VJ, h2VM) + calc(h3, h3VJ, h3VM)) * 1000) / 1000;
}

function getAmort(
  szenario: Szenario, jahr: number, h1: number, h2: number, h3: number
): { amortisation: number; nH1: number; nH2: number; nH3: number } {
  if (szenario === "fruehest") {
    if (jahr === 2024) return { amortisation: 1000, nH1: 0, nH2: 100, nH3: h3 };
    if (jahr === 2025) return { amortisation: 200, nH1: 0, nH2: 0, nH3: 200 };
    if (jahr === 2026) return { amortisation: 200, nH1: 0, nH2: 0, nH3: 0 };
  }
  if (szenario === "spaetmoeglichst") {
    if (jahr === 2032) return { amortisation: 1500, nH1: 0, nH2: 0, nH3: 0 };
  }
  if (szenario === "gestaffelt") {
    if (jahr === 2024) return { amortisation: 400, nH1: 0, nH2: h2, nH3: h3 };
    if (jahr === 2025) return { amortisation: 100, nH1: 0, nH2: 700, nH3: h3 };
    if (jahr === 2028) return { amortisation: 700, nH1: 0, nH2: 0, nH3: 0 };
  }
  return { amortisation: 0, nH1: h1, nH2: h2, nH3: h3 };
}

interface PensionGrownValues {
  s3aH1This: number; s3aH2This: number; s3aF1This: number;
  fk1HThis: number; fk2HThis: number; pkFThis: number;
  s3aF2This: number; s3aF3This: number; s3aFAccumThis: number;
}

interface PensionBezug {
  total: number; pkFPartial: number;
  s3aH1Used: boolean; s3aH2Used: boolean; s3aF1Used: boolean;
  fk1HUsed: boolean; fk2HUsed: boolean; pkFRestUsed: boolean;
  s3aF2Used: boolean; s3aF3Used: boolean; s3aFAccumUsed: boolean;
}

function getPensionBezug(
  szenario: Szenario, jahr: number,
  pensionJahrHerr: number, pensionJahrFrau: number,
  g: PensionGrownValues
): PensionBezug {
  const r: PensionBezug = {
    total: 0, pkFPartial: 0,
    s3aH1Used: false, s3aH2Used: false, s3aF1Used: false,
    fk1HUsed: false, fk2HUsed: false, pkFRestUsed: false,
    s3aF2Used: false, s3aF3Used: false, s3aFAccumUsed: false,
  };

  // Fixed-year withdrawals (post-growth values)
  if (jahr === 2023) { r.s3aH1Used = true; r.total += g.s3aH1This; }
  if (jahr === 2025) { r.s3aH2Used = true; r.total += g.s3aH2This; }
  if (jahr === 2026) { r.s3aF1Used = true; r.total += g.s3aF1This; }
  if (jahr === 2027) { r.fk1HUsed = true; r.total += g.fk1HThis; }

  // Herr retires: withdraw fk2H, s3aFAccum, s3aF2, s3aF3 (all post-growth)
  if (jahr === pensionJahrHerr) {
    r.fk2HUsed = true;     r.total += g.fk2HThis;
    r.s3aFAccumUsed = true; r.total += g.s3aFAccumThis;
    r.s3aF2Used = true;    r.total += g.s3aF2This;
    r.s3aF3Used = true;    r.total += g.s3aF3This;
  }

  // Frau retires: full PK Frau withdrawal (post-growth) + new s3aF IV contribution
  if (jahr === pensionJahrFrau) {
    r.pkFRestUsed = true;
    r.total += g.pkFThis + SA3_PRO_PERSON;
  }

  // PK Frau partial withdrawal in 2024 (scenario-dependent cash amount)
  if (jahr === 2024) {
    r.pkFPartial = szenario === "gestaffelt" ? 400 : 700;
    r.total += r.pkFPartial;
  }

  return r;
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
