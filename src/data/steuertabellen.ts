// Einkommenssteuertarife Verheiratete Kanton Bern (inkl. Gemeinde + Kanton + Bundessteuer)
// Quelle: Steuerverwaltung Kanton Bern, 2024
// Format: [steuerbaresEinkommen, grundsteuer, grenzsteuersatz]
export const EINKOMMENSSTEUER_BERN: [number, number, number][] = [
  [50000, 7853.80, 0.0380],
  [56700, 8040.55, 0.0430],
  [60000, 8236.30, 0.0430],
  [70000, 8432.05, 0.0430],
  [82400, 9019.30, 0.0485],
  [90000, 9440.86, 0.0485],
  [95000, 9665.74, 0.0485],
  [100000, 9894.61, 0.0485],
  [108100, 10123.49, 0.0520],
  [110000, 10352.36, 0.0520],
  [120000, 10581.24, 0.0520],
  [133800, 10810.11, 0.0570],
  [135000, 11038.99, 0.0570],
  [140000, 11267.86, 0.0570],
  [150000, 11496.74, 0.0570],
  [155000, 11725.61, 0.0570],
  [160000, 11954.49, 0.0570],
  [173500, 12183.36, 0.0585],
  [180000, 12412.24, 0.0585],
  [190000, 12641.11, 0.0585],
  [200000, 12869.99, 0.0585],
  [225300, 13098.86, 0.0595],
  [250000, 13327.74, 0.0595],
  [277100, 13563.61, 0.0620],
  [300000, 13802.49, 0.0620],
  [328900, 14041.36, 0.0640],
  [400000, 14280.24, 0.0640],
  [463600, 14519.11, 0.0650],
];

// Vermögenssteuertarife Kanton Bern
// Format: [steuerbaresVermoegen, grundsteuer, grenzsteuersatz]
export const VERMOEGENSSTEUER_BERN: [number, number, number][] = [
  [97000, 0, 0.0070],
  [210000, 31.4, 0.0080],
  [425000, 110.5, 0.0100],
  [785000, 282.5, 0.0120],
  [1320000, 642.5, 0.0130],
  [3620000, 1284.5, 0.0135],
];

// Kapitalauszahlungssteuer Bern
// Format: [betrag, steuersatz, steuer]
export const KAPITALSTEUER_BERN: [number, number, number][] = [
  [62000, 0.0333, 2063],
  [700000, 0.086, 60183],
  [87000, 0.0376, 3274],
  [90000, 0.038, 3423],
  [239000, 0.0609, 14549],
  [159000, 0.0504, 8021],
  [869000, 0.0906, 78756],
];

// Einkommenssteuertarife Zürich (Verheiratete, inkl. Kanton + Gemeinde + Bund)
export const EINKOMMENSSTEUER_ZUERICH: [number, number, number][] = [
  [28300, 0, 0.0200],
  [36700, 168, 0.0300],
  [43900, 384, 0.0400],
  [56800, 672, 0.0500],
  [72900, 1317, 0.0600],
  [89100, 2283, 0.0700],
  [105400, 3417, 0.0800],
  [137300, 4721, 0.0900],
  [181200, 7592, 0.1000],
  [254900, 12182, 0.1100],
  [695200, 20285, 0.1300],
];

// Vermögenssteuertarife Zürich
export const VERMOEGENSSTEUER_ZUERICH: [number, number, number][] = [
  [77000, 0, 0.0015],
  [150000, 115.5, 0.0020],
  [250000, 261.5, 0.0025],
  [500000, 512.5, 0.0030],
  [1000000, 1012.5, 0.0033],
];

// Kapitalauszahlungssteuer Zürich (vereinfacht, 2/5 der normalen Einkommenssteuer)
export const KAPITALSTEUER_ZUERICH_FAKTOR = 0.4;
