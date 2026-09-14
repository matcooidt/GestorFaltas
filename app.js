/* =======================================================
   SISTEMA DE AUTENTICACIÓN (Mockup)
   ======================================================= */
const ADMIN_PIN = "13211300";
let isLoginMode = true;
let currentUser = null; // Guardará el nombre del usuario logeado

const authScreen = document.getElementById("authScreen");
const appContainer = document.querySelector(".app");
const authForm = document.getElementById("authForm");
const toggleAuth = document.getElementById("toggleAuth");
const authTitle = document.getElementById("authTitle");
const authBtn = document.getElementById("authBtn");
const pinField = document.getElementById("pinField");
const authPin = document.getElementById("authPin");

// Alternar entre Login y Registro
toggleAuth.addEventListener("click", (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  
  if (isLoginMode) {
    authTitle.textContent = "Iniciar Sesión";
    authBtn.textContent = "Entrar";
    toggleAuth.textContent = "¿No tienes cuenta? Regístrate";
    pinField.style.display = "none";
    authPin.removeAttribute("required");
  } else {
    authTitle.textContent = "Crear Cuenta";
    authBtn.textContent = "Registrarse";
    toggleAuth.textContent = "¿Ya tienes cuenta? Inicia sesión";
    pinField.style.display = "block";
    authPin.setAttribute("required", "true");
  }
});

authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const user = document.getElementById("authUser").value.trim();
  const pass = document.getElementById("authPass").value.trim();
  const pin = authPin.value.trim();

  if (!isLoginMode) {
    // Modo Registro
    if (pin !== ADMIN_PIN) {
      alert("PIN de administrador incorrecto. No puedes registrarte.");
      return;
    }
    
    // Aquí registrarías al usuario en tu base de datos
    // Por ahora, simulamos que se ha registrado y logeado
    iniciarSesionApp(user);
    alert(`Cuenta creada con éxito. ¡Bienvenido ${user}!`);
    
  } else {
    // Modo Login
    // Aquí comprobarías el usuario y contraseña contra tu base de datos
    // Por ahora, dejamos que entre cualquier usuario para probar la UI
    if (user === "" || pass === "") {
      alert("Rellena los campos.");
      return;
    }
    iniciarSesionApp(user);
  }
});

function iniciarSesionApp(username) {
  currentUser = username;
  authScreen.classList.add("hidden");
  appContainer.classList.add("visible");
  
  // Modificamos el nombre en el menú lateral para que sea dinámico
  const brandSmall = document.querySelector(".brand small");
  if(brandSmall) brandSmall.textContent = `Usuario: ${username}`;
  
  // Aquí es donde, en el futuro, cargarías los "records" desde la base de datos 
  // usando el "currentUser" en lugar de cargarlos desde localStorage.
}
/* =======================================================
   DATOS BASE — extraídos de "Distribución Horaria del Curso.xlsx"
   ======================================================= */
const SUBJECTS = [
  { id: "dwec", name: "Desarrollo web en entorno cliente", totalHours: 200, weeklyHours: 6, allowedHours: 30 },
  { id: "dwes", name: "Desarrollo web en entorno servidor", totalHours: 200, weeklyHours: 6, allowedHours: 30 },
  { id: "diw",  name: "Diseño de interfaces web", totalHours: 133, weeklyHours: 4, allowedHours: 19 },
  { id: "daw",  name: "Despliegue de aplicaciones web", totalHours: 100, weeklyHours: 3, allowedHours: 15 },
  { id: "pidaw",name: "Proyecto intermodular de desarrollo de aplicaciones web", totalHours: 100, weeklyHours: 3, allowedHours: 15 },
  { id: "nube", name: "Nube", totalHours: 100, weeklyHours: 3, allowedHours: 15 },
  { id: "dasp", name: "Digitalización aplicada al sistema productivo", totalHours: 34, weeklyHours: 1, allowedHours: 5 },
  { id: "sasp", name: "Sostenibilidad aplicada al sistema productivo", totalHours: 34, weeklyHours: 1, allowedHours: 5 },
];

