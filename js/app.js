/* ============================================================
   app.js — LabQC v2.0
   Módulos: Estabilidades · SCRUM · Usuarios (Admin)
   ============================================================ */

/* ============ ROLES ============ */ 
const ROLES = {
  viewer:     { label:'Viewer',     color:'#888780', canEdit:false, canCreate:false, canApprove:false, canAdmin:false, canAudit:false, canUsers:false },
  analyst:    { label:'Analista',   color:'#185FA5', canEdit:true,  canCreate:true,  canApprove:false, canAdmin:false, canAudit:false, canUsers:false },
  supervisor: { label:'Supervisor', color:'#854F0B', canEdit:true,  canCreate:true,  canApprove:true,  canAdmin:false, canAudit:true,  canUsers:false },
  admin:      { label:'Admin',      color:'#3B6D11', canEdit:true,  canCreate:true,  canApprove:true,  canAdmin:true,  canAudit:true,  canUsers:true  },
};

const PERMISSIONS_MATRIX = [
  {action:'Ver Dashboard y resultados',  viewer:true, analyst:true, supervisor:true, admin:true},
  {action:'Ver detalle de registros',    viewer:true, analyst:true, supervisor:true, admin:true},
  {action:'Exportar CSV / Excel',        viewer:true, analyst:true, supervisor:true, admin:true},
  {action:'Editar campos en detalle',    viewer:false,analyst:true, supervisor:true, admin:true},
  {action:'Crear nuevos estudios/lotes', viewer:false,analyst:true, supervisor:true, admin:true},
  {action:'Aprobar estudios',            viewer:false,analyst:false,supervisor:true, admin:true},
  {action:'Ver módulo de Actividad',     viewer:false,analyst:false,supervisor:true, admin:true},
  {action:'Gestión de usuarios',         viewer:false,analyst:false,supervisor:false,admin:true},
];

let USERS_LIST = [];

/* ============ STATE ============ */
let currentUser   = USERS_LIST[0];
let currentModule = 'est';   // 'est' | 'scrum' | 'users'
let currentPage   = 'dashboard';
let detailEditMode = false;

// Estabilidades state
let estSortCol = null, estSortDir = 1;
let estDashLoc = 'todas';

// SCRUM state
let scrumSortCol = null, scrumSortDir = 1;
let scrumDashLoc = 'todas', scrumDashDiv = 'todas';
let scrumDetailEditMode = false;

let editingUserId = null;
let pendingChanges = {};

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', async () => {
  USERS_LIST  = await dbGetUsers();
  STUDIES     = await dbGetStudies();
  SCRUM_RECORDS = await dbGetScrum();
  AUDIT_LOG   = await dbGetAudit();
   CODIGOS_EST  = await dbGetCodigosEst();
   CODIGOS_SCRUM  = await dbGetCodigosScrum();
  if (!USERS_LIST || USERS_LIST.length === 0) {
      document.body.innerHTML = '<div style="padding:40px;color:red">Error conectando a supabase. Revisá la consola.</div>';
  }
  currentUser = USERS_LIST[0];
  bindModuleSwitcher();
  bindUserSwitcher();
  closeDropdownsOnOutsideClick();
  renderModule();
});

/* ============ MODULE SWITCHER ============ */
function bindModuleSwitcher() {
  document.getElementById('module-toggle')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('module-dropdown').classList.toggle('hidden');
  });
  document.querySelectorAll('[data-module]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mod = btn.dataset.module;
      if (mod === 'users' && !ROLES[currentUser.rol].canAdmin) return;
      currentModule = mod;
      currentPage = mod === 'users' ? 'users' : 'dashboard';
      document.getElementById('module-dropdown').classList.add('hidden');
      renderModule();
    });
  });
}

function renderModule() {
  const role = ROLES[currentUser.rol];
  const icons = {est:'◈', scrum:'◉', users:'◎'};
  const names = {est:'Estabilidades', scrum:'SCRUM', users:'Usuarios'};
  document.getElementById('module-icon').textContent = icons[currentModule];
  document.getElementById('module-name').textContent = names[currentModule];
  document.querySelectorAll('[data-module]').forEach(b => b.classList.toggle('active', b.dataset.module === currentModule));
  // Show/hide Users option
  const usersOpt = document.getElementById('mod-users');
  const usersSep = document.getElementById('mod-users-sep');
  if (usersOpt) usersOpt.style.display = role.canAdmin ? '' : 'none';
  if (usersSep) usersSep.style.display = role.canAdmin ? '' : 'none';
  // Render nav and content
  renderNav();
  renderContent();
}

/* ============ NAV ============ */
const EST_PAGES = [
  {id:'dashboard', label:'Dashboard',  roles:['viewer','analyst','supervisor','admin']},
  {id:'results',   label:'Resultados', roles:['viewer','analyst','supervisor','admin']},
  {id:'full',      label:'Detalle',    roles:['viewer','analyst','supervisor','admin']},
  {id:'form',      label:'Nuevo estudio', roles:['analyst','supervisor','admin']},
  {id:'codigos',   label:'Códigos',    roles:['viewer','analyst','supervisor','admin']},
  {id:'audit',     label:'Actividad',  roles:['supervisor','admin']},
];
const SCRUM_PAGES = [
  {id:'dashboard', label:'Dashboard',  roles:['viewer','analyst','supervisor','admin']},
  {id:'results',   label:'Resultados', roles:['viewer','analyst','supervisor','admin']},
  {id:'full',      label:'Detalle',    roles:['viewer','analyst','supervisor','admin']},
  {id:'form',      label:'Nuevo lote', roles:['analyst','supervisor','admin']},
  {id:'codigos',   label:'Códigos',    roles:['viewer','analyst','supervisor','admin']},
  {id:'audit',     label:'Actividad',  roles:['supervisor','admin']},
];

function renderNav() {
  const nav = document.getElementById('main-nav');
  const role = currentUser.rol;
  if (currentModule === 'users') { nav.innerHTML = ''; return; }
  const pages = currentModule === 'est' ? EST_PAGES : SCRUM_PAGES;
  nav.innerHTML = pages
    .filter(p => p.roles.includes(role))
    .map(p => `<button class="nav-btn${currentPage===p.id?' active':''}" onclick="navigateTo('${p.id}')">${p.label}</button>`)
    .join('');
}

function navigateTo(page) {
  currentPage = page;
  renderNav();
  renderContent();
}

/* ============ CONTENT ROUTER ============ */
function renderContent() {
  const main = document.getElementById('main-content');
  if (currentModule === 'est') {
    if (currentPage === 'dashboard') { main.innerHTML = buildEstDashboard(); bindEstDashboard(); }
    else if (currentPage === 'results') { main.innerHTML = buildEstResults(); bindEstResults(); }
    else if (currentPage === 'full')    { main.innerHTML = buildDetailPage('est'); bindDetailPage('est'); }
    else if (currentPage === 'form')    { main.innerHTML = buildEstForm(); bindEstForm(); }
    else if (currentPage === 'audit')   { main.innerHTML = buildAuditPage('est'); bindAuditPage(); }
     else if (currentPage === 'codigos') {main.innerHTML = buildCodigosPage('est'); bindCodigosPage('est');}
  } else if (currentModule === 'scrum') {
    if (currentPage === 'dashboard') { main.innerHTML = buildScrumDashboard(); bindScrumDashboard(); }
    else if (currentPage === 'results') { main.innerHTML = buildScrumResults(); bindScrumResults(); }
    else if (currentPage === 'full')    { main.innerHTML = buildDetailPage('scrum'); bindDetailPage('scrum'); }
    else if (currentPage === 'form')    { main.innerHTML = buildScrumForm(); bindScrumForm(); }
    else if (currentPage === 'audit')   { main.innerHTML = buildAuditPage('scrum'); bindAuditPage(); }
      else if (currentPage === 'codigos') {main.innerHTML = buildCodigosPage('scrum'); bindCodigosPage('scrum');}
  } else if (currentModule === 'users') {
    main.innerHTML = buildUsersPage(); bindUsersPage();
  }
}

/* ============ USER SWITCHER ============ */
function bindUserSwitcher() {
  document.getElementById('user-switcher-toggle')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('user-dropdown').classList.toggle('hidden');
  });
  renderUserListDropdown();
}

function renderUserListDropdown() {
  const el = document.getElementById('user-list'); if (!el) return;
  el.innerHTML = USERS_LIST.filter(u => u.estado === 'activo').map(u => {
    const r = ROLES[u.rol], isMe = u.id === currentUser.id;
    return `<div class="user-option${isMe?' user-option-active':''}" onclick="switchUser(${u.id})">
      <div class="user-opt-avatar" style="background:${r.color}22;color:${r.color}">${u.initials}</div>
      <div class="user-opt-info">
        <div class="user-opt-name">${u.nombre}${isMe?' <span class="user-opt-you">tú</span>':''}</div>
        <div class="user-opt-role" style="color:${r.color}">${r.label}</div>
      </div>
    </div>`;
  }).join('');
}

function switchUser(id) {
  const u = USERS_LIST.find(x => x.id === id); if (!u) return;
  currentUser = u;
  const r = ROLES[u.rol];
  document.getElementById('topbar-avatar').textContent = u.initials;
  document.getElementById('topbar-name').textContent = u.nombre;
  const rb = document.getElementById('topbar-role');
  rb.textContent = r.label; rb.style.background = r.color+'22'; rb.style.color = r.color;
  document.getElementById('user-dropdown').classList.add('hidden');
  // If on users module and no longer admin, go to est
  if (currentModule === 'users' && !r.canAdmin) { currentModule = 'est'; currentPage = 'dashboard'; }
  // If on page not accessible by new role, reset to dashboard
  const pages = currentModule === 'scrum' ? SCRUM_PAGES : EST_PAGES;
  const accessible = pages.filter(p => p.roles.includes(u.rol)).map(p => p.id);
  if (!accessible.includes(currentPage)) currentPage = 'dashboard';
  renderUserListDropdown();
  renderModule();
}

function closeDropdownsOnOutsideClick() {
  document.addEventListener('click', e => {
    if (!e.target.closest('.user-switcher-wrap'))  document.getElementById('user-dropdown')?.classList.add('hidden');
    if (!e.target.closest('.module-switcher-wrap')) document.getElementById('module-dropdown')?.classList.add('hidden');
    if (!e.target.closest('.multi-filter-wrap'))    document.querySelectorAll('.multi-filter-dropdown').forEach(d => d.classList.add('hidden'));
    if (!e.target.closest('.export-wrap'))          document.querySelectorAll('.export-dropdown').forEach(d => d.classList.add('hidden'));
    if (!e.target.closest('.detail-search-bar'))    document.getElementById('detail-search-results')?.classList.add('hidden');
  });
}

/* ============================================================
   ESTABILIDADES — DASHBOARD
   ============================================================ */
function buildEstDashboard() {
  return `<div class="dash-filter-bar">
    <span class="loc-label">Planta:</span>
    <div class="loc-pills" id="est-dash-pills">
      <button class="loc-pill active" data-dl="todas">Todas</button>
      <button class="loc-pill" data-dl="p1">Planta 1</button>
      <button class="loc-pill" data-dl="p2">Planta 2</button>
    </div>
  </div>
  <div class="kpi-grid" id="est-kpi-grid">
    <div class="kpi kpi-info" id="ek-curso" style="cursor:pointer"><div class="kpi-label">En curso</div><div class="kpi-val" id="k-curso">—</div><div class="kpi-sub">estudios activos</div></div>
    <div class="kpi kpi-danger" id="ek-venc" style="cursor:pointer"><div class="kpi-label">Vencidos</div><div class="kpi-val" id="k-venc">—</div><div class="kpi-sub">sin completar</div></div>
    <div class="kpi kpi-warning" id="ek-prox" style="cursor:pointer"><div class="kpi-label">Próx. a vencer</div><div class="kpi-val" id="k-prox">—</div><div class="kpi-sub">en 30 días</div></div>
    <div class="kpi kpi-success" id="ek-cump"><div class="kpi-label">% Cumplimiento</div><div class="kpi-val" id="k-cump">—</div><div class="kpi-sub">período actual</div></div>
    <div class="kpi kpi-danger" id="ek-oos" style="cursor:pointer"><div class="kpi-label">OOS activos</div><div class="kpi-val" id="k-oos">—</div><div class="kpi-sub">en investigación</div></div>
    <div class="kpi kpi-warning" id="ek-aprob" style="cursor:pointer"><div class="kpi-label">Aprob. pendientes</div><div class="kpi-val" id="k-aprob">—</div><div class="kpi-sub">esperando firma</div></div>
  </div>
<div class="chart-row">
    <div class="card"><div class="card-title" id="est-trend-title">Tendencia de cumplimiento — Todas las plantas</div><div class="bar-chart" id="est-trend-chart"></div></div>
    <div class="card"><div class="card-title">Estado de estudios</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin-top:8px">
        <div class="legend-items" id="est-legend" style="display:flex;flex-direction:column;gap:6px;justify-content:center"></div>
        <div style="position:relative;flex-shrink:0">
         <svg viewBox="0 0 160 160" width="200" height="200" id="est-donut-svg">
            <circle cx="80" cy="80" r="46" fill="none" stroke="var(--border)" stroke-width="22"/>
            <circle id="donut-arc" cx="70" cy="70" r="52" fill="none" stroke="var(--accent)" stroke-width="16" stroke-dasharray="0 327" stroke-dashoffset="82" stroke-linecap="butt" style="display:none"/>
          </svg>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center">
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="card"><div class="card-title">Estudios próximos a vencer (30 días)</div>
    <div class="table-wrap"><table><thead><tr><th>Producto</th><th>Lote</th><th>Condiciones</th><th>F. límite</th><th>Días</th><th>Ubicación</th><th>Estado</th></tr></thead>
    <tbody id="est-expiring-body"></tbody></table></div>
  </div>`;
}

function bindEstDashboard() {
  document.querySelectorAll('#est-dash-pills .loc-pill').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('#est-dash-pills .loc-pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active'); estDashLoc = p.dataset.dl;
      refreshEstDashboard();
    });
  });
  // KPI click → resultados con filtro
  document.getElementById('ek-curso')?.addEventListener('click', () => goEstResultsFiltered('curso'));
  document.getElementById('ek-venc')?.addEventListener('click',  () => goEstResultsFiltered('vencidos'));
  document.getElementById('ek-prox')?.addEventListener('click',  () => goEstResultsFiltered('proximos'));
  document.getElementById('ek-oos')?.addEventListener('click',   () => goEstResultsFiltered('oos'));
  document.getElementById('ek-aprob')?.addEventListener('click', () => goEstResultsFiltered('aprob'));
  refreshEstDashboard();
}

function getEstDashStudies() {
  if (estDashLoc==='p1') return STUDIES.filter(s=>s.planta==='Planta 1');
  if (estDashLoc==='p2') return STUDIES.filter(s=>s.planta==='Planta 2');
  return [...STUDIES];
}

let estKpiFilter = null;

function goEstResultsFiltered(filter) {
  estKpiFilter = filter;
  currentPage = 'results';
  renderNav();
  renderContent();
}

