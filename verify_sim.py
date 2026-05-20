import json

with open('steuertabellen_raw.json') as f:
    raw = json.load(f)

bern_eink = {int(k): v for k, v in raw['bern_eink']}
bern_verm = {int(k): v for k, v in raw['bern_verm']}
zuerich_eink = {int(k): v for k, v in raw['zuerich_eink']}
zuerich_verm = raw['zuerich_verm']

def lookup_exact(table, key):
    return table.get(round(key), 0)

def xlookup_le(table, key):
    result = 0
    for k, v in table:
        if k <= key: result = v
        else: break
    return result

def einkommen_steuer(einkommen, kanton):
    if einkommen <= 0: return 0
    raw = lookup_exact(bern_eink, einkommen) if kanton == 'Bern' else lookup_exact(zuerich_eink, einkommen)
    return raw / 1000

def vermoegen_steuer(vermoegen, kanton):
    if vermoegen <= 0: return 0
    raw = lookup_exact(bern_verm, vermoegen) if kanton == 'Bern' else xlookup_le(zuerich_verm, vermoegen)
    return raw / 1000

KAPITAL_RATES_BERN = [(62,3.33),(87,3.76),(90,3.80),(159,5.04),(239,6.09),(700,8.60),(869,9.06)]
KAPITAL_RATES_ZUERICH = [(62,4.11),(87,4.26),(90,4.28),(159,4.84),(239,5.41),(700,6.17),(869,7.14)]

def interp_rate(rates, betrag):
    if betrag <= rates[0][0]: return rates[0][1]
    for i in range(1, len(rates)):
        if betrag <= rates[i][0]:
            t = (betrag - rates[i-1][0]) / (rates[i][0] - rates[i-1][0])
            return rates[i-1][1] + t * (rates[i][1] - rates[i-1][1])
    return rates[-1][1]

def kapital_steuer(betrag, kanton):
    if betrag <= 0: return 0
    rates = KAPITAL_RATES_BERN if kanton == 'Bern' else KAPITAL_RATES_ZUERICH
    return betrag * interp_rate(rates, betrag) / 100

START = 2023; END = 2032
INFL = 0.015; ZINS_A = 0.03; ZINS_FK = 0.003; ZINS_SA3 = 0.03; ZINS_LV = 0.003; ZINS_PK = 0.01
SICHER = 100; EMW = 73.5; UNTERHALT_P = 0.0075; VERS = 3; VERG = 1.5; SOZ_BERN = 10.4
SA3_PP = 6.883; AHV_E = 29.4; AHV_P = 44.7; PK_RENTE_H = 40

gebH_j, gebH_m = 1963, 6
gebF_j, gebF_m = 1964, 12
einkommenTotal = 270
kinderAnzahl = 2; kinderStudierenJahre = 3
h1_init, h2_init, h3_init = 400, 800, 300
h1VJ, h1VM = 2024, 5
h2VJ, h2VM = 2024, 10
h3VJ, h3VM = 2025, 1
zAlt, zNeu = 0.0064, 0.03
steuerwert = 2450; verkehrswert = 3500
pkF_init = 1490; fk1H_init = 235; fk2H_init = 44
s3aH1_init = 60; s3aH2_init = 80; s3aF1_init = 80; s3aF2_init = 13; s3aF3_init = 6
lv_init = 70; liquidHerr = 120; liquidFrau = 200; etfFrau = 155

pensH = gebH_j + 65  # 2028
pensF = gebF_j + 65  # 2029

def is_pens(gj, gm, j):
    return (j - gj) > 65

def is_mid(gj, gm, j):
    a = j - gj
    return a == 65 and 1 <= gm <= 6

def berechne_hyp(h1, h2, h3, j):
    def calc(h, vj, vm):
        if h == 0: return 0
        if j < vj: return h * zAlt
        if j > vj: return h * zNeu
        return h * (vm/12 * zAlt + (12-vm)/12 * zNeu)
    return round((calc(h1,h1VJ,h1VM)+calc(h2,h2VJ,h2VM)+calc(h3,h3VJ,h3VM))*1000)/1000

def get_amort(szenario, j, h1, h2, h3):
    if szenario == 'fruehest':
        if j == 2024: return 1000, 0, 100, h3
        if j == 2025: return 200, 0, 0, 200
        if j == 2026: return 200, 0, 0, 0
    if szenario == 'spaetmoeglichst':
        if j == 2032: return 1500, 0, 0, 0
    if szenario == 'gestaffelt':
        if j == 2024: return 400, 0, h2, h3
        if j == 2025: return 100, 0, 700, h3
        if j == 2028: return 700, 0, 0, 0
    return 0, h1, h2, h3