const STORAGE_KEY = "asistencia_faltas_v1";
const THEME_KEY = "asistencia_theme";
const WARN_PCT = 10;   // amarillo desde este %
const DANGER_PCT = 15; // rojo desde este %

/* Paleta compartida por gráficos y horario, asignada en el mismo orden que SUBJECTS */
const PALETTE = ["#b8863c","#3f8f5f","#c98a1f","#b8453a","#6a7fd1","#8a5fb8","#3fa0b8","#a3a13f"];
const SUBJECT_COLORS = {};
SUBJECTS.forEach((s,i)=> SUBJECT_COLORS[s.id] = PALETTE[i % PALETTE.length]);

/* =======================================================
   HORARIO SEMANAL — traducido y simplificado desde el cuadrante
   original en valenciano. "Itinerari Personal Per A L'Ocupabilitat"
   está convalidado -> se marca como descanso. La optativa cursada es Nube.
   ======================================================= */
const SCHEDULE_ROWS = [
  ["15:00","15:55"],
  ["15:55","16:50"],
  ["16:50","17:45"],
  ["18:05","19:00"],
  ["19:00","19:55"],
  ["19:55","20:50"],
  ["21:05","22:00"],
];
const SCHEDULE = {
  "Lunes":     ["dasp","pidaw","dwec","dwes","dwes","sasp",null],
  "Martes":    ["daw","nube","break","dwec","diw","diw",null],
  "Miércoles": ["pidaw","diw","dwes","dwes","daw","daw",null],
  "Jueves":    ["nube","nube","dwes","dwes","dwec","dwec","tutoria"],
  "Viernes":   ["dwec","dwec","pidaw","diw","break","break",null],
};

function hexToRgba(hex, alpha){
  const h = hex.replace("#","");
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

let records = loadRecords();
let pieChart = null, barChart = null;
let pendingDeleteId = null;

/* =======================================================
   PERSISTENCIA (LocalStorage)
   ======================================================= */
function loadRecords(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveRecords(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

/* =======================================================
   CÁLCULOS
   ======================================================= */
function hoursFor(subjectId){
  return records.filter(r => r.subjectId === subjectId).reduce((s,r) => s + Number(r.hours), 0);
}
function pctFor(subject){
  const h = hoursFor(subject.id);
  return subject.totalHours ? (h / subject.totalHours) * 100 : 0;
}
function statusFor(pct){
  if(pct > DANGER_PCT) return "red";
  if(pct >= WARN_PCT) return "amber";
  return "green";
}
function statusLabel(status){
  return status === "red" ? "Riesgo" : status === "amber" ? "Advertencia" : "Correcto";
}

/* =======================================================
   NAVEGACIÓN
   ======================================================= */
document.querySelectorAll(".nav-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("view-"+btn.dataset.view).classList.add("active");
    document.getElementById("sidebar").classList.remove("open");
    if(btn.dataset.view === "dashboard") renderDashboard();
    if(btn.dataset.view === "historial") renderHistory();
    if(btn.dataset.view === "horario") renderSchedule();
    if(btn.dataset.view === "asignaturas") renderSubjectManager();
  });
});
document.getElementById("hamburger").addEventListener("click", ()=>{
  document.getElementById("sidebar").classList.toggle("open");
});

/* Navega a "Registrar falta" con la asignatura ya seleccionada */
function goToRegisterWithSubject(subjectId){
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelector('.nav-btn[data-view="registro"]').classList.add("active");
  document.getElementById("view-registro").classList.add("active");
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("subjectSelect").value = subjectId;
  updatePreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById("hoursInput").focus();
}

/* =======================================================
   TEMA (claro / oscuro)
   ======================================================= */
function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("themeLabel").textContent = theme === "dark" ? "Modo oscuro" : "Modo claro";
  document.getElementById("themeDot").textContent = theme === "dark" ? "☾" : "☀";
  localStorage.setItem(THEME_KEY, theme);
  renderDashboard(); 
}
document.getElementById("themeToggle").addEventListener("click", ()=>{
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});
document.documentElement.setAttribute("data-theme", localStorage.getItem(THEME_KEY) || "light");
document.getElementById("themeLabel").textContent =
  (localStorage.getItem(THEME_KEY) === "dark") ? "Modo oscuro" : "Modo claro";