function refreshEstDashboard() {
  const d = getEstDashStudies();
  const pct = d.length ? Math.round(d.filter(s=>s.estado==='Completo'&&(s.cumpl==='Sí'||s.cumpl==='Si')).length/d.length*100) : 0;
  setEl('k-curso', d.filter(s=>s.estado==='En proceso'||s.estado==='Pendiente').length);
  setEl('k-venc',  d.filter(isExpired).length);
  setEl('k-prox',  d.filter(s=>isExpiringSoon(s,30)).length);
  setEl('k-cump',  pct+'%');
  setEl('k-oos',   d.filter(s=>s.oos).length);
  setEl('k-aprob', d.filter(s=>s.aprob==='Pendiente').length);
  // Donut multisegmento
const total = d.length || 1;
const cCompleto = d.filter(s=>s.estado==='Completo').length;
const cProceso = d.filter(s=>s.estado==='En proceso').length;
const cPendiente = d.filter(s=>s.estado==='Pendiente').length;
const cCancelado = d.filter(s=>s.estado==='Cancelado').length;
const svgEl = document.getElementById('est-donut-svg');
if(svgEl) {
  svgEl.querySelectorAll('.donut-seg,.donut-lbl-txt').forEach(e=>e.remove());
  const r=46,circ=2*Math.PI*r,cx=80,cy=80,sw=22;
  const segs=[
    {val:cCompleto,  col:'#27500A', label:'Completos'},
    {val:cProceso,   col:'#EF9F27', label:'En proceso'},
    {val:cPendiente, col:'#185FA5', label:'Pendientes'},
    {val:cCancelado, col:'#888780', label:'Cancelados'},
  ];
  let consumed = 0;
  segs.forEach(seg=>{
    if(!seg.val) return;
    const frac=seg.val/total;
    const dash=(frac*circ).toFixed(1);
    const gap=(circ*(1-frac)).toFixed(1);
    const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('class','donut-seg');
    circle.setAttribute('cx',cx);circle.setAttribute('cy',cy);circle.setAttribute('r',r);
    circle.setAttribute('fill','none');circle.setAttribute('stroke',seg.col);
    circle.setAttribute('stroke-width',sw);
    circle.setAttribute('stroke-dasharray',`${dash} ${gap}`);
    circle.setAttribute('stroke-dashoffset', (circ/4 - consumed).toFixed(1));
    circle.setAttribute('stroke-linecap','butt');
    svgEl.appendChild(circle);
    if(frac>0.05){
      const midFrac = consumed + (frac*circ)/2;
      const midAngle = (midFrac/circ)*2*Math.PI - Math.PI/2;
      const labelR = r + sw/2 + 11;
      const lx = (cx + labelR*Math.cos(midAngle)).toFixed(1);
      const ly = (cy + labelR*Math.sin(midAngle)).toFixed(1);
      const txt=document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('class','donut-lbl-txt');
      txt.setAttribute('x',lx);txt.setAttribute('y',ly);
      txt.setAttribute('text-anchor','middle');txt.setAttribute('dominant-baseline','middle');
      txt.setAttribute('font-size','9');txt.setAttribute('fill',seg.col);txt.setAttribute('font-weight','600');
      txt.textContent=`${Math.round(frac*100)}%`;
      svgEl.appendChild(txt);
    }
    consumed += frac*circ;
  });
}
setEl('donut-num', pct+'%');
  // Trend
  const tEl = document.getElementById('est-trend-chart');
  const tTi = document.getElementById('est-trend-title');
  if (tEl) {
    let q; if(estDashLoc==='p1'){q=QUARTERS_P1;if(tTi)tTi.textContent='Tendencia de cumplimiento — Planta 1';}
    else if(estDashLoc==='p2'){q=QUARTERS_P2;if(tTi)tTi.textContent='Tendencia de cumplimiento — Planta 2';}
    else{q=QUARTERS_TODAS;if(tTi)tTi.textContent='Tendencia de cumplimiento — Todas las plantas';}
    tEl.innerHTML=q.map(x=>{const col=x.pct>=85?'#639922':x.pct>=75?'#EF9F27':'#E24B4A';return`<div class="bar-row"><div class="bar-label">${x.q}</div><div class="bar-track"><div class="bar-fill" style="width:${x.pct}%;background:${col}"></div></div><div class="bar-pct" style="color:${col}">${x.pct}%</div></div>`;}).join('');
  }
  // Legend
  const lEl = document.getElementById('est-legend');
  if (lEl){const cs={'Completos':'#27500A','En proceso':'#EF9F27','Pendientes':'#185FA5','Cancelados':'#888780','Vencidos':'#E24B4A'};const cnt={Completos:d.filter(s=>s.estado==='Completo').length,'En proceso':d.filter(s=>s.estado==='En proceso').length,Pendientes:d.filter(s=>s.estado==='Pendiente').length,Cancelados:d.filter(s=>s.estado==='Cancelado').length,Vencidos:d.filter(isExpired).length};lEl.innerHTML=Object.entries(cnt).map(([l,c])=>`<div class="legend-item"><div class="legend-dot" style="background:${cs[l]}"></div>${l}: <strong>${c}</strong></div>`).join('');}
  // Expiring table
  const eb = document.getElementById('est-expiring-body');
  if (eb){const exp=d.filter(s=>isExpiringSoon(s,30)||isExpired(s)).sort((a,b)=>(daysLeft(a.limite)||9999)-(daysLeft(b.limite)||9999)).slice(0,8);eb.innerHTML=exp.map(s=>{const dl=daysLeft(s.limite),rowCls=dl<0?'row-danger':dl<=15?'row-warning':'';const dt=dl<0?`<span style="color:var(--danger);font-weight:500">Vencido</span>`:dl<=15?`<span style="color:var(--warning);font-weight:500">${dl}d</span>`:`${dl}d`;return`<tr class="${rowCls}"><td>${s.prod}</td><td>${s.lote}</td><td>${s.cond}</td><td>${s.limite}</td><td>${dt}</td><td>${s.planta}·${s.ubic}</td><td>${estBadge(s.estado)}</td></tr>`;}).join('');}
}

/* ============================================================
   ESTABILIDADES — RESULTS
   ============================================================ */
function buildEstResults() {
  const canCreate = ROLES[currentUser.rol].canCreate;
  return `<div class="filter-bar">
    ${multiFilter('est-estado','Estado',['Pendiente','En proceso','Completo','Cancelado'])}
    ${multiFilter('est-planta','Planta',['Planta 1','Planta 2'])}
    ${multiFilter('est-ubic','Ubicación física',[...UBICACIONES['Planta 1'],...UBICACIONES['Planta 2']])}
    ${multiFilter('est-div','División',['CH','PH'])}
    ${multiFilter('est-oos','OOS',[{val:'si',label:'Con OOS'},{val:'no',label:'Sin OOS'}],true)}
    <input id="est-search" class="filter-input" placeholder="Buscar producto o lote...">
    <button class="btn btn-ghost btn-sm" id="est-clear" style="color:var(--danger)">✕ Limpiar</button>
    <div class="filter-actions">
      ${canCreate?'<button class="btn btn-primary" id="est-btn-new">+ Nuevo estudio</button>':''}
      <div class="export-wrap">
        <button class="btn btn-ghost" id="est-export-toggle">Exportar ▾</button>
        <div class="export-dropdown hidden" id="est-export-dd">
          <button class="export-opt" id="est-exp-csv">CSV (.csv)</button>
          <button class="export-opt" id="est-exp-xlsx">Excel (.xlsx)</button>
        </div>
      </div>
    </div>
  </div>
  <div class="active-filters" id="est-chips"></div>
  <div class="table-wrap">
    <table id="est-table">
      <thead><tr>
        <th data-col="prod" onclick="estSort('prod')">Producto <span id="est-sort-prod"></span></th>
        <th data-col="lote" onclick="estSort('lote')">Lote <span id="est-sort-lote"></span></th>
        <th>Condiciones</th>
        <th data-col="tiempo" onclick="estSort('tiempo')">T. estab. <span id="est-sort-tiempo"></span></th>
        <th data-col="ingreso" onclick="estSort('ingreso')">F. ingreso <span id="est-sort-ingreso"></span></th>
        <th data-col="teorica" onclick="estSort('teorica')">F. teórica <span id="est-sort-teorica"></span></th>
        <th data-col="limite" onclick="estSort('limite')">F. límite <span id="est-sort-limite"></span></th>
        <th data-col="estado" onclick="estSort('estado')">Estado <span id="est-sort-estado"></span></th>
        <th>OOS</th>
        <th data-col="planta" onclick="estSort('planta')">Planta <span id="est-sort-planta"></span></th>
        <th>Ubicación</th>
        <th></th>
      </tr></thead>
      <tbody id="est-tbody"></tbody>
    </table>
  </div>
  <div id="est-no-results" class="no-results hidden">Sin resultados.</div>
  <div class="table-footer" id="est-footer"></div>`;
}

function bindEstResults() {
  bindMultiFilterGroup('est', ['estado','planta','ubic','div','oos'], () => renderEstTable());
  document.getElementById('est-search')?.addEventListener('input', () => renderEstTable());
  document.getElementById('est-clear')?.addEventListener('click', () => { clearMultiFilters('est',['estado','planta','ubic','div','oos']); document.getElementById('est-search').value=''; renderEstTable(); });
  document.getElementById('est-btn-new')?.addEventListener('click', () => navigateTo('form'));
  document.getElementById('est-export-toggle')?.addEventListener('click', e=>{e.stopPropagation();document.getElementById('est-export-dd').classList.toggle('hidden');});
  document.getElementById('est-exp-csv')?.addEventListener('click',  ()=>{document.getElementById('est-export-dd').classList.add('hidden');exportEstCSV();});
  document.getElementById('est-exp-xlsx')?.addEventListener('click', ()=>{document.getElementById('est-export-dd').classList.add('hidden');exportEstXLSX();});
  // Apply KPI filter if coming from dashboard
  if (estKpiFilter) { applyEstKpiFilter(estKpiFilter); estKpiFilter = null; }
  renderEstTable();
}

function applyEstKpiFilter(filter) {
  // Uncheck all first
  clearMultiFilters('est',['estado','planta','ubic','div','oos']);
  if (filter==='curso') { checkMultiOption('est-estado','Pendiente'); checkMultiOption('est-estado','En proceso'); }
  else if (filter==='vencidos') { checkMultiOption('est-estado','En proceso'); }
  else if (filter==='oos') { checkMultiOption('est-oos','si'); }
  else if (filter==='aprob') { /* filter handled in JS */ }
  ['estado','planta','ubic','div','oos'].forEach(k => updateMultiBtn('est',k));
  renderEstChips();
}

function checkMultiOption(dropId, val) {
  const cb = document.querySelector(`#mf-drop-${dropId} input[value="${val}"]`);
  if (cb) cb.checked = true;
}

function getEstFilteredData() {
  const estados = getChecked('est-estado'), plantas = getChecked('est-planta'), ubics = getChecked('est-ubic'), divs = getChecked('est-div'), oosV = getChecked('est-oos');
  const q = (document.getElementById('est-search')?.value||'').toLowerCase();
  let data = [...STUDIES];
  if (estados.length) data = data.filter(s=>estados.includes(s.estado));
  if (plantas.length) data = data.filter(s=>plantas.includes(s.planta));
  if (ubics.length)   data = data.filter(s=>ubics.includes(s.ubic));
  if (divs.length)    data = data.filter(s=>divs.includes(s.div));
  if (oosV.includes('si')&&!oosV.includes('no')) data=data.filter(s=>s.oos);
  if (oosV.includes('no')&&!oosV.includes('si')) data=data.filter(s=>!s.oos);
  if (q) data=data.filter(s=>s.prod.toLowerCase().includes(q)||s.lote.toLowerCase().includes(q));
  // estKpiFilter special cases
  return data;
}

function estSort(col) {
  if (estSortCol===col) estSortDir*=-1; else{estSortCol=col;estSortDir=1;}
  renderEstTable();
}

function renderEstTable() {
  renderEstChips();
  const tbody=document.getElementById('est-tbody'), noR=document.getElementById('est-no-results'), footer=document.getElementById('est-footer');
  let data = getEstFilteredData();
  if (estSortCol) data = data.slice().sort((a,b)=>compareVal(a,b,estSortCol)*estSortDir);
  // Sort indicators
  ['prod','lote','tiempo','ingreso','teorica','limite','estado','planta'].forEach(col=>{
    const el=document.getElementById('est-sort-'+col);
    if(el)el.textContent=estSortCol===col?(estSortDir===1?'↑':'↓'):'';
  });
  if (!tbody) return;
  if (!data.length){tbody.innerHTML='';noR?.classList.remove('hidden');if(footer)footer.textContent='0 registros';return;}
  noR?.classList.add('hidden');if(footer)footer.textContent=`${data.length} registro${data.length!==1?'s':''}`;
  tbody.innerHTML=data.map(s=>{
    const dl=daysLeft(s.limite),rowCls=isExpired(s)?'row-danger':isExpiringSoon(s,15)?'row-warning':'';
    const lS=dl<0?'color:var(--danger);font-weight:500':dl<=15?'color:var(--warning);font-weight:500':'';
    return `<tr class="${rowCls}"><td title="${s.prod}">${s.prod}</td><td>${s.lote}</td><td>${s.cond}</td><td>${s.tiempo}</td><td>${s.ingreso}</td><td>${s.teorica}</td><td style="${lS}">${s.limite}</td><td>${estBadge(s.estado)}</td><td>${s.oos?'<span class="badge badge-oos">OOS</span>':'<span class="badge badge-ok">No</span>'}</td><td>${s.planta}</td><td>${s.ubic}</td><td><button class="link-btn" onclick="showEstDetail(${s.id})">Ver detalle</button></td></tr>`;
  }).join('');
}

function renderEstChips() {
  const c=document.getElementById('est-chips');if(!c)return;
  const labels={estado:'Estado',planta:'Planta',ubic:'Ubicación',div:'División',oos:'OOS'};
  const oosL={si:'Con OOS',no:'Sin OOS'};
  c.innerHTML=['estado','planta','ubic','div','oos'].flatMap(k=>getChecked('est-'+k).map(v=>`<div class="filter-chip"><span>${labels[k]}: ${k==='oos'?oosL[v]||v:v}</span><button class="chip-remove" onclick="removeEstChip('${k}','${v}')">×</button></div>`)).join('');
}

function removeEstChip(k,v){
  const cb=document.querySelector(`#mf-drop-est-${k} input[value="${v}"]`);if(cb)cb.checked=false;
  updateMultiBtn('est',k);renderEstTable();
}

function exportEstCSV() {
  const h=['ID','Código','Producto','Lote','División','Planta','Ubicación','Condiciones','Tiempo','F.Ingreso','F.Teórica','F.Límite','Estado','OOS','Cumplió','Aprobación','Analista FQ','Contenido','Deg.1','Deg.2','Deg.3','Disolución','Observaciones'];
  const rows=getEstFilteredData().map(s=>[s.id,s.cod,s.prod,s.lote,s.div,s.planta,s.ubic,s.cond,s.tiempo,s.ingreso,s.teorica,s.limite,s.estado,s.oos?'Sí':'No',s.cumpl||'',s.aprob||'',s.analistFQ||'',s.contenido||'',s.deg1||'',s.deg2||'',s.deg3||'',s.disol||'',s.obs||'']);
  csvDownload([h,...rows],'estabilidades_'+dateStamp());
}