def berechneTaxen(portEnd, lvEnd, hypStart, totalEin, hypZins, unterabz, sa3b, berufs, zvd, kinder, soz, sfb, kanton):
    ws = round(portEnd * 0.015 * 1000) / 1000
    stEink = max(0, round((totalEin + ws + EMW - hypZins - unterabz - VERS - berufs - zvd - sa3b - kinder - VERG - soz)*1000)/1000)
    aktiven = portEnd + SICHER + lvEnd
    stVerm = max(0, round((aktiven + steuerwert - hypStart - sfb)*1000)/1000)
    eS = einkommen_steuer(stEink, kanton)
    vS = vermoegen_steuer(stVerm, kanton)
    return round((eS+vS)*1000)/1000, stEink, stVerm

def run_sim(kanton, szenario):
    portfolio = etfFrau
    h1, h2, h3 = h1_init, h2_init, h3_init
    s3aH1 = s3aH1_init; s3aH2 = s3aH2_init; s3aF1 = s3aF1_init
    s3aF2 = s3aF2_init; s3aF3 = s3aF3_init; fk1H = fk1H_init; fk2H = fk2H_init
    pkF = pkF_init; lv = lv_init; s3aFAcc = 0
    total_steuern = 0

    print(f"{'Jahr':4} {'hyp_st':8} {'hyp_end':8} {'hypZins':8} {'stEink':7} {'stVerm':7} {'tax':8} {'portEnd':10} {'kapBasis':10}")
    for jahr in range(START, END+1):
        jNS = jahr - START
        hP = is_pens(gebH_j, gebH_m, jahr)
        hM = is_mid(gebH_j, gebH_m, jahr)
        fP = is_pens(gebF_j, gebF_m, jahr)
        fM = is_mid(gebF_j, gebF_m, jahr)
        beideP = hP and fP

        einH = 0 if hP else (einkommenTotal/4 if hM else einkommenTotal/2)
        einF = 0 if fP else (einkommenTotal/4 if fM else einkommenTotal/2)
        ahv = AHV_P if (hP and fP) else AHV_E if (hP or fP) else (AHV_E*(12-gebH_m)/12 if hM else AHV_E*(12-gebF_m)/12 if fM else 0)
        pkR = PK_RENTE_H if hP else (PK_RENTE_H*(12-gebH_m)/12 if hM else 0)
        totalEin = round((einH+einF+ahv+pkR)*1000)/1000

        if hP or hM:
            lhk = 80 * (1+INFL)**(jahr - pensH + 1)
        else:
            lhk = 110 * (1+INFL)**jNS

        hypTotStart = h1 + h2 + h3
        hypZins = berechne_hyp(h1, h2, h3, jahr)
        unterhalt = round(verkehrswert * UNTERHALT_P * 1000)/1000
        unterabz = round(unterhalt * 0.20 * 1000)/1000

        amort, nH1, nH2, nH3 = get_amort(szenario, jahr, h1, h2, h3)
        hypTotEnd = nH1 + nH2 + nH3

        # saeule3aBeitraege: Herr contributes in his retirement year too
        herr_beitr = 1 if (not hP or jahr == pensH) else 0
        frau_beitr = 1 if not fP else 0
        sa3b = 0 if beideP else SA3_PP * (herr_beitr + frau_beitr)

        kinderAus = max(0, kinderStudierenJahre - jNS)
        berufs = 0 if beideP else (6 if (hP or fP) else (9 if (hM or fM) else 12))
        zvd = 0 if beideP else (0 if (hP or fP) else (4.65 if (hM or fM) else 9.3))
        kinder = (8 if kanton=='Bern' else 9) if kinderAus > 0 else 0
        soz = SOZ_BERN if kanton=='Bern' else 0
        sfb = (kinderAnzahl*18 if kinderAus>0 else 18) if kanton=='Bern' else 0

        liqZ = max(0, liquidHerr+liquidFrau-SICHER) if jahr==START else 0
        lvEnd = round(lv*(1+ZINS_LV)*1000)/1000 if lv>0 else 0
        lvZ = lvEnd if (jahr==pensF and lvEnd>0) else 0

        # Compute grown values (all accounts grow first)
        s3aH1T = round(s3aH1*(1+ZINS_SA3)*1000)/1000
        s3aH2T = round(s3aH2*(1+ZINS_SA3)*1000)/1000
        s3aF1T = round(s3aF1*(1+ZINS_SA3)*1000)/1000
        s3aF2T = round(s3aF2*(1+ZINS_SA3)*1000)/1000
        s3aF3c = SA3_PP if (not fP and not fM) else 0
        s3aF3T = round((s3aF3+s3aF3c)*(1+ZINS_SA3)*1000)/1000
        fk1HT = round(fk1H*(1+ZINS_FK)*1000)/1000
        fk2HT = round(fk2H*(1+ZINS_FK)*1000)/1000
        pkFT = round(pkF*(1+ZINS_PK)*1000)/1000
        s3aFAccc = SA3_PP if (not fP and not fM) else 0
        s3aFAccT = round((s3aFAcc+s3aFAccc)*(1+ZINS_SA3)*1000)/1000

        # Pension withdrawals (post-growth)
        pb_total = 0; pkFPartial = 0
        s3aH1U=s3aH2U=s3aF1U=s3aF2U=s3aF3U=fk1HU=fk2HU=s3aFAU=pkFRest = False
        if jahr==2023: s3aH1U=True; pb_total+=s3aH1T
        if jahr==2025: s3aH2U=True; pb_total+=s3aH2T
        if jahr==2026: s3aF1U=True; pb_total+=s3aF1T
        if jahr==2027: fk1HU=True; pb_total+=fk1HT
        if jahr==pensH:
            fk2HU=True; pb_total+=fk2HT
            s3aFAU=True; pb_total+=s3aFAccT
            s3aF2U=True; pb_total+=s3aF2T
            s3aF3U=True; pb_total+=s3aF3T
        if jahr==pensF:
            pkFRest=True; pb_total+=pkFT+SA3_PP  # pkF grown + s3aF IV
        if jahr==2024:
            pkFPartial = 400 if szenario=='gestaffelt' else 700
            pb_total += pkFPartial
        kap_st = kapital_steuer(pb_total, kanton)

        t1, _, _ = berechneTaxen(portfolio, lvEnd, hypTotStart, totalEin, hypZins, unterabz, sa3b, berufs, zvd, kinder, soz, sfb, kanton)
        aus1 = round((lhk+hypZins+unterhalt+amort+sa3b+t1)*1000)/1000
        sp1 = round((totalEin-aus1)*1000)/1000
        portEnd = round((portfolio+sp1+liqZ+lvZ+pb_total-kap_st)*(1+ZINS_A)*1000)/1000
        tax, stEink, stVerm = berechneTaxen(portEnd, 0 if lvZ>0 else lvEnd, hypTotStart, totalEin, hypZins, unterabz, sa3b, berufs, zvd, kinder, soz, sfb, kanton)

        total_steuern += tax
        portfolio = portEnd
        h1, h2, h3 = nH1, nH2, nH3
        lv = 0 if lvZ>0 else lvEnd

        s3aH1 = 0 if s3aH1U else s3aH1T
        s3aH2 = 0 if s3aH2U else s3aH2T
        s3aF1 = 0 if s3aF1U else s3aF1T
        s3aF2 = 0 if s3aF2U else s3aF2T
        s3aF3 = 0 if s3aF3U else s3aF3T
        fk1H = 0 if fk1HU else fk1HT
        fk2H = 0 if fk2HU else fk2HT
        if pkFRest: pkF = 0
        elif pkFPartial > 0: pkF = max(0, round((pkFT - pkFPartial)*1000)/1000)
        else: pkF = pkFT
        s3aFAcc = 0 if s3aFAU else s3aFAccT

        print(f"{jahr} {hypTotStart:8} {hypTotEnd:8} {hypZins:8.3f} {stEink:7.1f} {stVerm:7.1f} {tax:8.3f} {portEnd:10.3f} {pb_total:10.3f}")

    print(f"TOTAL {kanton} {szenario}: {round(total_steuern*1000)/1000}")
    print()

print("=== Bern S1 (target: 860.104) ===")
run_sim('Bern', 'fruehest')
print("=== Bern S2 (target: 788.681) ===")
run_sim('Bern', 'spaetmoeglichst')
print("=== Bern S3 (gestaffelt) ===")
run_sim('Bern', 'gestaffelt')
print("=== Zuerich S1 ===")
run_sim('Zuerich', 'fruehest')
print("=== Zuerich S2 ===")
run_sim('Zuerich', 'spaetmoeglichst')