document.getElementById("themeDot").textContent =
  (localStorage.getItem(THEME_KEY) === "dark") ? "☾" : "☀";

/* =======================================================
   FORMULARIOS: poblar selects
   ======================================================= */
function populateSelects(){
  const opts = SUBJECTS.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  document.getElementById("subjectSelect").innerHTML = opts;
  document.getElementById("editSubject").innerHTML = opts;
  document.getElementById("filterSelect").innerHTML =
    `<option value="">Todas las asignaturas</option>` + opts;
}
populateSelects();
document.getElementById("dateInput").valueAsDate = new Date();

/* =======================================================
   REGISTRO — vista previa en vivo
   ======================================================= */
function updatePreview(){
  const subjectId = document.getElementById("subjectSelect").value;
  const hoursVal = Number(document.getElementById("hoursInput").value) || 0;
  const subject = SUBJECTS.find(s=>s.id===subjectId);
  if(!subject) return;
  const box = document.getElementById("previewBox");
  box.style.display = "block";
  const current = hoursFor(subject.id) + hoursVal;
  const pct = (current / subject.totalHours) * 100;
  document.getElementById("prevFaltas").textContent = `${current} h de ${subject.totalHours} h`;
  document.getElementById("prevLimite").textContent = `${subject.allowedHours} h (15%)`;
  const status = statusFor(pct);
  const colorVar = status === "red" ? "var(--red)" : status === "amber" ? "var(--amber)" : "var(--green)";
  document.getElementById("prevPct").innerHTML = `<span style="color:${colorVar};font-weight:700;">${pct.toFixed(1)}%</span>`;
}
document.getElementById("subjectSelect").addEventListener("change", updatePreview);
document.getElementById("hoursInput").addEventListener("input", updatePreview);
populateSelects();
updatePreview();

document.getElementById("faltaForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  const subjectId = document.getElementById("subjectSelect").value;
  const date = document.getElementById("dateInput").value;
  const hours = Number(document.getElementById("hoursInput").value);
  const note = document.getElementById("noteInput").value.trim();
  if(!subjectId || !date || !hours || hours <= 0){
    showToast("Revisa los campos del formulario.", true);
    return;
  }
  records.push({ id: uid(), subjectId, date, hours, note });
  saveRecords();

  const subject = SUBJECTS.find(s=>s.id===subjectId);
  const pct = pctFor(subject);
  const status = statusFor(pct);
  const msg = status === "red"
    ? `Falta registrada en ${subject.name}. ¡Atención! Se ha superado el ${DANGER_PCT}% de faltas.`
    : status === "amber"
    ? `Falta registrada en ${subject.name}. Ya vas por el ${pct.toFixed(1)}% — vigila el límite.`
    : `Falta registrada correctamente en ${subject.name}.`;
  showToast(msg, status === "red");

  const btn = document.getElementById("submitBtn");
  btn.style.transform = "scale(0.96)";
  setTimeout(()=> btn.style.transform = "", 150);

  document.getElementById("faltaForm").reset();
  document.getElementById("dateInput").valueAsDate = new Date();
  document.getElementById("previewBox").style.display = "none";

  renderDashboard();
  renderHistory();
  renderSubjectManager();
});

/* =======================================================
   TOAST
   ======================================================= */
let toastTimer;
function showToast(msg, isError=false){
  const toast = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  toast.classList.toggle("err", !!isError);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toast.classList.remove("show"), 3800);
}

/* =======================================================
   DASHBOARD
   ======================================================= */
function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderDashboard(){
  const totalMissed = SUBJECTS.reduce((s,sub)=> s + hoursFor(sub.id), 0);
  const totalAllowed = SUBJECTS.reduce((s,sub)=> s + sub.allowedHours, 0);
  const atRisk = SUBJECTS.filter(s => statusFor(pctFor(s)) === "red").length;
  const warning = SUBJECTS.filter(s => statusFor(pctFor(s)) === "amber").length;

  document.getElementById("statCards").innerHTML = `
    <div class="stat-card">
      <div class="label">Asignaturas</div>
      <div class="value">${SUBJECTS.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">Horas faltadas (total)</div>
      <div class="value">${totalMissed}<span style="font-size:1rem;color:var(--text-2);"> / ${totalAllowed} h límite</span></div>
    </div>
    <div class="stat-card">
      <div class="label">En advertencia</div>
      <div class="value amber">${warning}</div>
    </div>
    <div class="stat-card">
      <div class="label">En riesgo</div>
      <div class="value red">${atRisk}</div>
    </div>
  `;

  renderProgressList();
  renderPieChart();
  renderBarChart();
}