function exportEstXLSX() {
  if(typeof XLSX==='undefined'){alert('SheetJS no disponible.');return;}
  const h=['ID','Código','Producto','Lote','División','Planta','Ubicación','Condiciones','Tiempo','F.Ingreso','F.Teórica','F.Límite','Estado','OOS','Cumplió','Aprobación','Analista FQ','Contenido','Deg.1','Deg.2','Deg.3','Disolución','Observaciones'];
  const rows=getEstFilteredData().map(s=>[s.id,s.cod,s.prod,s.lote,s.div,s.planta,s.ubic,s.cond,s.tiempo,s.ingreso,s.teorica,s.limite,s.estado,s.oos?'Sí':'No',s.cumpl||'',s.aprob||'',s.analistFQ||'',s.contenido||'',s.deg1||'',s.deg2||'',s.deg3||'',s.disol||'',s.obs||'']);
  xlsxDownload(h,rows,'Estabilidades','estabilidades_'+dateStamp());
}

/* ============================================================
   ESTABILIDADES — DETAIL
   ============================================================ */
let currentEstDetailId = null;

function showEstDetail(id) {
  pendingChanges = {};
  currentEstDetailId = id;
  detailEditMode = false;
  currentPage = 'full';
  renderNav();
  renderContent();
}

function buildDetailPage(mod) {
  return `<div class="detail-top-bar">
    <div class="detail-search-bar">
      <input id="detail-search" class="filter-input" placeholder="Buscar ${mod==='est'?'estudios':'lotes'}..." style="width:250px">
      <div class="detail-search-results hidden" id="detail-search-results"></div>
    </div>
    <div class="detail-mode-toggle">
      <button class="mode-btn${detailEditMode?'':' active'}" id="btn-mode-read" onclick="setDetailMode(false)">Solo lectura</button>
      <button class="mode-btn${detailEditMode?' active':''}" id="btn-mode-edit" onclick="setDetailMode(true)" ${!ROLES[currentUser.rol].canEdit?'disabled':''}>Modo edición</button>
    </div>
  </div>
  <div id="detail-content">${mod==='est'?renderEstDetail():renderScrumDetail()}</div>`;
}

function bindDetailPage(mod) {
  document.getElementById('detail-search')?.addEventListener('input', function() {
    const q=this.value.toLowerCase().trim(), res=document.getElementById('detail-search-results');
    if(!q){res.classList.add('hidden');return;}
    const src = mod==='est'?STUDIES:SCRUM_RECORDS;
    const matches=src.filter(s=>(s.prod||s.desc||'').toLowerCase().includes(q)||(s.lote||'').toLowerCase().includes(q)||(s.cod||'').toLowerCase().includes(q)).slice(0,6);
    res.innerHTML=matches.length?matches.map(s=>`<div class="ds-item" onclick="${mod==='est'?'showEstDetail':'showScrumDetail'}(${s.id})"><div class="ds-item-name">${s.prod||s.desc}</div><div class="ds-item-meta">${s.lote} · ${s.planta} · ${mod==='est'?estBadge(s.estado):scrumBadge(s.statusFinal)}</div></div>`).join(''):'<div class="ds-no-result">Sin resultados</div>';
    res.classList.remove('hidden');
  });
}

function setDetailMode(edit) {
  if (edit && !ROLES[currentUser.rol].canEdit) return;
  pendingChanges = {};
  detailEditMode = edit;
  document.getElementById('btn-mode-read')?.classList.toggle('active', !edit);
  document.getElementById('btn-mode-edit')?.classList.toggle('active', edit);
  document.getElementById('detail-content').innerHTML = currentModule==='est' ? renderEstDetail() : renderScrumDetail();
}

function confirmSaved() {
  const btn = event.target;
  btn.textContent = '✓ Cambios guardados';
  btn.style.background = 'var(--success)';
  setTimeout(()=>{btn.textContent='✓ Guardado';btn.style.background='';}, 2000);
}

function renderEstDetail() {
  if (!currentEstDetailId) return '<div style="padding:40px;text-align:center;color:var(--text3)">Selecciona un estudio desde Resultados.</div>';
  const s = STUDIES.find(x=>x.id===currentEstDetailId); if(!s)return'';
  const e = detailEditMode && ROLES[currentUser.rol].canEdit;
  const dl=daysLeft(s.limite), lS=dl<0?'color:var(--danger);font-weight:500':dl<=15?'color:var(--warning);font-weight:500':'';
  const fi=(label,key,type='text',opts=null)=>detailField(s,currentEstDetailId,label,key,type,opts,e,'est');
  const ESTADOS=['Pendiente','En proceso','Completo','Cancelado'],APROBS=['—','Aprobado','Rechazado','Pendiente'],SN=['—','Sí','No'];
  return `<div class="detail-header">
    <button class="btn btn-ghost btn-sm" onclick="navigateTo('results')">← Volver</button>
    <span class="detail-title">${s.prod} — Lote ${s.lote}</span>
    ${estBadge(s.estado)} ${s.oos?'<span class="badge badge-oos">OOS</span>':''}
    <span style="margin-left:auto;font-size:11px;color:var(--text3);font-family:var(--font-mono)">${s.cod}·${s.div}</span>
    ${e?`<button class="btn btn-primary btn-sm" id="btn-save-detail" onclick="commitSaveDetail()">Guardar cambios</button>`:''}
  </div>
  ${e?'<div class="detail-edit-notice">Modo edición activo — los cambios se guardan al confirmar y se registran en Actividad.</div>':''}
  <div class="detail-grid">
    <div class="card"><div class="card-title">Identificación</div><table class="detail-table"><tbody>
      ${fi('Código','cod')}${fi('Producto','prod')}${fi('Lote','lote')}${fi('División','div','select',['CH','PH'])}${fi('Empaque','empaque')}${fi('Planta','planta','select',['Planta 1','Planta 2'])}${fi('Ubicación física','ubic','select',UBICACIONES[s.planta]||[])}${fi('Motivo','motivo')}
    </tbody></table></div>
    <div class="card"><div class="card-title">Fechas y condiciones</div><table class="detail-table"><tbody>
      ${fi('Condiciones','cond')}${fi('Tiempo','tiempo','select',['3 meses','6 meses','9 meses','12 meses','18 meses','24 meses','36 meses'])}${fi('F. elaboración','elab','date')}${fi('F. entrada cámara','camara','date')}${fi('F. ingreso','ingreso','date')}${fi('F. teórica','teorica','date')}
      <tr><td>F. límite</td><td>${e?`<input type="date" class="detail-inline-input" value="${s.limite?s.limite.split('/').reverse().join('-'):''}" style="${lS}" onchange="saveField('est',${currentEstDetailId},'limite',fmtDate(this.value))">`:`<span style="${lS}">${s.limite||'—'}</span>`}</td></tr>
      ${fi('F. teórica salida','salida','date')}${fi('F. teórica liberación','libteor','date')}${fi('F. liberación','lib','date')}
    </tbody></table></div>
    <div class="card"><div class="card-title">Estado</div><table class="detail-table"><tbody>
      ${fi('Estado','estado','select',ESTADOS)}${fi('Cumplió','cumpl','select',SN)}${fi('Cumpl. estabilidad','cumplEst','select',SN)}${fi('Aprobación','aprob','select',APROBS)}${fi('Semana aprob.','semana')}${fi('Condiciones salida','condsal')}${fi('Status','status')}
      ${s.estado==='Cancelado'?fi('Motivo cancelación','motivo','textarea'):''}
    </tbody></table></div>
    <div class="card"><div class="card-title">Análisis FQ / Micro</div><table class="detail-table"><tbody>
      ${fi('Analista FQ','analistFQ','select',USERS_LIST.filter(u=>['analyst','supervisor'].includes(u.rol)&&u.estado==='activo').map(u=>u.nombre))}${fi('F. análisis FQ inicio','fqi','date')}${fi('F. análisis FQ fin','fqf','date')}${fi('F. validación FQ','fqv','date')}${fi('Lleva micro','micro','select',['Sí','No'])}${fi('Analista micro','analistMicro','select',USERS_LIST.filter(u=>['analyst','supervisor','admin'].includes(u.rol)&&u.estado==='activo').map(u=>u.nombre))}${fi('F. muestreo micro ini','msi','date')}${fi('F. muestreo micro fin','msf','date')}
    </tbody></table></div>
    <div class="card"><div class="card-title">Resultados</div><table class="detail-table"><tbody>
      ${fi('Contenido','contenido')}${fi('Degradación 1','deg1')}${fi('Degradación 2','deg2')}${fi('Degradación 3','deg3')}${fi('Disolución','disol')}
    </tbody></table></div>
    <div class="card"><div class="card-title">Muestreo</div><table class="detail-table"><tbody>
      ${fi('Límite inferior','limInf')}${fi('Límite superior','limSup')}${fi('Corredor','corredor')}${fi('Observaciones','obs','textarea')}
    </tbody></table></div>
    ${s.oos?`<div class="card oos-card" style="grid-column:1/-1"><div class="card-title oos-title">OOS — Fuera de especificación</div>${e?`<textarea class="detail-inline-textarea" style="width:100%;min-height:60px" onblur="saveField('est',${currentEstDetailId},'oos_obs',this.value)">${s.oos_obs||''}</textarea>`:`<p style="font-size:13px;line-height:1.5">${s.oos_obs||''}</p>`}</div>`:''}
    <div class="card" style="grid-column:1/-1"><div class="card-title">Historial de este estudio</div>
      ${AUDIT_LOG.filter(a=>a.module==='est'&&a.study===currentEstDetailId).slice(0,6).map(auditRowHtml).join('')||'<p style="font-size:12px;color:var(--text3)">Sin cambios registrados.</p>'}
    </div>
  </div>`;
}

/* ============================================================
   ESTABILIDADES — FORM
   ============================================================ */
function buildEstForm() {
  return `<div class="form-container">
    <div class="form-header">
      <div><h2 class="form-title">Nuevo estudio de estabilidad</h2><p class="form-subtitle">Los campos <span class="req-star">*</span> son obligatorios</p></div>
      <button class="btn btn-ghost" id="est-cancel-form">Cancelar</button>
    </div>
    <div class="card form-card">
      <div class="form-section-head">Identificación y ubicación</div>
      <div class="form-grid">
        <div class="field"><label>Planta <span class="req-star">*</span></label><select id="fp-planta"><option value="">Seleccionar...</option><option>Planta 1</option><option>Planta 2</option></select></div>
        <div class="field"><label>Ubicación física <span class="req-star">*</span></label><select id="fp-ubicfis"><option value="">— seleccione planta primero —</option></select></div>
        <div class="field"><label>División <span class="req-star">*</span></label><select id="fp-div"><option value="">Seleccionar...</option><option>CH</option><option>PH</option></select></div>
        <div class="field"><label>Código <span class="req-star">*</span></label><input id="fp-cod" placeholder="Ej: PRD-00421"></div>
        <div class="field"><label>Producto <span class="req-star">*</span></label><input id="fp-prod" placeholder="Nombre del producto"></div>
        <div class="field"><label>Lote <span class="req-star">*</span></label><input id="fp-lote" placeholder="Ej: L240118"></div>
        <div class="field"><label>Material de empaque</label><input id="fp-empaque" placeholder="Ej: Blíster PVC/PVDC"></div>
        <div class="field"><label>Motivo del ensayo</label><input id="fp-motivo"></div>
      </div>
      <div class="form-section-head">Condiciones de almacenamiento</div>
      <div class="form-grid">
        <div class="field full-col"><label>Condiciones <span class="req-star">*</span></label>
          <div class="cond-builder">
            <div class="cond-group"><div class="cond-group-title">Temperatura</div><div class="cond-row">
              <select id="fp-temp-tipo" class="cond-tipo-sel" onchange="updateCondPreview()"><option value="exacta">Valor exacto</option><option value="rango">Rango</option></select>
              <div id="cond-temp-exacta" class="cond-sub"><input id="fp-temp-val" type="number" step="0.1" placeholder="25" class="cond-num" oninput="updateCondPreview()"><span class="cond-unit">°C</span></div>
              <div id="cond-temp-rango" class="cond-sub hidden"><input id="fp-temp-min" type="number" step="0.1" placeholder="Mín" class="cond-num-sm" oninput="updateCondPreview()"><span class="cond-sep">–</span><input id="fp-temp-max" type="number" step="0.1" placeholder="Máx" class="cond-num-sm" oninput="updateCondPreview()"><span class="cond-unit">°C</span></div>
            </div></div>
            <div class="cond-slash">/</div>
            <div class="cond-group"><div class="cond-group-title">Humedad relativa</div><div class="cond-row">
              <select id="fp-hr-tipo" class="cond-tipo-sel" onchange="updateCondPreview()"><option value="exacta">Valor exacto</option><option value="rango">Rango</option><option value="na">N/A</option></select>
              <div id="cond-hr-exacta" class="cond-sub"><input id="fp-hr-val" type="number" step="0.1" placeholder="60" class="cond-num" oninput="updateCondPreview()"><span class="cond-unit">% HR</span></div>
              <div id="cond-hr-rango" class="cond-sub hidden"><input id="fp-hr-min" type="number" step="0.1" placeholder="Mín" class="cond-num-sm" oninput="updateCondPreview()"><span class="cond-sep">–</span><input id="fp-hr-max" type="number" step="0.1" placeholder="Máx" class="cond-num-sm" oninput="updateCondPreview()"><span class="cond-unit">% HR</span></div>
            </div></div>
            <div class="cond-preview-block"><span class="cond-preview-lbl">Vista previa:</span><span class="cond-preview-val" id="cond-preview">—</span></div>
          </div>
        </div>
        <div class="field"><label>Tiempo <span class="req-star">*</span></label><select id="fp-tiempo"><option value="">Seleccionar...</option><option>3 meses</option><option>6 meses</option><option>9 meses</option><option>12 meses</option><option>18 meses</option><option>24 meses</option><option>36 meses</option></select></div>
        <div class="field"><label>Fecha elaboración</label><input type="date" id="fp-elab"></div>
        <div class="field"><label>Fecha entrada cámara</label><input type="date" id="fp-camara"></div>
        <div class="field"><label>Fecha ingreso <span class="req-star">*</span></label><input type="date" id="fp-ingreso"><span class="err-msg hidden" id="err-ingreso">Obligatorio</span></div>
        <div class="field"><label>Fecha teórica <span class="req-star">*</span></label><input type="date" id="fp-teorica"><span class="err-msg hidden" id="err-teorica">Debe ser posterior a ingreso</span></div>
        <div class="field"><label>Fecha límite <span class="req-star">*</span></label><input type="date" id="fp-limite"><span class="err-msg hidden" id="err-limite">Debe ser posterior a teórica</span></div>
        <div class="field"><label>Límite inferior</label><input id="fp-lim-inf" placeholder="90.0%"></div>
        <div class="field"><label>Límite superior</label><input id="fp-lim-sup" placeholder="110.0%"></div>
        <div class="field"><label>Corredor</label><input id="fp-corredor" placeholder="±5%"></div>
      </div>
      <div class="form-section-head">Estado</div>
      <div class="form-grid">
        <div class="field"><label>Estado <span class="req-star">*</span></label><select id="fp-estado"><option>Pendiente</option><option>En proceso</option><option>Completo</option><option>Cancelado</option></select></div>
        <div class="field"><label>OOS</label><select id="fp-oos"><option>No</option><option>Sí</option></select></div>
        <div class="field full-col" id="oos-block" style="display:none"><label>Observaciones OOS <span class="req-star">*</span></label><textarea id="fp-oos-obs"></textarea></div>
        <div class="field full-col" id="cancel-block" style="display:none"><label>Motivo cancelación <span class="req-star">*</span></label><textarea id="fp-cancel"></textarea></div>
      </div>
      <div class="form-section-head">Análisis</div>
      <div class="form-grid">
        <div class="field"><label>Analista FQ</label><select id="fp-anfq"><option value="">Seleccionar...</option>${USERS_LIST.filter(u=>['analyst','supervisor'].includes(u.rol)&&u.estado==='activo').map(u=>`<option>${u.nombre}</option>`).join('')}</select></div>
        <div class="field"><label>F. inicio análisis FQ</label><input type="date" id="fp-fqi"></div>
        <div class="field"><label>F. fin análisis FQ</label><input type="date" id="fp-fqf"></div>
        <div class="field"><label>F. validación FQ</label><input type="date" id="fp-fqv"></div>
        <div class="field"><label>¿Lleva micro?</label><select id="fp-micro"><option>No</option><option>Sí</option></select></div>
        <div class="field"><label>Analista micro</label><select id="fp-anmicro"><option value="">Seleccionar...</option>${USERS_LIST.filter(u=>['analyst','supervisor'].includes(u.rol)&&u.estado==='activo').map(u=>`<option>${u.nombre}</option>`).join('')}</select></div>
        <div class="field" id="micro-ini" style="display:none"><label>F. muestreo micro ini</label><input type="date" id="fp-msi"></div>
        <div class="field" id="micro-fin" style="display:none"><label>F. muestreo micro fin</label><input type="date" id="fp-msf"></div>
      </div>
      <div class="form-section-head">Resultados de análisis</div>
      <div class="form-grid">
        <div class="field"><label>Contenido</label><input id="fp-contenido" placeholder="98.5%"></div>
        <div class="field"><label>Degradación 1</label><input id="fp-deg1" placeholder="0.12%"></div>
        <div class="field"><label>Degradación 2</label><input id="fp-deg2" placeholder="0.08%"></div>
        <div class="field"><label>Degradación 3</label><input id="fp-deg3" placeholder="ND"></div>
        <div class="field"><label>Disolución</label><input id="fp-disol" placeholder="Q=87%"></div>
        <div class="field full-col"><label>Observaciones</label><textarea id="fp-obs"></textarea></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="est-cancel-form-2">Cancelar</button>
        <button class="btn btn-primary" id="est-submit">Guardar estudio</button>
      </div>
    </div>
  </div>`;
}

