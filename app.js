const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const stateKey = "dc-form";

/* ---- STEP TITLES (20) ---- */
const STEP_TITLES = [
  "Producer Information",
  "Proposed Insured",
  "Confirm Identity – Proposed Insured",
  "HIPAA Signature and Lock Data",
  "HIPAA Signature Method",
  "Proposed Insured Cont’d",
  "Insurance History",
  "Plan Information",
  "Pre-Approval Information",
  "Underwriting",
  "Beneficiaries",
  "Premium Summary",
  "Automatic Bill Pay",
  "Validate and Lock Data",
  "Attachments",
  "Post Submission Email Setup",
  "Signature Method",
  "Producer Statement",
  "Welcome Consent – Producer",
  "Apply eSignature – Producer"
];

/* ---- BUILD 20 APP PAGES DYNAMICALLY (prevents missing views) ---- */
function buildSteps(){
  const anchor = $('#app-steps-anchor');
  if(!anchor) return;
  let html = '';
  for(let i=1;i<=20;i++){
    const title = STEP_TITLES[i-1] || `Step ${i}`;
    const prev = i===1 ? 'start' : `app-${i-1}`;
    const next = i===20 ? 'app-success' : `app-${i+1}`;

    // minimal, working fields; we’ll expand as needed
    const extra =
      i===2 ? /* Proposed Insured */ `
        <div class="field"><label>First *</label><input id="pi-first" class="input"/></div>
        <div class="field"><label>Last *</label><input id="pi-last" class="input"/></div>
        <div class="field"><label>Date of Birth *</label><input id="pi-dob" class="input" placeholder="MM/DD/YYYY"/></div>
        <div class="field"><label>Age</label><input id="pi-age" class="input" readonly/></div>
        <div class="field"><label>Gender</label>
          <select id="pi-gender" class="select"><option value="">Select…</option><option>Male</option><option>Female</option></select>
        </div>
        <div class="field"><label>SSN</label><input id="pi-ssn" class="input" placeholder="___-__-____"/></div>
      ` :
      i===13 ? /* Auto Bill Pay */ `
        <div class="field"><label>Bank Name</label><input id="bank-name" class="input"/></div>
        <div class="field"><label>Routing Number</label><input id="routing" class="input" inputmode="numeric" maxlength="9"/></div>
        <div class="field"><label>Account Number</label><input id="account" class="input" inputmode="numeric" maxlength="17"/></div>
        <div class="field"><label>Payment Day</label><select id="weekday" class="select"><option>1</option><option>15</option><option>28</option></select></div>
      ` :
      i===12 ? /* Premium Summary */ `
        <div class="field"><label>Premium (mo)</label><input id="prem-mo" class="input" inputmode="decimal"/></div>
        <div class="field"><label>Frequency</label><select id="prem-freq" class="select"><option>Monthly</option><option>Quarterly</option><option>Semi-Annual</option><option>Annual</option></select></div>
      ` :
      `<div class="field"><label>Notes</label><input id="notes-${i}" class="input" placeholder="${title} notes"/></div>`;

    html += `
      <section class="view" data-view="app-${i}" hidden>
        <header class="section-hd"><h2>${title}</h2></header>
        <div class="form-grid">${extra}</div>
        <div class="footer-nav">
          <a class="btn btn--ghost" href="#/${prev}">Back</a>
          <a class="btn btn--primary" href="#/${next}">Next ▸</a>
        </div>
      </section>
    `;
  }
  anchor.insertAdjacentHTML('beforebegin', html);
}
buildSteps();

/* ---- ROUTER ---- */
function to(view){
  $$('.view').forEach(v=>{
    const active = v.dataset.view === view;
    v.hidden = !active;
    v.classList.toggle('view--active', active);
  });
  // tabs appearance (case vs app)
  const app = /^app-/.test(view);
  const tabs = $$('.tabs .tab');
  if(tabs.length===2){
    tabs[0].style.background = app ? '#cfe6f4' : '#fff';
    tabs[0].style.borderBottom = app ? '0' : '3px solid var(--blue-800)';
    tabs[1].style.background = app ? '#fff' : '#cfe6f4';
    tabs[1].style.borderBottom = app ? '3px solid var(--blue-800)' : '0';
  }
  location.hash = `/${view}`;
}