function renderProgressList(){
  const list = document.getElementById("progressList");
  list.innerHTML = SUBJECTS.map(s=>{
    const h = hoursFor(s.id);
    const pct = pctFor(s);
    const status = statusFor(pct);
    const widthPct = Math.min(pct, 100);
    return `
      <div class="subject-item">
        <div class="subject-item-top">
          <span class="name">${s.name}</span>
          <span class="badge ${status}">${statusLabel(status)}</span>
        </div>
        <div class="bar-track"><div class="bar-fill ${status}" style="width:${widthPct}%"></div></div>
        <div class="subject-item-sub">
          <span>${h} h faltadas de ${s.totalHours} h</span>
          <span class="pct">${pct.toFixed(1)}% · límite ${s.allowedHours} h</span>
        </div>
      </div>`;
  }).join("");
}

function renderPieChart(){
  const ctx = document.getElementById("pieChart");
  if(typeof Chart === "undefined"){
    ctx.parentElement.innerHTML = '<p style="color:var(--text-2);font-size:.85rem;">No se pudo cargar Chart.js. El resto funciona normal.</p>';
    return;
  }
  const data = SUBJECTS.map(s=>hoursFor(s.id));
  const hasData = data.some(v=>v>0);
  const labels = SUBJECTS.map(s=>s.name);
  const palette = SUBJECTS.map(s=>SUBJECT_COLORS[s.id]);

  if(pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: hasData ? data : SUBJECTS.map(()=>1),
        backgroundColor: hasData ? palette : palette.map(()=>cssVar('--paper-2')),
        borderColor: cssVar('--paper-0'),
        borderWidth: 2,
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ position:"bottom", labels:{ color: cssVar('--text-1'), boxWidth:10, font:{size:10} } },
        tooltip:{ enabled: hasData, callbacks:{ label: (c)=> `${c.label}: ${c.raw} h` } }
      }
    }
  });
}

function renderBarChart(){
  const ctx = document.getElementById("barChart");
  if(typeof Chart === "undefined") return;

  const labels = SUBJECTS.map(s=> s.name.length > 18 ? s.name.slice(0,18)+"…" : s.name);
  const missed = SUBJECTS.map(s=>hoursFor(s.id));
  const allowed = SUBJECTS.map(s=>s.allowedHours);

  if(barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label:"Horas faltadas", data: missed, backgroundColor: SUBJECTS.map(s=>{
            const st = statusFor(pctFor(s));
            return st==="red" ? "#b8453a" : st==="amber" ? "#c98a1f" : "#3f8f5f";
          }), borderRadius:4, maxBarThickness:22 },
        { label:"Límite permitido", data: allowed, backgroundColor: cssVar('--line'), borderRadius:4, maxBarThickness:22 },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      scales:{
        x:{ ticks:{ color: cssVar('--text-2'), font:{size:9}, maxRotation:40, minRotation:40 }, grid:{ display:false } },
        y:{ ticks:{ color: cssVar('--text-2') }, grid:{ color: cssVar('--line') } }
      },
      plugins:{ legend:{ position:"bottom", labels:{ color: cssVar('--text-1'), boxWidth:10, font:{size:10} } } }
    }
  });
}

/* =======================================================
   HISTORIAL
   ======================================================= */
document.getElementById("filterSelect").addEventListener("change", renderHistory);

