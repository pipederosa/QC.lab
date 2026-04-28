/* ============================================================
   data.js — Datos compartidos StabilityQC + SCRUM  v2.0
   ============================================================ */

/* ---- UBICACIONES (cámaras y refrigeradores) ---- */
const UBICACIONES = {
  'Planta 1': ['Cámara 1','Cámara 2','Cámara 3','Cámara 4','Cámara 5','Refrigerador A','Refrigerador B'],
  'Planta 2': ['Cámara 6','Cámara 7','Cámara 8','Refrigerador C','Refrigerador D','Zona controlada 1','Zona controlada 2']
};

/* ---- QUARTERS ---- */
const QUARTERS_TODAS = [
  {q:'Q1 2025',pct:82},{q:'Q2 2025',pct:85},{q:'Q3 2025',pct:79},{q:'Q4 2025',pct:88},{q:'Q1 2026',pct:87}
];
const QUARTERS_P1 = [
  {q:'Q1 2025',pct:78},{q:'Q2 2025',pct:83},{q:'Q3 2025',pct:75},{q:'Q4 2025',pct:90},{q:'Q1 2026',pct:85}
];
const QUARTERS_P2 = [
  {q:'Q1 2025',pct:86},{q:'Q2 2025',pct:88},{q:'Q3 2025',pct:83},{q:'Q4 2025',pct:86},{q:'Q1 2026',pct:89}
];

/* ---- ESTABILIDADES ---- */
let STUDIES = [];

/* ---- SCRUM RECORDS ---- */
let SCRUM_RECORDS = [];

/* ---- SHARED AUDIT LOG ---- */
let AUDIT_LOG = [];

/* ---- QUARTERS P1/P2 (para gráfico de tendencia por quarter) ---- */
// ya definidos arriba
