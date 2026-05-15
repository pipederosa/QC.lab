/* ============================================================
   data.js — Datos compartidos StabilityQC + SCRUM  v3.0
   ============================================================ */

/* ---- Arrays que vienen de Supabase ---- */
let STUDIES = [];
let SCRUM_RECORDS = [];
let AUDIT_LOG = [];
let CODIGOS_EST = [];
let CODIGOS_SCRUM = [];
let CONDICIONES = [];
let CAMARAS = [];
let LOTES_EST = [];

/* ---- UBICACIONES (se mantiene por compatibilidad con SCRUM) ---- */
const UBICACIONES = {
  'Planta 1': ['Cámara 1','Cámara 2','Cámara 3','Cámara 4','Cámara 5','Refrigerador A','Refrigerador B'],
  'Planta 2': ['Cámara 6','Cámara 7','Cámara 8','Refrigerador C','Refrigerador D','Zona controlada 1','Zona controlada 2']
};