function renderHistory(){
  const filter = document.getElementById("filterSelect").value;
  const sorted = [...records].sort((a,b)=> b.date.localeCompare(a.date));
  const filtered = filter ? sorted.filter(r=>r.subjectId===filter) : sorted;

  document.getElementById("countBadge").textContent =
    `${filtered.length} registro${filtered.length===1?"":"s"}`;

  const body = document.getElementById("historyBody");
  const empty = document.getElementById("emptyState");

  if(filtered.length === 0){
    body.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  body.innerHTML = filtered.map(r=>{
    const subject = SUBJECTS.find(s=>s.id===r.subjectId);
    return `
      <tr data-id="${r.id}">
        <td>${formatDate(r.date)}</td>
        <td>${subject ? subject.name : "—"}</td>
        <td><strong>${r.hours} h</strong></td>
        <td style="color:var(--text-2);">${r.note ? r.note : "—"}</td>
        <td class="actions">
          <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${r.id}">Editar</button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-id="${r.id}">Eliminar</button>
        </td>
      </tr>`;
  }).join("");
}

function formatDate(iso){
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* =======================================================
   POR ASIGNATURA 
   ======================================================= */
function renderSubjectManager(){
  const container = document.getElementById("subjectManager");
  if(!container) return;

  container.innerHTML = SUBJECTS.map((s, idx)=>{
    const recs = records
      .filter(r=>r.subjectId===s.id)
      .sort((a,b)=> b.date.localeCompare(a.date));
    const pct = pctFor(s);
    const status = statusFor(pct);
    const totalH = hoursFor(s.id);

    const rowsHtml = recs.length ? recs.map(r=>`
      <div class="sm-row" data-id="${r.id}">
        <div class="sm-row-main">
          <span class="sm-date">${formatDate(r.date)}</span>
          <span class="sm-hours">${r.hours} h</span>
          <span class="sm-note">${r.note ? r.note : "—"}</span>
        </div>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${r.id}">Editar</button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-id="${r.id}">Eliminar</button>
        </div>
      </div>`).join("")
      : `<div class="sm-empty">Sin faltas registradas en esta asignatura.</div>`;

    return `
      <details class="sm-subject" ${idx===0 && recs.length ? "open" : ""}>
        <summary>
          <div class="sm-summary-left">
            <span class="sm-chevron">▸</span>
            <span class="sm-name" style="color:${SUBJECT_COLORS[s.id]};">${s.name}</span>
          </div>
          <div class="sm-summary-right">
            <span class="badge ${status}">${statusLabel(status)}</span>
            <span class="sm-count">${totalH} h / ${s.totalHours} h · ${recs.length} registro${recs.length===1?"":"s"}</span>
          </div>
        </summary>
        <div class="sm-body">${rowsHtml}</div>
      </details>`;
  }).join("");
}

/* =======================================================
   HORARIO
   ======================================================= */
function renderSchedule(){
  const grid = document.getElementById("scheduleGrid");
  if(!grid) return;
  const labels = { break: "Descanso", tutoria: "Tutoría" };

  grid.innerHTML = Object.keys(SCHEDULE).map(day=>{
    const slots = SCHEDULE[day];
    const rowsHtml = slots.map((slotId, idx)=>{
      const [start, end] = SCHEDULE_ROWS[idx];
      if(!slotId){
        return `<div class="sched-slot empty"></div>`;
      }
      if(slotId === "break" || slotId === "tutoria"){
        return `<div class="sched-slot muted">
                  <span class="sched-time">${start}–${end}</span>
                  <span class="sched-name">${labels[slotId]}</span>
                </div>`;
      }
      const subject = SUBJECTS.find(s=>s.id===slotId);
      const color = SUBJECT_COLORS[slotId];
      return `<div class="sched-slot clickable" data-subject="${slotId}"
                   style="background:${hexToRgba(color,0.12)};border-left-color:${color};"
                   title="Registrar falta en ${subject.name}">
                <span class="sched-time">${start}–${end}</span>
                <span class="sched-name" style="color:${color};">${subject.name}</span>
              </div>`;
    }).join("");

    return `<div class="sched-day">
              <div class="sched-day-head">${day}</div>
              <div class="sched-day-body">${rowsHtml}</div>
            </div>`;
  }).join("");

  grid.querySelectorAll(".sched-slot.clickable").forEach(el=>{
    el.addEventListener("click", ()=> goToRegisterWithSubject(el.dataset.subject));
  });
}


function handleRecordActionClick(e){
  const btn = e.target.closest("button");
  if(!btn) return;
  const id = btn.dataset.id;
  if(btn.dataset.action === "edit") openEdit(id);
  if(btn.dataset.action === "delete") openDelete(id);
}
document.getElementById("historyBody").addEventListener("click", handleRecordActionClick);
document.getElementById("subjectManager").addEventListener("click", handleRecordActionClick);

/* -------- editar -------- */
function openEdit(id){
  const rec = records.find(r=>r.id===id);
  if(!rec) return;
  document.getElementById("editSubject").value = rec.subjectId;
  document.getElementById("editDate").value = rec.date;
  document.getElementById("editHours").value = rec.hours;
  document.getElementById("editNote").value = rec.note || "";
  document.getElementById("editBackdrop").dataset.id = id;
  document.getElementById("editBackdrop").classList.add("show");
}
document.getElementById("cancelEdit").addEventListener("click", ()=>{
  document.getElementById("editBackdrop").classList.remove("show");
});
document.getElementById("saveEdit").addEventListener("click", ()=>{
  const id = document.getElementById("editBackdrop").dataset.id;
  const rec = records.find(r=>r.id===id);
  if(!rec) return;
  rec.subjectId = document.getElementById("editSubject").value;
  rec.date = document.getElementById("editDate").value;
  rec.hours = Number(document.getElementById("editHours").value);
  rec.note = document.getElementById("editNote").value.trim();
  saveRecords();
  document.getElementById("editBackdrop").classList.remove("show");
  showToast("Registro actualizado.");
  renderHistory();
  renderDashboard();
  renderSubjectManager();
});

/* -------- eliminar -------- */
function openDelete(id){
  pendingDeleteId = id;
  document.getElementById("deleteTitle").textContent = "¿Eliminar este registro?";
  document.getElementById("deleteText").textContent = "Esta acción no se puede deshacer.";
  document.getElementById("deleteBackdrop").classList.add("show");
}
document.getElementById("deleteAllBtn").addEventListener("click", ()=>{
  if(records.length === 0){
    showToast("No hay registros que eliminar.");
    return;
  }
  pendingDeleteId = "ALL";
  document.getElementById("deleteTitle").textContent = "¿Eliminar TODOS los registros?";
  document.getElementById("deleteText").textContent =
    `Se borrarán los ${records.length} registro(s) del historial. Útil para reiniciar tras hacer pruebas. Esta acción no se puede deshacer.`;
  document.getElementById("deleteBackdrop").classList.add("show");
});
document.getElementById("cancelDelete").addEventListener("click", ()=>{
  pendingDeleteId = null;
  document.getElementById("deleteBackdrop").classList.remove("show");
});
document.getElementById("confirmDelete").addEventListener("click", ()=>{
  if(!pendingDeleteId) return;

  if(pendingDeleteId === "ALL"){
    records = [];
    saveRecords();
    pendingDeleteId = null;
    document.getElementById("deleteBackdrop").classList.remove("show");
    renderHistory();
    renderDashboard();
    renderSubjectManager();
    showToast("Se han eliminado todos los registros.");
    return;
  }

  const row = document.querySelector(`tr[data-id="${pendingDeleteId}"]`);
  if(row){
    row.classList.add("removing");
    setTimeout(()=>{
      records = records.filter(r=>r.id !== pendingDeleteId);
      saveRecords();
      pendingDeleteId = null;
      renderHistory();
      renderDashboard();
      renderSubjectManager();
    }, 280);
  }
  document.getElementById("deleteBackdrop").classList.remove("show");
  showToast("Registro eliminado.");
});

/* cerrar modales al hacer click fuera */
[document.getElementById("editBackdrop"), document.getElementById("deleteBackdrop")].forEach(bd=>{
  bd.addEventListener("click", (e)=>{ if(e.target === bd) bd.classList.remove("show"); });
});

/* =======================================================
   INICIALIZACIÓN
   ======================================================= */
renderDashboard();
renderHistory();
renderSchedule();
renderSubjectManager();
