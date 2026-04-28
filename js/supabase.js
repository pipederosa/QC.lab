/* ============================================================
   supabase.js — Conexión y funciones de base de datos
   ============================================================ */

const SUPABASE_URL = 'https://rszdmnhyasfwnbcmbhim.supabase.co/rest/v1/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzemRtbmh5YXNmd25iY21iaGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODYxNzQsImV4cCI6MjA5Mjk2MjE3NH0.g9SfYaEURMOVuSrcHiPY8y-uA5xrbQJn0F34ca-iEEQ';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---- STUDIES ---- */
async function dbGetStudies() {
  const { data, error } = await sb.from('studies').select('*').order('id');
  if (error) { console.error(error); return []; }
  return data.map(mapStudy);
}

async function dbUpdateStudy(id, fields) {
  const { error } = await sb.from('studies').update(mapStudyToDb(fields)).eq('id', id);
  if (error) console.error(error);
}

async function dbInsertStudy(fields) {
  const { data, error } = await sb.from('studies').insert(mapStudyToDb(fields)).select().single();
  if (error) { console.error(error); return null; }
  return mapStudy(data);
}

/* ---- SCRUM ---- */
async function dbGetScrum() {
  const { data, error } = await sb.from('scrum_records').select('*').order('id');
  if (error) { console.error(error); return []; }
  return data.map(mapScrum);
}

async function dbUpdateScrum(id, fields) {
  const { error } = await sb.from('scrum_records').update(mapScrumToDb(fields)).eq('id', id);
  if (error) console.error(error);
}

async function dbInsertScrum(fields) {
  const { data, error } = await sb.from('scrum_records').insert(mapScrumToDb(fields)).select().single();
  if (error) { console.error(error); return null; }
  return mapScrum(data);
}

/* ---- USERS ---- */
async function dbGetUsers() {
  const { data, error } = await sb.from('users_list').select('*').order('id');
  if (error) { console.error(error); return []; }
  return data;
}

/* ---- AUDIT LOG ---- */
async function dbGetAudit() {
  const { data, error } = await sb.from('audit_log').select('*').order('id', {ascending: false});
  if (error) { console.error(error); return []; }
  return data.map(a => ({
    who: a.who, what: a.what, when: a.when_ts,
    field: a.field, old: a.old_val, new: a.new_val,
    study: a.study_id, module: a.module
  }));
}

async function dbInsertAudit(entry) {
  await sb.from('audit_log').insert({
    who: entry.who, what: entry.what, when_ts: entry.when,
    field: entry.field, old_val: entry.old, new_val: entry.new,
    study_id: entry.study, module: entry.module
  });
}

/* ---- MAPPERS: DB → App ---- */
function mapStudy(r) {
  return {
    id:r.id, cod:r.cod, prod:r.prod, lote:r.lote, cond:r.cond, tiempo:r.tiempo,
    ingreso:r.ingreso, teorica:r.teorica, limite:r.limite, estado:r.estado,
    oos:r.oos, oos_obs:r.oos_obs, planta:r.planta, ubic:r.ubic, div:r.div,
    analistFQ:r.analist_fq, analistMicro:r.analist_micro, micro:r.micro,
    aprob:r.aprob, cumpl:r.cumpl, elab:r.elab, camara:r.camara,
    fqi:r.fqi, fqf:r.fqf, fqv:r.fqv, msi:r.msi, msf:r.msf,
    contenido:r.contenido, deg1:r.deg1, deg2:r.deg2, deg3:r.deg3,
    disol:r.disol, condsal:r.condsal, semana:r.semana, status:r.status,
    limInf:r.lim_inf, limSup:r.lim_sup, corredor:r.corredor, cumplEst:r.cumpl_est,
    salida:r.salida, libteor:r.libteor, lib:r.lib,
    motivo:r.motivo, empaque:r.empaque, obs:r.obs
  };
}

function mapStudyToDb(f) {
  return {
    cod:f.cod, prod:f.prod, lote:f.lote, cond:f.cond, tiempo:f.tiempo,
    ingreso:f.ingreso, teorica:f.teorica, limite:f.limite, estado:f.estado,
    oos:f.oos, oos_obs:f.oos_obs, planta:f.planta, ubic:f.ubic, div:f.div,
    analist_fq:f.analistFQ, analist_micro:f.analistMicro, micro:f.micro,
    aprob:f.aprob, cumpl:f.cumpl, elab:f.elab, camara:f.camara,
    fqi:f.fqi, fqf:f.fqf, fqv:f.fqv, msi:f.msi, msf:f.msf,
    contenido:f.contenido, deg1:f.deg1, deg2:f.deg2, deg3:f.deg3,
    disol:f.disol, condsal:f.condsal, semana:f.semana, status:f.status,
    lim_inf:f.limInf, lim_sup:f.limSup, corredor:f.corredor, cumpl_est:f.cumplEst,
    salida:f.salida, libteor:f.libteor, lib:f.lib,
    motivo:f.motivo, empaque:f.empaque, obs:f.obs
  };
}

function mapScrum(r) {
  return {
    id:r.id, cod:r.cod, planta:r.planta, desc:r.descripcion, lote:r.lote, div:r.div,
    identDeposito:r.ident_deposito, limiteQC:r.limite_qc, ingresoFQ:r.ingreso_fq,
    status:r.status, nInspeccion:r.n_inspeccion,
    prioridad:r.prioridad, fechaLimPrioridad:r.fecha_lim_prioridad,
    spMicroConthLal:r.sp_micro_conth_lal, spMicroEsterilidad:r.sp_micro_esterilidad,
    controlHigienico:r.control_higienico, fechaFinEsterilidad:r.fecha_fin_esterilidad,
    fechaFinMicro:r.fecha_fin_micro, analistFQ:r.analist_fq,
    fechaInicioAnalisis:r.fecha_inicio_analisis, fechaFinAnalisis:r.fecha_fin_analisis,
    validacionFichaSAP:r.validacion_ficha_sap, finalQCSAP:r.final_qc_sap,
    obs:r.obs, statusFinal:r.status_final, liberadoATiempo:r.liberado_a_tiempo,
    granelCompControl:r.granel_comp_control, granel:r.granel
  };
}

function mapScrumToDb(f) {
  return {
    cod:f.cod, planta:f.planta, descripcion:f.desc, lote:f.lote, div:f.div,
    ident_deposito:f.identDeposito, limite_qc:f.limiteQC, ingreso_fq:f.ingresoFQ,
    status:f.status, n_inspeccion:f.nInspeccion,
    prioridad:f.prioridad, fecha_lim_prioridad:f.fechaLimPrioridad,
    sp_micro_conth_lal:f.spMicroConthLal, sp_micro_esterilidad:f.spMicroEsterilidad,
    control_higienico:f.controlHigienico, fecha_fin_esterilidad:f.fechaFinEsterilidad,
    fecha_fin_micro:f.fechaFinMicro, analist_fq:f.analistFQ,
    fecha_inicio_analisis:f.fechaInicioAnalisis, fecha_fin_analisis:f.fechaFinAnalisis,
    validacion_ficha_sap:f.validacionFichaSAP, final_qc_sap:f.finalQCSAP,
    obs:f.obs, status_final:f.statusFinal, liberado_a_tiempo:f.liberadoATiempo,
    granel_comp_control:f.granelCompControl, granel:f.granel
  };
}