/* ---- LOGIN ---- */
$('#btn-login')?.addEventListener('click', ()=>{
  const fn = $('#login-first').value.trim();
  const ln = $('#login-last').value.trim();
  if(!fn || !ln) return alert('Enter first and last name');
  localStorage.setItem('dc-user', JSON.stringify({first:fn,last:ln}));
  $('.welcome span').textContent = `Welcome ${fn} ${ln}`;
  to('home');
});
$('#btn-logout')?.addEventListener('click', ()=>{
  localStorage.removeItem('dc-user');
  to('login');
});
try{
  const u = JSON.parse(localStorage.getItem('dc-user'));
  if(u){ $('.welcome span').textContent = `Welcome ${u.first} ${u.last}`; to('home'); }
}catch{}

/* ---- DOB → AGE ---- */
function calcAge(val){
  const parts = val.split(/[\/\-]/);
  if(parts.length===3){
    const [m,d,y] = parts.map(Number);
    const b = new Date(y, m-1, d);
    if(!isNaN(b)){
      const t = new Date();
      let age = t.getFullYear()-b.getFullYear();
      const md = t.getMonth()-b.getMonth();
      if(md<0 || (md===0 && t.getDate()<b.getDate())) age--;
      return age>0 ? age : '';
    }
  }
  return '';
}
function linkDOB(dobId, ageId){
  const dob = $('#'+dobId), age = $('#'+ageId);
  if(!dob || !age) return;
  const handler = e => { age.value = calcAge(e.target.value); autosave(); };
  dob.addEventListener('input', handler);
}

/* link Start Case */
linkDOB('dob','age');
/* link Proposed Insured (app-2) once built */
document.addEventListener('DOMContentLoaded', ()=>{ linkDOB('pi-dob','pi-age'); });

/* ---- AUTOSAVE ---- */
let timer;
function autosave(){
  clearTimeout(timer);
  $('#save-status').textContent = 'Saving…';
  timer = setTimeout(()=>{
    const payload = collectForm();
    try{
      localStorage.setItem(stateKey, JSON.stringify(payload));
      $('#save-status').textContent = 'Saved';
    }catch{ $('#save-status').textContent = 'Save failed'; }
  }, 400);
}
function collectForm(){
  const data = {};
  $$('input,select,textarea').forEach(el=>{
    if(!el.id) return;
    if(el.type==='checkbox'||el.type==='radio'){ data[el.id] = el.checked; }
    else { data[el.id] = el.value; }
  });
  return data;
}
function restoreForm(){
  try{
    const d = JSON.parse(localStorage.getItem(stateKey) || '{}');
    Object.entries(d).forEach(([id,v])=>{
      const el = $('#'+id);
      if(!el) return;
      if(el.type==='checkbox'||el.type==='radio'){ el.checked = !!v; }
      else { el.value = v; }
    });
    // recompute ages if DOBs present
    if($('#dob')) $('#age').value = calcAge($('#dob').value||'');
    if($('#pi-dob')) $('#pi-age').value = calcAge($('#pi-dob').value||'');
  }catch{}
}
restoreForm();
document.body.addEventListener('input', autosave);

/* ---- HASH NAV ---- */
window.addEventListener('hashchange', ()=>{
  const target = location.hash.replace('#/','') || 'home';
  to(target);
});
if(!location.hash){ to('login'); } else { to(location.hash.replace('#/','')); }

/* ---- ORIENTATION GUARD ---- */
(function(){
  const guard = $('#orientation-guard');
  const update = () => {
    const portrait = matchMedia('(orientation:portrait)').matches;
    const narrow = innerWidth < 900;
    guard.hidden = !(portrait && narrow);
  };
  update(); addEventListener('resize', update); addEventListener('orientationchange', update);
})();

/* ---- PWA ---- */
if('serviceWorker' in navigator){ navigator.serviceWorker.register('./service-worker.js').catch(()=>{}); }