function bindEstForm() {
  document.getElementById('est-cancel-form')?.addEventListener('click',()=>navigateTo('results'));
  document.getElementById('est-cancel-form-2')?.addEventListener('click',()=>navigateTo('results'));
  document.getElementById('est-submit')?.addEventListener('click',submitEstForm);
  document.getElementById('fp-planta')?.addEventListener('change',updateEstFormCond);
  document.getElementById('fp-estado')?.addEventListener('change',updateEstFormCond);
  document.getElementById('fp-oos')?.addEventListener('change',updateEstFormCond);
  document.getElementById('fp-micro')?.addEventListener('change',updateEstFormCond);
  document.getElementById('fp-temp-tipo')?.addEventListener('change',updateCondPreview);
  document.getElementById('fp-hr-tipo')?.addEventListener('change',updateCondPreview);
  ['fp-ingreso','fp-teorica','fp-limite'].forEach(id=>document.getElementById(id)?.addEventListener('change',validateEstDates));
}

function updateEstFormCond() {
  const planta=v('fp-planta'), sel=document.getElementById('fp-ubicfis');
  if(sel)sel.innerHTML=planta?(UBICACIONES[planta]||[]).map(u=>`<option>${u}</option>`).join(''):'<option value="">— seleccione planta primero —</option>';
  const e=document.getElementById('fp-estado')?.value;
  document.getElementById('cancel-block').style.display=e==='Cancelado'?'flex':'none';
  document.getElementById('oos-block').style.display=v('fp-oos')==='Sí'?'flex':'none';
  const micro=v('fp-micro');
  ['micro-ini','micro-fin'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=micro==='Sí'?'':'none';});
  const am=document.getElementById('fp-anmicro');if(am)am.disabled=micro!=='Sí';
}

function updateCondPreview() {
  const tt=v('fp-temp-tipo'), ht=v('fp-hr-tipo');
  document.getElementById('cond-temp-exacta')?.classList.toggle('hidden',tt!=='exacta');
  document.getElementById('cond-temp-rango')?.classList.toggle('hidden',tt!=='rango');
  document.getElementById('cond-hr-exacta')?.classList.toggle('hidden',ht!=='exacta');
  document.getElementById('cond-hr-rango')?.classList.toggle('hidden',ht!=='rango');
  let ts='',hs='';
  if(tt==='exacta'){const x=v('fp-temp-val');if(x)ts=`${x}°C`;}
  else if(tt==='rango'){const mn=v('fp-temp-min'),mx=v('fp-temp-max');if(mn||mx)ts=`${mn||'?'}–${mx||'?'}°C`;}
  if(ht==='na')hs='N/A';
  else if(ht==='exacta'){const x=v('fp-hr-val');if(x)hs=`${x}% HR`;}
  else if(ht==='rango'){const mn=v('fp-hr-min'),mx=v('fp-hr-max');if(mn||mx)hs=`${mn||'?'}–${mx||'?'}% HR`;}
  const p=document.getElementById('cond-preview');if(p)p.textContent=(ts&&hs)?`${ts} / ${hs}`:ts||hs||'—';
}

function validateEstDates() {
  const ing=v('fp-ingreso'),teo=v('fp-teorica'),lim=v('fp-limite'); let ok=true;
  const show=(eid,iid,cond)=>{document.getElementById(eid)?.classList.toggle('hidden',!cond);document.getElementById(iid)?.classList.toggle('error',cond);if(cond)ok=false;};
  show('err-ingreso','fp-ingreso',!ing);
  show('err-teorica','fp-teorica',!teo||(ing&&teo<=ing));
  show('err-limite','fp-limite',!lim||(teo&&lim<=teo));
  return ok;
}

async function submitEstForm() {
  const prod=v('fp-prod').trim(),planta=v('fp-planta'),lote=v('fp-lote').trim(),cod=v('fp-cod').trim();
  const cond=document.getElementById('cond-preview')?.textContent||'';
  if(!prod||!planta||!lote||!cod||cond==='—'){alert('Complete los campos obligatorios.');return;}
  if(!validateEstDates()){alert('Corrija errores de fechas.');return;}
  const ns={id:STUDIES.length+1,cod,prod,lote,planta,cond,ubic:v('fp-ubicfis')||'',div:v('fp-div')||'',tiempo:v('fp-tiempo')||'',ingreso:fmtDate(v('fp-ingreso')),teorica:fmtDate(v('fp-teorica')),limite:fmtDate(v('fp-limite')),estado:v('fp-estado')||'Pendiente',oos:v('fp-oos')==='Sí',oos_obs:v('fp-oos-obs')||'',cumpl:'',aprob:'Pendiente',analistFQ:v('fp-anfq')||'',analistMicro:v('fp-anmicro')||'',micro:v('fp-micro')||'No',contenido:v('fp-contenido')||'',deg1:v('fp-deg1')||'',deg2:v('fp-deg2')||'',deg3:v('fp-deg3')||'',disol:v('fp-disol')||'',obs:v('fp-obs')||'',elab:fmtDate(v('fp-elab')),camara:fmtDate(v('fp-camara')),fqi:fmtDate(v('fp-fqi')),fqf:fmtDate(v('fp-fqf')),fqv:fmtDate(v('fp-fqv')),msi:fmtDate(v('fp-msi'))||'N/A',msf:fmtDate(v('fp-msf'))||'N/A',motivo:v('fp-motivo')||'',empaque:v('fp-empaque')||'',condsal:'',semana:'',status:'Pendiente',limInf:v('fp-lim-inf')||'',limSup:v('fp-lim-sup')||'',corredor:v('fp-corredor')||'',cumplEst:'',salida:'',libteor:'',lib:''};
 const saved = await dbInsertStudy(ns);
  if (!saved) { alert('Error al guardar en Supabase.'); return; }
  STUDIES.push(saved);
  const entry = {who:currentUser.nombre,what:`Creó estudio: ${prod} (${lote}) · ${planta}`,when:nowStr(),field:'creación',old:'',new:lote,study:saved.id,module:'est'};
  AUDIT_LOG.unshift(entry);
  await dbInsertAudit(entry);
  alert(`Estudio guardado: ${prod} — ${lote}`);
  navigateTo('results');
}

/* ============================================================
   SCRUM — DASHBOARD
   ============================================================ */
function buildScrumDashboard() {
  const today = new Date(), weekAgo = new Date(today); weekAgo.setDate(today.getDate()-7);
  return `<div class="dash-filter-bar">
    <span class="loc-label">Planta:</span>
    <div class="loc-pills" id="scrum-dash-pills">
      <button class="loc-pill active" data-sdl="todas">Todas</button>
      <button class="loc-pill" data-sdl="p1">Planta 1</button>
      <button class="loc-pill" data-sdl="p2">Planta 2</button>
    </div>
    <span class="loc-label" style="margin-left:12px">División:</span>
    <div class="loc-pills" id="scrum-div-pills">
      <button class="loc-pill active" data-sdiv="todas">Todas</button>
      <button class="loc-pill" data-sdiv="PH">PH</button>
      <button class="loc-pill" data-sdiv="CH">CH</button>
      <button class="loc-pill" data-sdiv="INY">INY</button>
    </div>
  </div>
  <div class="kpi-grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">
    <div class="kpi kpi-danger" id="sk-overdue" style="cursor:pointer"><div class="kpi-label">Overdue</div><div class="kpi-val" id="k-s-overdue">—</div><div class="kpi-sub">fuera de tiempo</div></div>
    <div class="kpi kpi-warning" id="sk-semana" style="cursor:pointer"><div class="kpi-label">Por vencer esta semana</div><div class="kpi-val" id="k-s-semana">—</div><div class="kpi-sub">próximos 7 días</div></div>
    <div class="kpi kpi-info" id="sk-ingresados" style="cursor:pointer"><div class="kpi-label">Ingresados esta semana</div><div class="kpi-val" id="k-s-ingresados">—</div><div class="kpi-sub">lotes nuevos</div></div>
    <div class="kpi kpi-success"><div class="kpi-label">Liberados a tiempo</div><div class="kpi-val" id="k-s-atime">—</div><div class="kpi-sub">de los terminados</div></div>
    <div class="kpi kpi-warning"><div class="kpi-label">Lotes este mes</div><div class="kpi-val" id="k-s-mes">—</div><div class="kpi-sub">liberados en total</div></div>
  </div>
  <div class="chart-row">
    <div class="card"><div class="card-title" id="scrum-trend-title">Liberados a tiempo vs Overdue — Todos</div><div class="bar-chart" id="scrum-trend-chart"></div></div>
    <div class="card"><div class="card-title">Estado de lotes</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin-top:8px">
        <div id="scrum-legend" style="display:flex;flex-direction:column;gap:6px;"></div>
        <div style="position:relative;flex-shrink:0">
          <svg viewBox="0 0 160 160" width="200" height="200" id="scrum-donut-svg">
            <circle cx="80" cy="80" r="46" fill="none" stroke="var(--border)" stroke-width="22"/>
          </svg>
         <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center">
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="card"><div class="card-title">Lotes próximos a vencer / overdue</div>
    <div class="table-wrap"><table><thead><tr><th>Código</th><th>Descripción</th><th>Lote</th><th>Límite QC</th><th>Días</th><th>Planta</th><th>Status final</th></tr></thead>
    <tbody id="scrum-expiring-body"></tbody></table></div>
  </div>`;
}

function bindScrumDashboard() {
  document.querySelectorAll('#scrum-dash-pills .loc-pill').forEach(p=>{
    p.addEventListener('click',()=>{document.querySelectorAll('#scrum-dash-pills .loc-pill').forEach(x=>x.classList.remove('active'));p.classList.add('active');scrumDashLoc=p.dataset.sdl;refreshScrumDashboard();});
  });
  document.querySelectorAll('#scrum-div-pills .loc-pill').forEach(p=>{
    p.addEventListener('click',()=>{document.querySelectorAll('#scrum-div-pills .loc-pill').forEach(x=>x.classList.remove('active'));p.classList.add('active');scrumDashDiv=p.dataset.sdiv;refreshScrumDashboard();});
  });
  document.getElementById('sk-overdue')?.addEventListener('click',()=>goScrumResultsFiltered('overdue'));
  document.getElementById('sk-semana')?.addEventListener('click',()=>goScrumResultsFiltered('semana'));
  document.getElementById('sk-ingresados')?.addEventListener('click',()=>goScrumResultsFiltered('ingresados'));
  refreshScrumDashboard();
}

let scrumKpiFilter = null;
function goScrumResultsFiltered(f){scrumKpiFilter=f;currentPage='results';renderNav();renderContent();}

function getScrumDashData() {
  let d=[...SCRUM_RECORDS];
  if(scrumDashLoc==='p1')d=d.filter(r=>r.planta==='Planta 1');
  if(scrumDashLoc==='p2')d=d.filter(r=>r.planta==='Planta 2');
  if(scrumDashDiv!=='todas')d=d.filter(r=>r.div===scrumDashDiv);
  return d;
}

