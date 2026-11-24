// AIM 5-4-5 and 5-4-18. Keep codes aligned with Django flights/approach_choices.py.
export const APPROACH_CHOICES = [
  [
    "ILS",
    "ILS"
  ],
  [
    "CATII",
    "ILS CAT II"
  ],
  [
    "CATIII",
    "ILS CAT III"
  ],
  [
    "GLS",
    "GLS"
  ],
  [
    "PAR",
    "PAR"
  ],
  [
    "LNAV",
    "RNAV (GPS) — LNAV"
  ],
  [
    "LP",
    "RNAV (GPS) — LP"
  ],
  [
    "LNAV/VNAV",
    "RNAV (GPS) — LNAV/VNAV"
  ],
  [
    "LPV",
    "RNAV (GPS) — LPV"
  ],
  [
    "RNP AR",
    "RNAV (RNP) — RNP AR"
  ],
  [
    "LOC",
    "LOC"
  ],
  [
    "LOC BC",
    "LOC BC"
  ],
  [
    "VOR",
    "VOR"
  ],
  [
    "NDB",
    "NDB"
  ],
  [
    "LDA",
    "LDA"
  ],
  [
    "LDA/GS",
    "LDA with glidepath"
  ],
  [
    "SDF",
    "SDF"
  ],
  [
    "TACAN",
    "TACAN"
  ],
  [
    "ASR",
    "ASR"
  ]
];
export const LEGACY_APPROACH_CHOICES = [
  [
    "GPS",
    "GPS (legacy)"
  ],
  [
    "RNAV",
    "RNAV (legacy)"
  ],
  [
    "MLS",
    "MLS (legacy)"
  ],
  [
    "CAT II",
    "ILS CAT II"
  ],
  [
    "CAT III",
    "ILS CAT III"
  ]
];

export function approachLabel(value) {
  return [...APPROACH_CHOICES, ...LEGACY_APPROACH_CHOICES].find(([code]) => code === value)?.[1] || value || '';
}

export function approachOptions(current) {
  return [...APPROACH_CHOICES, ...LEGACY_APPROACH_CHOICES.filter(([code]) => code === current)]
    .map(([value, label]) => ({ id: value, value, label }));
}