function refreshScrumDashboard() {
  const d=getScrumDashData(), today=new Date();
  const weekMs=7*86400000;
  const overdue=d.filter(r=>r.liberadoATiempo==='Overdue').length;
  const semana=d.filter(r=>{const dl=daysLeft(r.limiteQC);return dl!==null&&dl>=0&&dl<=7&&r.statusFinal==='Pendiente';}).length;
  const ingresados=d.filter(r=>{const dt=parseDate(r.identDeposito);return dt&&(today-dt)<=weekMs;}).length;
  const terminados=d.filter(r=>r.statusFinal==='Terminado');
  const atime=terminados.filter(r=>r.liberadoATiempo==='Cumplió').length;
  const mes=d.filter(r=>{const dt=parseDate(r.identDeposito);return dt&&dt.getMonth()===today.getMonth()&&dt.getFullYear()===today.getFullYear();}).length;
  setEl('k-s-overdue',overdue);setEl('k-s-semana',semana);setEl('k-s-ingresados',ingresados);
  setEl('k-s-atime',terminados.length?`${Math.round(atime/terminados.length*100)}%`:'—');
  setEl('k-s-mes',mes);
  // Trend (quarters simulados por cumplimiento a tiempo)
  const tEl=document.getElementById('scrum-trend-chart');
  const tTi=document.getElementById('scrum-trend-title');
  const locLabel=scrumDashLoc==='todas'?'Todos':scrumDashLoc, divLabel=scrumDashDiv==='todas'?'':` · ${scrumDashDiv}`;
  if(tTi)tTi.textContent=`Liberados a tiempo vs Overdue — ${locLabel}${divLabel}`;
  const terminadosQ=(q,year)=>d.filter(r=>{const dt=parseDate(r.identDeposito);if(!dt)return false;const qm=Math.floor(dt.getMonth()/3);return dt.getFullYear()===year&&qm===(q-1)&&r.statusFinal==='Terminado';});
const qData=[
  {q:'Q1 2025',ok:terminadosQ(1,2025).filter(r=>r.liberadoATiempo==='Cumplió').length,late:terminadosQ(1,2025).filter(r=>r.liberadoATiempo==='Overdue').length},
  {q:'Q2 2025',ok:terminadosQ(2,2025).filter(r=>r.liberadoATiempo==='Cumplió').length,late:terminadosQ(2,2025).filter(r=>r.liberadoATiempo==='Overdue').length},
  {q:'Q3 2025',ok:terminadosQ(3,2025).filter(r=>r.liberadoATiempo==='Cumplió').length,late:terminadosQ(3,2025).filter(r=>r.liberadoATiempo==='Overdue').length},
  {q:'Q4 2025',ok:terminadosQ(4,2025).filter(r=>r.liberadoATiempo==='Cumplió').length,late:terminadosQ(4,2025).filter(r=>r.liberadoATiempo==='Overdue').length},
  {q:'Q1 2026',ok:atime,late:overdue}
];
  if(tEl)tEl.innerHTML=qData.map(x=>{const tot=x.ok+x.late||1,pct=Math.round(x.ok/tot*100),col=pct>=80?'#639922':pct>=60?'#EF9F27':'#E24B4A';return`<div class="bar-row"><div class="bar-label">${x.q}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${col}"></div></div><div class="bar-pct" style="color:${col}">${pct}%</div></div>`;}).join('');
  // Legend
  const lEl=document.getElementById('scrum-legend');
const scrumSvg=document.getElementById('scrum-donut-svg');
const cTerminado=d.filter(r=>r.statusFinal==='Terminado').length;
const cPendienteS=d.filter(r=>r.statusFinal==='Pendiente'&&r.liberadoATiempo!=='Overdue').length;
const cOverdue=d.filter(r=>r.liberadoATiempo==='Overdue').length;
const totalS=d.length||1;
if(lEl){
  const cs={Terminado:'#27500A','Pendiente (sin vencer)':'#185FA5','Overdue':'#E24B4A'};
  const cnt={Terminado:cTerminado,'Pendiente (sin vencer)':cPendienteS,'Overdue':cOverdue};
  lEl.innerHTML=Object.entries(cnt).map(([l,c])=>`<div class="legend-item"><div class="legend-dot" style="background:${cs[l]}"></div>${l}: <strong>${c}</strong></div>`).join('');
}
if(scrumSvg){
  scrumSvg.querySelectorAll('.donut-seg,.donut-lbl-txt').forEach(e=>e.remove());
  const r=46,circ=2*Math.PI*r,cx=80,cy=80,sw=22;
  const segs=[
    {val:cTerminado, col:'#27500A'},
    {val:cPendienteS,col:'#185FA5'},
    {val:cOverdue,   col:'#E24B4A'},
  ];
  let consumed = 0;
  segs.forEach(seg=>{
    if(!seg.val) return;
    const frac=seg.val/totalS;
    const dash=(frac*circ).toFixed(1);
    const gap=(circ*(1-frac)).toFixed(1);
    const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('class','donut-seg');
    circle.setAttribute('cx',cx);circle.setAttribute('cy',cy);circle.setAttribute('r',r);
    circle.setAttribute('fill','none');circle.setAttribute('stroke',seg.col);
    circle.setAttribute('stroke-width',sw);
    circle.setAttribute('stroke-dasharray',`${dash} ${gap}`);
    circle.setAttribute('stroke-dashoffset', (circ/4 - consumed).toFixed(1));
    circle.setAttribute('stroke-linecap','butt');
    scrumSvg.appendChild(circle);
    if(frac>0.05){
      const midFrac = consumed + (frac*circ)/2;
      const midAngle = (midFrac/circ)*2*Math.PI - Math.PI/2;
      const labelR = r + sw/2 + 11;
      const lx = (cx + labelR*Math.cos(midAngle)).toFixed(1);
      const ly = (cy + labelR*Math.sin(midAngle)).toFixed(1);
      const txt=document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('class','donut-lbl-txt');
      txt.setAttribute('x',lx);txt.setAttribute('y',ly);
      txt.setAttribute('text-anchor','middle');txt.setAttribute('dominant-baseline','middle');
      txt.setAttribute('font-size','9');txt.setAttribute('fill',seg.col);txt.setAttribute('font-weight','600');
      txt.textContent=`${Math.round(frac*100)}%`;
      scrumSvg.appendChild(txt);
    }
    consumed += frac*circ;
  });
 const atPct=cTerminado?Math.round(atime/cTerminado*100):0;
  setEl('scrum-donut-num',atPct+'%');
}
  // Expiring
  const eb=document.getElementById('scrum-expiring-body');
  if(eb){const exp=d.filter(r=>{const dl=daysLeft(r.limiteQC);return(dl!==null&&dl<=7&&r.statusFinal==='Pendiente')||(r.liberadoATiempo==='Overdue'&&r.statusFinal!=='Terminado');}).sort((a,b)=>(daysLeft(a.limiteQC)||9999)-(daysLeft(b.limiteQC)||9999)).slice(0,8);eb.innerHTML=exp.map(r=>{const dl=daysLeft(r.limiteQC),rowCls=dl<0?'row-danger':dl<=3?'row-warning':'';const dt=dl<0?`<span style="color:var(--danger);font-weight:500">Overdue</span>`:dl<=7?`<span style="color:var(--warning);font-weight:500">${dl}d</span>`:`${dl}d`;return`<tr class="${rowCls}"><td>${r.cod}</td><td>${r.desc}</td><td>${r.lote}</td><td>${r.limiteQC}</td><td>${dt}</td><td>${r.planta}</td><td>${scrumBadge(r.statusFinal)}</td></tr>`;}).join('');}
}

/* ============================================================
   SCRUM — RESULTS
   ============================================================ */
function buildScrumResults() {
  const canCreate=ROLES[currentUser.rol].canCreate;
  return `<div class="filter-bar">
    ${multiFilter('sc-planta','Planta',['Planta 1','Planta 2'])}
    ${multiFilter('sc-div','División',['CH','PH','INY'])}
    ${multiFilter('sc-status','Status',['En análisis','Análisis completo','Liberado'])}
    ${multiFilter('sc-libTiempo','Liberación',[{val:'Cumplió',label:'Cumplió'},{val:'Overdue',label:'Overdue'},{val:'Pendiente',label:'Pendiente'}],true)}
    ${multiFilter('sc-prioridad','Prioridad',[{val:'Sí',label:'Con prioridad'},{val:'No',label:'Sin prioridad'}],true)}
    <input id="sc-search" class="filter-input" placeholder="Buscar código, desc. o lote...">
    <button class="btn btn-ghost btn-sm" id="sc-clear" style="color:var(--danger)">✕ Limpiar</button>
    <div class="filter-actions">
      ${canCreate?'<button class="btn btn-primary" id="sc-btn-new">+ Nuevo lote</button>':''}
      <div class="export-wrap">
        <button class="btn btn-ghost" id="sc-export-toggle">Exportar ▾</button>
        <div class="export-dropdown hidden" id="sc-export-dd">
          <button class="export-opt" id="sc-exp-csv">CSV (.csv)</button>
          <button class="export-opt" id="sc-exp-xlsx">Excel (.xlsx)</button>
        </div>
      </div>
    </div>
  </div>
  <div class="active-filters" id="sc-chips"></div>
  <div class="table-wrap">
    <table id="sc-table" style="font-size:11px">
      <thead><tr>
        <th onclick="scrumSort('cod')">Código<span id="sc-sort-cod"></span></th>
        <th onclick="scrumSort('planta')">Planta<span id="sc-sort-planta"></span></th>
        <th onclick="scrumSort('desc')">Descripción<span id="sc-sort-desc"></span></th>
        <th onclick="scrumSort('lote')">Lote<span id="sc-sort-lote"></span></th>
        <th onclick="scrumSort('identDeposito')">Ident. depósito<span id="sc-sort-identDeposito"></span></th>
        <th onclick="scrumSort('limiteQC')">Límite QC<span id="sc-sort-limiteQC"></span></th>
        <th onclick="scrumSort('ingresoFQ')">Ingreso FQ<span id="sc-sort-ingresoFQ"></span></th>
        <th onclick="scrumSort('status')">Status<span id="sc-sort-status"></span></th>
        <th>Prioridad</th>
        <th onclick="scrumSort('analistFQ')">Analista FQ<span id="sc-sort-analistFQ"></span></th>
        <th onclick="scrumSort('fechaInicioAnalisis')">Inicio análisis<span id="sc-sort-fechaInicioAnalisis"></span></th>
        <th onclick="scrumSort('fechaFinAnalisis')">Fin análisis<span id="sc-sort-fechaFinAnalisis"></span></th>
        <th onclick="scrumSort('statusFinal')">Status final<span id="sc-sort-statusFinal"></span></th>
        <th onclick="scrumSort('liberadoATiempo')">¿A tiempo?<span id="sc-sort-liberadoATiempo"></span></th>
        <th onclick="scrumSort('div')">División<span id="sc-sort-div"></span></th>
        <th></th>
      </tr></thead>
      <tbody id="sc-tbody"></tbody>
    </table>
  </div>
  <div id="sc-no-results" class="no-results hidden">Sin resultados.</div>
  <div class="table-footer" id="sc-footer"></div>`;
}

function bindScrumResults() {
  bindMultiFilterGroup('sc',['planta','div','status','libTiempo','prioridad'],()=>renderScrumTable());
  document.getElementById('sc-search')?.addEventListener('input',()=>renderScrumTable());
  document.getElementById('sc-clear')?.addEventListener('click',()=>{clearMultiFilters('sc',['planta','div','status','libTiempo','prioridad']);document.getElementById('sc-search').value='';renderScrumTable();});
  document.getElementById('sc-btn-new')?.addEventListener('click',()=>navigateTo('form'));
  document.getElementById('sc-export-toggle')?.addEventListener('click',e=>{e.stopPropagation();document.getElementById('sc-export-dd').classList.toggle('hidden');});
  document.getElementById('sc-exp-csv')?.addEventListener('click',()=>{document.getElementById('sc-export-dd').classList.add('hidden');exportScrumCSV();});
  document.getElementById('sc-exp-xlsx')?.addEventListener('click',()=>{document.getElementById('sc-export-dd').classList.add('hidden');exportScrumXLSX();});
  if(scrumKpiFilter){applyScrumKpiFilter(scrumKpiFilter);scrumKpiFilter=null;}
  renderScrumTable();
}

function applyScrumKpiFilter(f) {
  clearMultiFilters('sc',['planta','div','status','libTiempo','prioridad']);
  if(f==='overdue') checkMultiOption('sc-libTiempo','Overdue');
  else if(f==='semana') { /* handled in render */ }
  ['planta','div','status','libTiempo','prioridad'].forEach(k=>updateMultiBtn('sc',k));
  renderScrumChips();
}

function getScrumFiltered() {
  const plantas=getChecked('sc-planta'),divs=getChecked('sc-div'),statuses=getChecked('sc-status'),libV=getChecked('sc-libTiempo'),priorV=getChecked('sc-prioridad');
  const q=(document.getElementById('sc-search')?.value||'').toLowerCase();
  let d=[...SCRUM_RECORDS];
  if(plantas.length)d=d.filter(r=>plantas.includes(r.planta));
  if(divs.length)d=d.filter(r=>divs.includes(r.div));
  if(statuses.length)d=d.filter(r=>statuses.includes(r.status));
  if(libV.length)d=d.filter(r=>libV.includes(r.liberadoATiempo));
  if(priorV.length)d=d.filter(r=>priorV.includes(r.prioridad));
  if(q)d=d.filter(r=>r.cod.toLowerCase().includes(q)||r.desc.toLowerCase().includes(q)||r.lote.toLowerCase().includes(q));
  // KPI semana filter
  if(scrumKpiFilter==='semana')d=d.filter(r=>{const dl=daysLeft(r.limiteQC);return dl!==null&&dl>=0&&dl<=7&&r.statusFinal==='Pendiente';});
  if(scrumKpiFilter==='ingresados'){const today=new Date();d=d.filter(r=>{const dt=parseDate(r.identDeposito);return dt&&(today-dt)<=7*86400000;});}
  return d;
}

function scrumSort(col) {
  if(scrumSortCol===col)scrumSortDir*=-1;else{scrumSortCol=col;scrumSortDir=1;}
  renderScrumTable();
}

function renderScrumTable() {
  renderScrumChips();
  const tbody=document.getElementById('sc-tbody'),noR=document.getElementById('sc-no-results'),footer=document.getElementById('sc-footer');
  let data=getScrumFiltered();
  if(scrumSortCol)data=data.slice().sort((a,b)=>compareVal(a,b,scrumSortCol)*scrumSortDir);
  ['cod','planta','desc','lote','identDeposito','limiteQC','ingresoFQ','status','analistFQ','fechaInicioAnalisis','fechaFinAnalisis','statusFinal','liberadoATiempo','div'].forEach(col=>{
    const el=document.getElementById('sc-sort-'+col);if(el)el.textContent=scrumSortCol===col?(scrumSortDir===1?'↑':'↓'):'';
  });
  if(!tbody)return;
  if(!data.length){tbody.innerHTML='';noR?.classList.remove('hidden');if(footer)footer.textContent='0 registros';return;}
  noR?.classList.add('hidden');if(footer)footer.textContent=`${data.length} registro${data.length!==1?'s':''}`;
  tbody.innerHTML=data.map(r=>{
    const dl=daysLeft(r.limiteQC),rowCls=r.liberadoATiempo==='Overdue'?'row-danger':dl!==null&&dl<=3&&r.statusFinal==='Pendiente'?'row-warning':'';
    return`<tr class="${rowCls}"><td>${r.cod}</td><td>${r.planta}</td><td title="${r.desc}">${r.desc}</td><td>${r.lote}</td><td>${r.identDeposito}</td><td>${r.limiteQC}</td><td>${r.ingresoFQ}</td><td>${r.status}</td><td>${r.prioridad==='Sí'?'<span class="badge badge-oos">Sí</span>':'No'}</td><td>${r.analistFQ}</td><td>${r.fechaInicioAnalisis||'—'}</td><td>${r.fechaFinAnalisis||'—'}</td><td>${scrumBadge(r.statusFinal)}</td><td>${liberadoBadge(r.liberadoATiempo)}</td><td>${r.div}</td><td><button class="link-btn" onclick="showScrumDetail(${r.id})">Ver</button></td></tr>`;
  }).join('');
}

function renderScrumChips() {
  const c=document.getElementById('sc-chips');if(!c)return;
  const labels={planta:'Planta',div:'División',status:'Status',libTiempo:'Liberación',prioridad:'Prioridad'};
  c.innerHTML=['planta','div','status','libTiempo','prioridad'].flatMap(k=>getChecked('sc-'+k).map(vl=>`<div class="filter-chip"><span>${labels[k]}: ${vl}</span><button class="chip-remove" onclick="removeScrumChip('${k}','${vl}')">×</button></div>`)).join('');
}

function removeScrumChip(k,vl){
  const cb=document.querySelector(`#mf-drop-sc-${k} input[value="${vl}"]`);if(cb)cb.checked=false;
  updateMultiBtn('sc',k);renderScrumTable();
}

function exportScrumCSV(){
  const h=['Código','Planta','Descripción','Lote','Ident.Depósito','Límite QC','Ingreso FQ','Status','Prioridad','F.Límite Prioridad','SP Micro CONTH/LAL','SP Micro Esterilidad','Control Higiénico','F.Fin Esterilidad','F.Fin Micro','Analista FQ','F.Inicio Análisis','F.Fin Análisis','Validación SAP','Final QC SAP','Observaciones','Status Final','Liberado a tiempo','Tipo','División'];
  const rows=getScrumFiltered().map(r=>[r.cod,r.planta,r.desc,r.lote,r.identDeposito,r.limiteQC,r.ingresoFQ,r.status,r.prioridad,r.fechaLimPrioridad||'',r.spMicroConthLal||'',r.spMicroEsterilidad||'',r.controlHigienico,r.fechaFinEsterilidad||'',r.fechaFinMicro||'',r.analistFQ,r.fechaInicioAnalisis||'',r.fechaFinAnalisis||'',r.validacionFichaSAP||'',r.finalQCSAP||'',r.obs||'',r.statusFinal,r.liberadoATiempo,r.granelCompControl||'',r.div]);
  csvDownload([h,...rows],'scrum_'+dateStamp());
}

function exportScrumXLSX(){
  if(typeof XLSX==='undefined'){alert('SheetJS no disponible.');return;}
  const h=['Código','Planta','Descripción','Lote','Ident.Depósito','Límite QC','Ingreso FQ','Status','Prioridad','Analista FQ','F.Inicio Análisis','F.Fin Análisis','Validación SAP','Final QC SAP','Observaciones','Status Final','Liberado a tiempo','División'];
  const rows=getScrumFiltered().map(r=>[r.cod,r.planta,r.desc,r.lote,r.identDeposito,r.limiteQC,r.ingresoFQ,r.status,r.prioridad,r.analistFQ,r.fechaInicioAnalisis||'',r.fechaFinAnalisis||'',r.validacionFichaSAP||'',r.finalQCSAP||'',r.obs||'',r.statusFinal,r.liberadoATiempo,r.div]);
  xlsxDownload(h,rows,'SCRUM Lotes','scrum_'+dateStamp());
}

/* ============================================================
   SCRUM — DETAIL
   ============================================================ */
let currentScrumDetailId = null;

function showScrumDetail(id) {
  pendingChanges = {};
  currentScrumDetailId=id; detailEditMode=false;
  currentPage='full'; renderNav(); renderContent();
}

function renderScrumDetail() {
  if(!currentScrumDetailId)return'<div style="padding:40px;text-align:center;color:var(--text3)">Selecciona un lote desde Resultados.</div>';
  const r=SCRUM_RECORDS.find(x=>x.id===currentScrumDetailId);if(!r)return'';
  const e=detailEditMode&&ROLES[currentUser.rol].canEdit;
  const fi=(label,key,type='text',opts=null)=>detailField(r,currentScrumDetailId,label,key,type,opts,e,'scrum');
  const SN=['Sí','No'],LIB=['Cumplió','Overdue','Pendiente'],SF=['Terminado','Pendiente'];
  return`<div class="detail-header">
    <button class="btn btn-ghost btn-sm" onclick="navigateTo('results')">← Volver</button>
    <span class="detail-title">${r.desc} — Lote ${r.lote}</span>
    ${scrumBadge(r.statusFinal)} ${liberadoBadge(r.liberadoATiempo)}
    <span style="margin-left:auto;font-size:11px;color:var(--text3);font-family:var(--font-mono)">${r.cod}·${r.div}</span>
    ${e?`<button class="btn btn-primary btn-sm" id="btn-save-detail" onclick="commitSaveDetail()">Guardar cambios</button>`:''}
  </div>
  ${e?'<div class="detail-edit-notice">Modo edición activo — los cambios guardan al confirmar y se registran en Actividad.</div>':''}
  <div class="detail-grid">
    <div class="card"><div class="card-title">Identificación</div><table class="detail-table"><tbody>
      ${fi('Código','cod')}${fi('Planta','planta','select',['Planta 1','Planta 2'])}${fi('Descripción','desc')}${fi('Lote','lote')}${fi('División','div','select',['PH','CH','INY'])}${fi('Tipo','granelCompControl','select',['Granel','Completo','Control Final'])}${fi('N° Inspección','nInspeccion')}${fi('Prioridad','prioridad','select',SN)}${fi('F. límite prioridad','fechaLimPrioridad','date')}
    </tbody></table></div>
    <div class="card"><div class="card-title">Fechas clave</div><table class="detail-table"><tbody>
      ${fi('Ident. por depósito','identDeposito','date')}${fi('Límite QC time','limiteQC','date')}${fi('Ingreso FQ','ingresoFQ','date')}${fi('SP Micro CONTH/LAL','spMicroConthLal','date')}${fi('SP Micro esterilidad','spMicroEsterilidad','date')}${fi('Control higiénico','controlHigienico','select',SN)}${fi('F. fin esterilidad','fechaFinEsterilidad','date')}${fi('F. fin micro','fechaFinMicro','date')}
    </tbody></table></div>
    <div class="card"><div class="card-title">Análisis FQ</div><table class="detail-table"><tbody>
      ${fi('Analista FQ','analistFQ','select',USERS_LIST.filter(u=>['analyst','supervisor'].includes(u.rol)&&u.estado==='activo').map(u=>u.nombre))}${fi('F. inicio análisis','fechaInicioAnalisis','date')}${fi('F. fin análisis','fechaFinAnalisis','date')}${fi('Validación ficha SAP','validacionFichaSAP','date')}${fi('Final QC - Aprobación SAP','finalQCSAP','date')}
    </tbody></table></div>
    <div class="card"><div class="card-title">Resultado final</div><table class="detail-table"><tbody>
      ${fi('Status','status')}${fi('Status final','statusFinal','select',SF)}${fi('¿Liberado a tiempo?','liberadoATiempo','select',LIB)}${fi('Observaciones','obs','textarea')}
    </tbody></table></div>
    <div class="card" style="grid-column:1/-1"><div class="card-title">Historial de actividad</div>
      ${AUDIT_LOG.filter(a=>a.module==='scrum'&&a.study===currentScrumDetailId).slice(0,6).map(auditRowHtml).join('')||'<p style="font-size:12px;color:var(--text3)">Sin cambios registrados.</p>'}
    </div>
  </div>`;
}

/* ============================================================
   SCRUM — FORM
   ============================================================ */
function buildScrumForm() {
  return`<div class="form-container">
    <div class="form-header">
      <div><h2 class="form-title">Nuevo lote SCRUM</h2><p class="form-subtitle">Los campos <span class="req-star">*</span> son obligatorios</p></div>
      <button class="btn btn-ghost" id="sc-cancel-form">Cancelar</button>
    </div>
    <div class="card form-card">
      <div class="form-section-head">Identificación</div>
      <div class="form-grid">
        <div class="field"><label>Código <span class="req-star">*</span></label><input id="sf-cod" placeholder="Ej: SCR-00111"></div>
        <div class="field"><label>Planta <span class="req-star">*</span></label><select id="sf-planta"><option value="">Seleccionar...</option><option>Planta 1</option><option>Planta 2</option></select></div>
        <div class="field"><label>Descripción <span class="req-star">*</span></label><input id="sf-desc" placeholder="Ej: Amoxicilina 500mg Tab"></div>
        <div class="field"><label>Lote <span class="req-star">*</span></label><input id="sf-lote" placeholder="Ej: L260501"></div>
        <div class="field"><label>División <span class="req-star">*</span></label><select id="sf-div"><option value="">Seleccionar...</option><option>PH</option><option>CH</option><option>INY</option></select></div>
        <div class="field"><label>Tipo</label><select id="sf-tipo"><option>Granel</option><option>Completo</option><option>Control Final</option></select></div>
        <div class="field"><label>N° Inspección</label><input id="sf-ninsp" placeholder="Ej: INS-2026-050"></div>
        <div class="field"><label>Prioridad</label><select id="sf-prior"><option>No</option><option>Sí</option></select></div>
        <div class="field" id="sf-prior-fecha-wrap" style="display:none"><label>F. límite prioridad</label><input type="date" id="sf-prior-fecha"></div>
      </div>
      <div class="form-section-head">Fechas</div>
      <div class="form-grid">
        <div class="field"><label>Ident. por depósito <span class="req-star">*</span></label><input type="date" id="sf-ident"><span class="err-msg hidden" id="err-sf-ident">Obligatorio</span></div>
        <div class="field"><label>Límite QC time <span class="req-star">*</span></label><input type="date" id="sf-limqc"><span class="err-msg hidden" id="err-sf-limqc">Obligatorio</span></div>
        <div class="field"><label>Ingreso FQ</label><input type="date" id="sf-ingfq"></div>
        <div class="field"><label>SP Micro CONTH/LAL</label><input type="date" id="sf-spmicro"></div>
        <div class="field"><label>SP Micro esterilidad</label><input type="date" id="sf-spest"></div>
        <div class="field"><label>Control higiénico</label><select id="sf-ctrlhig"><option>No</option><option>Sí</option></select></div>
      </div>
      <div class="form-section-head">Análisis</div>
      <div class="form-grid">
        <div class="field"><label>Analista FQ</label><select id="sf-anfq"><option value="">Seleccionar...</option>${USERS_LIST.filter(u=>['analyst','supervisor'].includes(u.rol)&&u.estado==='activo').map(u=>`<option>${u.nombre}</option>`).join('')}</select></div>
        <div class="field"><label>F. inicio análisis</label><input type="date" id="sf-finicio"></div>
        <div class="field full-col"><label>Observaciones</label><textarea id="sf-obs"></textarea></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="sc-cancel-form-2">Cancelar</button>
        <button class="btn btn-primary" id="sc-submit">Guardar lote</button>
      </div>
    </div>
  </div>`;
}

function bindScrumForm() {
  document.getElementById('sc-cancel-form')?.addEventListener('click',()=>navigateTo('results'));
  document.getElementById('sc-cancel-form-2')?.addEventListener('click',()=>navigateTo('results'));
  document.getElementById('sc-submit')?.addEventListener('click',submitScrumForm);
  document.getElementById('sf-prior')?.addEventListener('change',function(){document.getElementById('sf-prior-fecha-wrap').style.display=this.value==='Sí'?'':'none';});
}

async function submitScrumForm() {
  const cod=v('sf-cod').trim(),planta=v('sf-planta'),desc=v('sf-desc').trim(),lote=v('sf-lote').trim(),div=v('sf-div');
  const ident=v('sf-ident'),limqc=v('sf-limqc');
  if(!cod||!planta||!desc||!lote||!div){alert('Complete los campos obligatorios.');return;}
  if(!ident){document.getElementById('err-sf-ident').classList.remove('hidden');return;}
  if(!limqc){document.getElementById('err-sf-limqc').classList.remove('hidden');return;}
  const nr={id:SCRUM_RECORDS.length+1,cod,planta,desc,lote,div,nInspeccion:v('sf-ninsp')||'',prioridad:v('sf-prior')||'No',fechaLimPrioridad:fmtDate(v('sf-prior-fecha')),identDeposito:fmtDate(ident),limiteQC:fmtDate(limqc),ingresoFQ:fmtDate(v('sf-ingfq')),spMicroConthLal:fmtDate(v('sf-spmicro'))||'N/A',spMicroEsterilidad:fmtDate(v('sf-spest'))||'N/A',controlHigienico:v('sf-ctrlhig')||'No',fechaFinEsterilidad:'',fechaFinMicro:'',analistFQ:v('sf-anfq')||'',fechaInicioAnalisis:fmtDate(v('sf-finicio')),fechaFinAnalisis:'',validacionFichaSAP:'',finalQCSAP:'',obs:v('sf-obs')||'',status:'En análisis',statusFinal:'Pendiente',liberadoATiempo:'Pendiente',granelCompControl:v('sf-tipo')||'Granel',granel:v('sf-tipo')||'Granel'};
  const saved = await dbInsertScrum(nr);
  if (!saved) { alert('Error al guardar en Supabase.'); return; }
  SCRUM_RECORDS.push(saved);
  const entry = {who:currentUser.nombre,what:`SCRUM: Creó lote ${cod} (${desc}, ${lote}) · ${planta}`,when:nowStr(),field:'creación',old:'',new:cod,study:saved.id,module:'scrum'};
  AUDIT_LOG.unshift(entry);
  await dbInsertAudit(entry);
  alert(`Lote guardado: ${desc} — ${lote}`);
  navigateTo('results');
}

/* ============================================================
   CÓDIGOS — EST y SCRUM
   ============================================================ */
let editingCodigoId = null;
let editingCodigoMod = null;

function buildCodigosPage(mod) {
  const canEdit = ROLES[currentUser.rol].canApprove;
  const isEst = mod === 'est';
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div>
      <h2 style="font-size:16px;font-weight:500;margin-bottom:2px">Códigos de producto — ${isEst?'Estabilidades':'SCRUM'}</h2>
      <p style="font-size:12px;color:var(--text3)">Referencia de productos · Solo supervisores y admin pueden editar</p>
    </div>
    ${canEdit?'<button class="btn btn-primary" id="btn-new-codigo">+ Nuevo código</button>':''}
  </div>

  <div class="card" id="codigo-form-card" style="display:none;margin-bottom:16px">
    <div style="font-size:11px;font-weight:500;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px;font-family:var(--font-mono)"><span id="codigo-form-title">Nuevo código</span></div>
    <div class="form-grid">
      <div class="field"><label>Código <span class="req-star">*</span></label><input id="cf-codigo" placeholder="Ej: PRD-00421"></div>
      <div class="field"><label>Producto <span class="req-star">*</span></label><input id="cf-producto" placeholder="Nombre del producto"></div>
      <div class="field"><label>Proveedor</label><input id="cf-proveedor"></div>
      <div class="field"><label>Familia producto 1</label><input id="cf-familia1"></div>
      <div class="field"><label>Familia producto 2</label><input id="cf-familia2"></div>
      <div class="field"><label>División</label><select id="cf-division"><option value="">Seleccionar...</option><option>PH</option><option>CH</option></select></div>
      ${isEst?`
      <div class="field"><label>Condición</label><input id="cf-condicion" placeholder="Ej: 25°C / 60% HR"></div>
      <div class="field"><label>Válido (meses)</label><input id="cf-valido" type="number" min="0" placeholder="Ej: 3"></div>
      `:`
      <div class="field"><label>Lead time</label><input id="cf-leadtime" placeholder="Ej: 30 días"></div>
      <div class="field"><label>Subdivisión</label><input id="cf-subdivision" placeholder="Ej: Hormonales"></div>
      `}
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
      <button class="btn btn-ghost" id="btn-cancel-codigo">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-codigo">Guardar</button>
    </div>
  </div>

  <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center">
    <input class="filter-input" id="cod-search" placeholder="Buscar código o producto..." style="width:240px">
    ${multiFilter('cf-div','División',['PH','CH'])}
    ${isEst?multiFilter('cf-activo','Estado',[{val:'true',label:'Activo'},{val:'false',label:'Inactivo'}],true):''}
    <button class="btn btn-ghost btn-sm" id="cod-clear" style="color:var(--danger)">✕ Limpiar</button>
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Código</th>
        <th>Producto</th>
        <th>Proveedor</th>
        <th>Familia 1</th>
        <th>Familia 2</th>
        <th>División</th>
        ${isEst?'<th>Condición</th><th>Válido (m)</th>':'<th>Lead time</th><th>Subdivisión</th>'}
        <th>Estado</th>
        ${canEdit?'<th>Acciones</th>':''}
      </tr></thead>
      <tbody id="codigos-tbody"></tbody>
    </table>
  </div>
  <div class="table-footer" id="codigos-footer"></div>`;
}

function bindCodigosPage(mod) {
  const canEdit = ROLES[currentUser.rol].canApprove;
  renderCodigosTable(mod);

  document.getElementById('cod-search')?.addEventListener('input', ()=>renderCodigosTable(mod));
  document.getElementById('cod-clear')?.addEventListener('click', ()=>{
    document.getElementById('cod-search').value='';
    clearMultiFilters('cf',['div','activo']);
    renderCodigosTable(mod);
  });
  bindMultiFilterGroup('cf',['div','activo'],()=>renderCodigosTable(mod));

  if(!canEdit) return;

  document.getElementById('btn-new-codigo')?.addEventListener('click',()=>{
    editingCodigoId=null; editingCodigoMod=mod;
    setEl('codigo-form-title','Nuevo código');
    ['cf-codigo','cf-producto','cf-proveedor','cf-familia1','cf-familia2','cf-condicion','cf-valido','cf-leadtime','cf-subdivision'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const div=document.getElementById('cf-division');if(div)div.value='';
    document.getElementById('codigo-form-card').style.display='';
  });

  document.getElementById('btn-cancel-codigo')?.addEventListener('click',()=>{
    document.getElementById('codigo-form-card').style.display='none';
    editingCodigoId=null;
  });

  document.getElementById('btn-save-codigo')?.addEventListener('click',()=>saveCodigo(mod));
}

function getCodigosFiltered(mod) {
  const src = mod==='est' ? CODIGOS_EST : CODIGOS_SCRUM;
  const q = (document.getElementById('cod-search')?.value||'').toLowerCase();
  const divs = getChecked('cf-div');
  const activoV = getChecked('cf-activo');
  let data = [...src];
  if(q) data = data.filter(c=>c.codigo.toLowerCase().includes(q)||c.producto.toLowerCase().includes(q));
  if(divs.length) data = data.filter(c=>divs.includes(c.division));
  if(activoV.length) data = data.filter(c=>activoV.includes(String(c.activo)));
  return data;
}

function renderCodigosTable(mod) {
  const canEdit = ROLES[currentUser.rol].canApprove;
  const isEst = mod==='est';
  const data = getCodigosFiltered(mod);
  const tbody = document.getElementById('codigos-tbody');
  const footer = document.getElementById('codigos-footer');
  if(!tbody) return;
  if(footer) footer.textContent = ${data.length} registro${data.length!==1?'s':''};
  tbody.innerHTML = data.map(c=>`
    <tr style="${c.activo===false?'opacity:.5':''}">
      <td style="font-family:var(--font-mono);font-size:11px">${c.codigo}</td>
      <td>${c.producto}</td>
      <td>${c.proveedor||'—'}</td>
      <td>${c.familia1||'—'}</td>
      <td>${c.familia2||'—'}</td>
      <td>${c.division||'—'}</td>
      ${isEst?<td>${c.condicion||'—'}</td><td>${c.valido??'—'}</td>:<td>${c.lead_time||'—'}</td><td>${c.subdivision||'—'}</td>}
      <td><span style="font-size:10px;font-weight:500;padding:2px 8px;border-radius:20px;background:${c.activo!==false?'var(--success-light)':'var(--surface2)'};color:${c.activo!==false?'var(--success-text)':'var(--text3)'}">${c.activo!==false?'Activo':'Inactivo'}</span></td>
      ${canEdit?`<td><div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-ghost" onclick="editCodigo(${c.id},'${mod}')">Editar</button>
        <button class="btn btn-sm btn-ghost" style="color:${c.activo!==false?'var(--danger)':'var(--success)'}" onclick="toggleCodigoActivo(${c.id},'${mod}')">${c.activo!==false?'Desactivar':'Activar'}</button>
      </div></td>`:''}
    </tr>
  `).join('');
}

function editCodigo(id, mod) {
  const src = mod==='est' ? CODIGOS_EST : CODIGOS_SCRUM;
  const c = src.find(x=>x.id===id); if(!c) return;
  editingCodigoId=id; editingCodigoMod=mod;
  setEl('codigo-form-title','Editar código');
  const set=(eid,val)=>{const el=document.getElementById(eid);if(el)el.value=val||'';};
  set('cf-codigo',c.codigo); set('cf-producto',c.producto); set('cf-proveedor',c.proveedor);
  set('cf-familia1',c.familia1); set('cf-familia2',c.familia2); set('cf-division',c.division);
  if(mod==='est'){set('cf-condicion',c.condicion);set('cf-valido',c.valido);}
  else{set('cf-leadtime',c.lead_time);set('cf-subdivision',c.subdivision);}
  document.getElementById('codigo-form-card').style.display='';
}

async function saveCodigo(mod) {
  const codigo=v('cf-codigo').trim(), producto=v('cf-producto').trim();
  if(!codigo||!producto){alert('Código y producto son obligatorios.');return;}
  const isEst=mod==='est';
  const fields={
    codigo, producto,
    proveedor:v('cf-proveedor')||null,
    familia1:v('cf-familia1')||null,
    familia2:v('cf-familia2')||null,
    division:v('cf-division')||null,
    activo:true,
    ...(isEst?{condicion:v('cf-condicion')||null, valido:v('cf-valido')?Number(v('cf-valido')):null}
            :{lead_time:v('cf-leadtime')||null, subdivision:v('cf-subdivision')||null})
  };
  if(editingCodigoId){
    if(isEst){ await dbUpdateCodigoEst(editingCodigoId,fields); const i=CODIGOS_EST.findIndex(x=>x.id===editingCodigoId); if(i>=0)CODIGOS_EST[i]={...CODIGOS_EST[i],...fields}; }
    else{ await dbUpdateCodigoScrum(editingCodigoId,fields); const i=CODIGOS_SCRUM.findIndex(x=>x.id===editingCodigoId); if(i>=0)CODIGOS_SCRUM[i]={...CODIGOS_SCRUM[i],...fields}; }
  } else {
    if(isEst){ const saved=await dbInsertCodigoEst(fields); if(saved)CODIGOS_EST.push(saved); }
    else{ const saved=await dbInsertCodigoScrum(fields); if(saved)CODIGOS_SCRUM.push(saved); }
  }
  document.getElementById('codigo-form-card').style.display='none';
  editingCodigoId=null;
  renderCodigosTable(mod);
}

async function toggleCodigoActivo(id, mod) {
  const src = mod==='est' ? CODIGOS_EST : CODIGOS_SCRUM;
  const c = src.find(x=>x.id===id); if(!c) return;
  const newActivo = c.activo===false ? true : false;
  if(mod==='est') await dbUpdateCodigoEst(id,{activo:newActivo});
  else await dbUpdateCodigoScrum(id,{activo:newActivo});
  c.activo=newActivo;
  renderCodigosTable(mod);
}

/* ============================================================
   AUDIT PAGE (shared)
   ============================================================ */
function buildAuditPage(mod) {
  return`<div class="filter-bar">
    <input class="filter-input" id="audit-search" placeholder="Buscar usuario o acción..." style="width:240px">
    <select class="filter-select" id="audit-filter-mod">
      <option value="">Todos los módulos</option>
      <option value="est">Estabilidades</option>
      <option value="scrum">SCRUM</option>
      <option value="sys">Sistema</option>
    </select>
    <button class="btn btn-ghost" id="btn-export-audit-csv">Exportar CSV</button>
  </div>
  <div class="card">
    <div class="card-title">Registro de actividad — inmutable (GxP)</div>
    <div id="audit-list"></div>
  </div>`;
}

function bindAuditPage() {
  renderAuditList();
  document.getElementById('audit-search')?.addEventListener('input',renderAuditList);
  document.getElementById('audit-filter-mod')?.addEventListener('change',renderAuditList);
  document.getElementById('btn-export-audit-csv')?.addEventListener('click',exportAuditCSV);
}

function renderAuditList() {
  const q=(document.getElementById('audit-search')?.value||'').toLowerCase();
  const mod=document.getElementById('audit-filter-mod')?.value||'';
  let logs=[...AUDIT_LOG];
  if(mod)logs=logs.filter(a=>a.module===mod);
  if(q)logs=logs.filter(a=>a.who.toLowerCase().includes(q)||a.what.toLowerCase().includes(q));
  const el=document.getElementById('audit-list');
  if(el)el.innerHTML=logs.map(auditRowHtml).join('')||'<p style="font-size:12px;color:var(--text3);padding:12px">Sin registros.</p>';
}

function exportAuditCSV(){
  const h=['Usuario','Módulo','Acción','Campo','Valor anterior','Valor nuevo','Fecha y hora'];
  const rows=AUDIT_LOG.map(a=>[a.who,a.module||'',a.what,a.field||'',a.old||'',a.new||'',a.when]);
  csvDownload([h,...rows],'actividad_'+dateStamp());
}

/* ============================================================
   USERS PAGE (Admin only)
   ============================================================ */
function buildUsersPage() {
  return`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div><h2 style="font-size:16px;font-weight:500;margin-bottom:2px">Gestión de usuarios</h2><p style="font-size:12px;color:var(--text3)">Acceso compartido entre módulos · Solo administradores</p></div>
    <button class="btn btn-primary" id="btn-new-user">+ Nuevo usuario</button>
  </div>
  <div class="card" id="user-form-card" style="display:none;margin-bottom:16px">
    <div style="font-size:11px;font-weight:500;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px;font-family:var(--font-mono)"><span id="user-form-title">Nuevo usuario</span></div>
    <div class="form-grid">
      <div class="field"><label>Nombre <span class="req-star">*</span></label><input id="uf-nombre" placeholder="Juan Fernández"></div>
      <div class="field"><label>Usuario <span class="req-star">*</span></label><input id="uf-usuario" placeholder="jfernandez"></div>
      <div class="field"><label>Email <span class="req-star">*</span></label><input id="uf-email" type="email" placeholder="jfernandez@lab.com"></div>
      <div class="field"><label>Rol <span class="req-star">*</span></label>
        <select id="uf-rol"><option value="">Seleccionar...</option><option value="viewer">Viewer — solo lectura</option><option value="analyst">Analista — carga y edición</option><option value="supervisor">Supervisor — aprobación</option><option value="admin">Admin — acceso total</option></select>
      </div>
      <div class="field"><label>Planta habilitada</label><select id="uf-planta"><option value="todas">Todas las plantas</option><option value="Planta 1">Planta 1</option><option value="Planta 2">Planta 2</option></select></div>
      <div class="field"><label>Estado</label><select id="uf-estado"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
      <button class="btn btn-ghost" id="btn-cancel-user">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-user">Guardar</button>
    </div>
  </div>
  <div class="table-wrap"><table id="users-table">
    <thead><tr><th>Nombre</th><th>Usuario</th><th>Email</th><th>Rol</th><th>Planta</th><th>Estado</th><th>Último acceso</th><th>Acciones</th></tr></thead>
    <tbody id="users-tbody"></tbody>
  </table></div>
  <div class="card" style="margin-top:16px"><div class="card-title">Matriz de permisos por rol</div>
    <div style="overflow-x:auto"><table style="font-size:12px;width:100%">
      <thead><tr><th style="text-align:left;padding:8px 12px">Acción</th><th style="text-align:center;padding:8px 12px">Viewer</th><th style="text-align:center;padding:8px 12px">Analista</th><th style="text-align:center;padding:8px 12px">Supervisor</th><th style="text-align:center;padding:8px 12px">Admin</th></tr></thead>
      <tbody id="perms-tbody"></tbody>
    </table></div>
  </div>`;
}

function bindUsersPage() {
  renderUsersTable(); renderPermMatrix();
  document.getElementById('btn-new-user')?.addEventListener('click',()=>{editingUserId=null;setEl('user-form-title','Nuevo usuario');['uf-nombre','uf-usuario','uf-email'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById('uf-rol').value='';document.getElementById('uf-planta').value='todas';document.getElementById('uf-estado').value='activo';document.getElementById('user-form-card').style.display='';});
  document.getElementById('btn-cancel-user')?.addEventListener('click',()=>{document.getElementById('user-form-card').style.display='none';editingUserId=null;});
  document.getElementById('btn-save-user')?.addEventListener('click',saveUser);
}

function renderUsersTable() {
  const tbody=document.getElementById('users-tbody');if(!tbody)return;
  const RC={'viewer':'#888780','analyst':'#185FA5','supervisor':'#854F0B','admin':'#3B6D11'};
  tbody.innerHTML=USERS_LIST.map(u=>{
    const r=ROLES[u.rol]||{},isMe=u.id===currentUser.id,col=RC[u.rol]||'#888';
    return`<tr style="${isMe?'background:var(--accent-light)':''}">
      <td><div style="display:flex;align-items:center;gap:8px"><div style="width:26px;height:26px;border-radius:50%;background:${col}22;color:${col};font-size:10px;font-weight:500;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono)">${u.initials}</div>${u.nombre}${isMe?'<span style="font-size:10px;color:var(--accent);font-family:var(--font-mono)">(tú)</span>':''}</div></td>
      <td style="font-family:var(--font-mono);font-size:11px">${u.usuario}</td>
      <td style="font-size:11px;color:var(--text2)">${u.email}</td>
      <td><span style="background:${col}22;color:${col};padding:2px 8px;border-radius:20px;font-size:10px;font-weight:500;font-family:var(--font-mono)">${r.label||u.rol}</span></td>
      <td>${u.planta==='todas'?'Todas':u.planta}</td>
      <td><span style="font-size:10px;font-weight:500;padding:2px 8px;border-radius:20px;background:${u.estado==='activo'?'var(--success-light)':'var(--surface2)'};color:${u.estado==='activo'?'var(--success-text)':'var(--text3)'}">${u.estado==='activo'?'Activo':'Inactivo'}</span></td>
      <td style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">${u.lastLogin}</td>
      <td><div style="display:flex;gap:6px"><button class="btn btn-sm btn-ghost" onclick="editUser(${u.id})">Editar</button><button class="btn btn-sm btn-ghost" style="color:${u.estado==='activo'?'var(--danger)':'var(--success)'}" onclick="toggleUserStatus(${u.id})">${u.estado==='activo'?'Desactivar':'Activar'}</button></div></td>
    </tr>`;
  }).join('');
}

function renderPermMatrix() {
  const tbody=document.getElementById('perms-tbody');if(!tbody)return;
  const ck='<span style="color:var(--success);font-size:14px">✓</span>',cr='<span style="color:var(--text3)">—</span>';
  tbody.innerHTML=PERMISSIONS_MATRIX.map((p,i)=>`<tr style="${i%2===0?'background:var(--surface2)':''}"><td style="padding:7px 12px;color:var(--text2)">${p.action}</td><td style="text-align:center;padding:7px 12px">${p.viewer?ck:cr}</td><td style="text-align:center;padding:7px 12px">${p.analyst?ck:cr}</td><td style="text-align:center;padding:7px 12px">${p.supervisor?ck:cr}</td><td style="text-align:center;padding:7px 12px">${p.admin?ck:cr}</td></tr>`).join('');
}

async function saveUser() {
  const nombre=v('uf-nombre').trim(),usuario=v('uf-usuario').trim(),email=v('uf-email').trim(),rol=v('uf-rol');
  if(!nombre||!usuario||!email||!rol){alert('Complete todos los campos obligatorios.');return;}
  if(editingUserId){
    const u=USERS_LIST.find(x=>x.id===editingUserId);
    if(u){
      const oldRol=u.rol;
      Object.assign(u,{nombre,usuario,email,rol,planta:v('uf-planta')||'todas',estado:v('uf-estado')||'activo'});
      const {error} = await sb.from('users_list').update({nombre,usuario,email,rol,planta:u.planta,estado:u.estado}).eq('id',editingUserId);
      if(error){console.error(error);alert('Error al guardar en Supabase.');return;}
      const entry={who:currentUser.nombre,what:`Editó usuario ${usuario}: rol "${oldRol}" → "${rol}",when:nowStr()`,field:'usuario',old:oldRol,new:rol,study:null,module:'sys'};
      AUDIT_LOG.unshift(entry);
      await dbInsertAudit(entry);
    }
  } else {
    const initials=nombre.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
    const newU={nombre,usuario,email,rol,planta:v('uf-planta')||'todas',estado:v('uf-estado')||'activo',last_login:'Nunca',initials:initials};
    const {data,error} = await sb.from('users_list').insert(newU).select().single();
    if(error){console.error(error);alert('Error al guardar en Supabase.');return;}
    USERS_LIST.push({...data, lastLogin: data.last_login});
    const entry={who:currentUser.nombre,what:`Creó usuario ${usuario} con rol ${rol}`,when:nowStr(),field:'usuario',old:'',new:usuario,study:null,module:'sys'};
    AUDIT_LOG.unshift(entry);
    await dbInsertAudit(entry);
  }
  document.getElementById('user-form-card').style.display='none';
  editingUserId=null;
  renderUsersTable();
  renderUserListDropdown();
}

function editUser(id){
  const u=USERS_LIST.find(x=>x.id===id);if(!u)return;editingUserId=id;setEl('user-form-title','Editar usuario');
  document.getElementById('uf-nombre').value=u.nombre;document.getElementById('uf-usuario').value=u.usuario;document.getElementById('uf-email').value=u.email;document.getElementById('uf-rol').value=u.rol;document.getElementById('uf-planta').value=u.planta;document.getElementById('uf-estado').value=u.estado;
  document.getElementById('user-form-card').style.display='';
}

async function toggleUserStatus(id){
  const u=USERS_LIST.find(x=>x.id===id);if(!u)return;
  if(u.id===currentUser.id){alert('No podés desactivar tu propio usuario.');return;}
  const old=u.estado;
  u.estado=u.estado==='activo'?'inactivo':'activo';
  const {error} = await sb.from('users_list').update({estado:u.estado}).eq('id',id);
  if(error){console.error(error);u.estado=old;alert('Error al guardar.');return;}
  const entry={who:currentUser.nombre,what:`${u.estado==='activo'?'Activó':'Desactivó'} usuario ${u.usuario}`,when:nowStr(),field:'estado',old,new:u.estado,study:null,module:'sys'};
  AUDIT_LOG.unshift(entry);
  await dbInsertAudit(entry);
  renderUsersTable();
  renderUserListDropdown();
}

/* ============================================================
   SHARED: saveField (edición inline en detalle)
   ============================================================ */
function saveField(mod, id, key, newVal) {
  const src = mod==='est' ? STUDIES : SCRUM_RECORDS;
  const rec = src.find(x=>x.id===id); if(!rec) return;
  const oldVal = rec[key]; if(String(oldVal)===String(newVal)) return;
  if(!pendingChanges[id]) pendingChanges[id] = {mod, rec, changes:{}};
  // Si el nuevo valor es igual al original guardado, eliminar el cambio
  const original = pendingChanges[id].changes[key]?.oldVal;
  if(original !== undefined && String(original)===String(newVal)) {
    delete pendingChanges[id].changes[key];
    if(!Object.keys(pendingChanges[id].changes).length) delete pendingChanges[id];
  } else {
    const baseOld = pendingChanges[id].changes[key]?.oldVal ?? oldVal;
    pendingChanges[id].changes[key] = {oldVal: baseOld, newVal};
  }
  rec[key] = newVal;
  // Actualizar botón
  const btn = document.getElementById('btn-save-detail');
  const hayPendientes = Object.keys(pendingChanges).length > 0;
  if(btn) {
    if(hayPendientes) { btn.textContent='● Guardar cambios'; btn.style.background='var(--warning)'; btn.style.borderColor='var(--warning)'; }
    else { btn.textContent='Guardar cambios'; btn.style.background=''; btn.style.borderColor=''; }
  }
}

async function commitSaveDetail() {
  const btn = document.getElementById('btn-save-detail');
  if(!Object.keys(pendingChanges).length) { 
    if(btn){btn.textContent='✓ Sin cambios';setTimeout(()=>{btn.textContent='Guardar cambios';btn.style.background='';btn.style.borderColor='';},1500);} 
    return; 
  }
  if(btn){btn.textContent='Guardando...';btn.disabled=true;}
  for(const id of Object.keys(pendingChanges)) {
    const {mod, rec, changes} = pendingChanges[id];
    if(mod==='est') await dbUpdateStudy(Number(id), rec);
    else await dbUpdateScrum(Number(id), rec);
    for(const [key, {oldVal, newVal}] of Object.entries(changes)) {
      const entry={who:currentUser.nombre,what:`Editó "${key}" en ${rec.prod||rec.desc||''} (${rec.lote}): "${oldVal||'—'}" → "${newVal||'—'}"`,when:nowStr(),field:key,old:String(oldVal||''),new:String(newVal||''),study:Number(id),module:mod};
      AUDIT_LOG.unshift(entry);
      await dbInsertAudit(entry);
    }
  }
  pendingChanges = {};
  if(btn){btn.textContent='✓ Guardado';btn.style.background='var(--success)';btn.style.borderColor='var(--success)';btn.disabled=false;setTimeout(()=>{btn.textContent='Guardar cambios';btn.style.background='';btn.style.borderColor='';},2000);}
}

/* ============================================================
   SHARED: detailField helper
   ============================================================ */
function detailField(rec, id, label, key, type, opts, editable, mod) {
  const val = rec[key]!==undefined?rec[key]:'';
  if(!editable) return`<tr><td>${label}</td><td>${val||'—'}</td></tr>`;
  if(type==='select'&&opts){const os=opts.map(o=>`<option ${o===val?'selected':''}>${o}</option>`).join('');return`<tr><td>${label}</td><td><select class="detail-inline-select" onchange="saveField('${mod}',${id},'${key}',this.value)">${os}</select></td></tr>`;}
  if(type==='date'){const iso=val?val.split('/').reverse().join('-'):'';return`<tr><td>${label}</td><td><input type="date" class="detail-inline-input" value="${iso}" onchange="saveField('${mod}',${id},'${key}',fmtDate(this.value))"></td></tr>`;}
  if(type==='textarea')return`<tr><td>${label}</td><td><textarea class="detail-inline-textarea" onblur="saveField('${mod}',${id},'${key}',this.value)">${val||''}</textarea></td></tr>`;
  return`<tr><td>${label}</td><td><input type="text" class="detail-inline-input" value="${val||''}" onblur="saveField('${mod}',${id},'${key}',this.value)"></td></tr>`;
}

/* ============================================================
   MULTI-FILTER UTILITIES
   ============================================================ */
function multiFilter(id, label, opts, isKV=false) {
  const options = isKV
    ? opts.map(o=>typeof o==='object'?`<label class="mf-option"><input type="checkbox" value="${o.val}"> ${o.label}</label>`:`<label class="mf-option"><input type="checkbox" value="${o}"> ${o}</label>`).join('')
    : opts.map(o=>`<label class="mf-option"><input type="checkbox" value="${o}"> ${o}</label>`).join('');
  return`<div class="multi-filter-wrap">
    <button class="multi-filter-btn" id="mf-btn-${id}" onclick="toggleMultiFilter('${id}')">${label} <span class="mf-count hidden" id="mf-count-${id}"></span>▾</button>
    <div class="multi-filter-dropdown hidden" id="mf-drop-${id}">${options}</div>
  </div>`;
}

function toggleMultiFilter(id) {
  const drop=document.getElementById('mf-drop-'+id);if(!drop)return;
  const isOpen=!drop.classList.contains('hidden');
  document.querySelectorAll('.multi-filter-dropdown').forEach(d=>d.classList.add('hidden'));
  if(!isOpen)drop.classList.remove('hidden');
}

function bindMultiFilterGroup(prefix, keys, onChange) {
  keys.forEach(key=>{
    const drop=document.getElementById(`mf-drop-${prefix}-${key}`);
    drop?.querySelectorAll('input').forEach(cb=>cb.addEventListener('change',()=>{updateMultiBtn(prefix,key);onChange();}));
  });
}

function getChecked(dropId) {
  return[...(document.getElementById('mf-drop-'+dropId)?.querySelectorAll('input:checked')||[])].map(c=>c.value);
}

function updateMultiBtn(prefix, key) {
  const vals=getChecked(`${prefix}-${key}`),btn=document.getElementById(`mf-btn-${prefix}-${key}`),cnt=document.getElementById(`mf-count-${prefix}-${key}`);
  if(!btn||!cnt)return;
  if(vals.length){btn.classList.add('has-selection');cnt.textContent=vals.length;cnt.classList.remove('hidden');}
  else{btn.classList.remove('has-selection');cnt.classList.add('hidden');}
}

function clearMultiFilters(prefix, keys) {
  keys.forEach(key=>{
    document.getElementById(`mf-drop-${prefix}-${key}`)?.querySelectorAll('input').forEach(cb=>cb.checked=false);
    updateMultiBtn(prefix,key);
  });
}

/* ============================================================
   EXPORT UTILITIES
   ============================================================ */
function csvDownload(rows, filename) {
  const csv=rows.map(r=>r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  triggerDownload(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}),filename+'.csv');
}

function xlsxDownload(headers, rows, sheetName, filename) {
  const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
  ws['!cols']=headers.map((h,i)=>({wch:Math.min(Math.max(h.length,...rows.map(r=>String(r[i]||'').length))+2,40)}));
  const H='1F5FA5';
  headers.forEach((_,i)=>{const ref=XLSX.utils.encode_cell({r:0,c:i});if(ws[ref])ws[ref].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:H}},alignment:{horizontal:'center'}};});
  rows.forEach((row,ri)=>{row.forEach((_,ci)=>{const ref=XLSX.utils.encode_cell({r:ri+1,c:ci});if(ws[ref])ws[ref].s={fill:{fgColor:{rgb:ri%2===0?'F5F4F0':'FFFFFF'}},font:{sz:10},border:{top:{style:'thin',color:{rgb:'E2E0D8'}},bottom:{style:'thin',color:{rgb:'E2E0D8'}},left:{style:'thin',color:{rgb:'E2E0D8'}},right:{style:'thin',color:{rgb:'E2E0D8'}}}};});});
  const entry = {
  who: currentUser.nombre,
  what: (u.estado === 'activo' ? 'Activó' : 'Desactivó') + ' usuario ' + u.usuario,
  when: nowStr(),
  field: 'estado',
  old: old,
  new: u.estado,
  study: null,
  module: 'sys'
};
  XLSX.writeFile(wb,filename+'.xlsx');
}

function triggerDownload(blob, filename) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}

/* ============================================================
   AUDIT ROW HTML
   ============================================================ */
function auditRowHtml(a) {
  const modLabel={est:'Estab.',scrum:'SCRUM',sys:'Sistema'}[a.module]||'';
  return`<div class="audit-row"><div class="audit-who">${a.who}</div><div class="audit-what">${modLabel?`<span class="audit-mod-badge audit-mod-${a.module}">${modLabel}</span> `:''}${a.what}</div><div class="audit-when">${a.when}</div></div>`;
}

/* ============================================================
   DATE UTILS
   ============================================================ */
function parseDate(s){if(!s||s==='N/A'||s==='—')return null;const p=s.split('/');if(p.length===3)return new Date(+p[2],+p[1]-1,+p[0]);return new Date(s);}
function daysLeft(d){const dt=parseDate(d);if(!dt)return null;return Math.round((dt-new Date())/86400000);}
function isExpired(s){const dl=daysLeft(s.limite);return dl!==null&&dl<0&&s.estado!=='Completo'&&s.estado!=='Cancelado';}
function isExpiringSoon(s,days=30){const dl=daysLeft(s.limite);return dl!==null&&dl>=0&&dl<=days&&s.estado!=='Completo'&&s.estado!=='Cancelado';}

/* ============================================================
   BADGE HELPERS
   ============================================================ */
function estBadge(estado){const m={'Pendiente':'badge-pendiente','En proceso':'badge-proceso','Completo':'badge-completo','Cancelado':'badge-cancelado'};return`<span class="badge ${m[estado]||''}">${estado}</span>`;}
function scrumBadge(sf){const m={'Terminado':'badge-completo','Pendiente':'badge-pendiente'};return`<span class="badge ${m[sf]||''}">${sf}</span>`;}
function liberadoBadge(v){if(v==='Cumplió')return`<span class="badge badge-completo">Cumplió</span>`;if(v==='Overdue')return`<span class="badge badge-oos">Overdue</span>`;return`<span class="badge badge-pendiente">Pendiente</span>`;}

/* ============================================================
   MISC UTILS
   ============================================================ */
function setEl(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function v(id){return document.getElementById(id)?.value||'';}
function fmtDate(val){if(!val)return'';const[y,m,d]=val.split('-');return`${d}/${m}/${y}`;}
function nowStr(){const n=new Date();return`${pad(n.getDate())}/${pad(n.getMonth()+1)}/${n.getFullYear()} ${pad(n.getHours())}:${pad(n.getMinutes())}`;}
function dateStamp(){const n=new Date();return`${n.getFullYear()}${pad(n.getMonth()+1)}${pad(n.getDate())}`;}
function pad(v){return String(v).padStart(2,'0');}
function compareVal(a,b,col){const av=String(a[col]||''),bv=String(b[col]||'');const ad=parseDate(av),bd=parseDate(bv);if(ad&&bd)return ad-bd;return av.localeCompare(bv,undefined,{numeric:true});}
