# /app.js
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const stateKey = "dc-form";
const STEP_TITLES = [
  "Producer Information","Proposed Insured","Confirm Identity – Proposed Insured",
  "HIPAA Signature and Lock Data","HIPAA Signature Method","Proposed Insured Cont’d",
  "Insurance History","Plan Information","Pre-Approval Information","Underwriting",
  "Beneficiaries","Premium Summary","Automatic Bill Pay","Validate and Lock Data",
  "Attachments","Post Submission Email Setup","Signature Method","Producer Statement",
  "Welcome Consent – Producer","Apply eSignature – Producer"
];

/* Build step nav */
(function buildStepNav(){
  const list = $('#step-list'); if(!list) return;
  list.innerHTML = STEP_TITLES.map((t,i)=>`
    <li data-step="${i+1}" id="step-nav-${i+1}">
      <span class="step-dot">${i+1}</span><span>${t}</span>
    </li>
  `).join('');
  list.addEventListener('click', e=>{
    const li = e.target.closest('li[data-step]'); if(!li) return;
    const step = li.getAttribute('data-step');
    to(`app-${step}`);
  });
})();

/* Router */
function setAppChrome(isApp){
  const tabs = $$('.tabs .tab');
  if(tabs.length===2){
    tabs[0].style.background = isApp ? '#cfe6f4' : '#fff';
    tabs[0].style.borderBottom = isApp ? '0' : '3px solid var(--blue-800)';
    tabs[1].style.background = isApp ? '#fff' : '#cfe6f4';
    tabs[1].style.borderBottom = isApp ? '3px solid var(--blue-800)' : '0';
  }
  $('#step-nav').hidden = !isApp;
}
function markStep(view){
  const m = view.match(/^app-(\d{1,2})$/); if(!m) { $$('#step-list li').forEach(li=>li.classList.remove('is-active','is-done')); return; }
  const idx = +m[1];
  $$('#step-list li').forEach((li,i)=>{
    li.classList.toggle('is-active', i+1===idx);
    li.classList.toggle('is-done', i+1<idx);
    const dot = $('.step-dot', li);
    dot.textContent = (i+1<idx) ? '✓' : String(i+1);
  });
}
function to(view){
  const target = $(`[data-view="${view}"]`) ? view : "home";
  $$('.view').forEach(v=>{
    const active = v.dataset.view===target;
    v.hidden=!active; v.classList.toggle('view--active', active);
  });
  const isApp = /^app-/.test(target);
  setAppChrome(isApp);
  markStep(target);
  location.hash = `/${target}`;
  $('#router')?.focus();
}

/* Login */
$('#btn-login')?.addEventListener('click', ()=>{
  const fn = $('#login-first').value.trim();
  const ln = $('#login-last').value.trim();
  if(!fn||!ln){ alert('Enter first and last name'); return; }
  localStorage.setItem('dc-user', JSON.stringify({first:fn,last:ln}));
  $('.welcome span').textContent = `Welcome ${fn} ${ln}`;
  $('#prod-name')?.setAttribute('placeholder', `${fn} ${ln}`);
  to('home');
});
$('#btn-logout')?.addEventListener('click', ()=>{ localStorage.removeItem('dc-user'); to('login'); });
try{
  const u = JSON.parse(localStorage.getItem('dc-user')||'null');
  if(u){ $('.welcome span').textContent=`Welcome ${u.first} ${u.last}`; $('#prod-name')?.setAttribute('placeholder', `${u.first} ${u.last}`); to('home'); }
}catch{}

/* Orientation guard */
(function(){
  const guard = $('#orientation-guard');
  const update = () => { const portrait = matchMedia('(orientation:portrait)').matches; const narrow = innerWidth < 900; guard.hidden = !(portrait && narrow); };
  update(); addEventListener('resize', update); addEventListener('orientationchange', update);
})();

/* PWA */
if('serviceWorker' in navigator){ navigator.serviceWorker.register('./service-worker.js').catch(()=>{}); }

/* Masks + helpers */
const onlyDigits = (v,max) => (v.replace(/\D+/g,'').slice(0,max ?? 999));
const maskSSN = v => { const d=onlyDigits(v,9); const a=d.slice(0,3), b=d.slice(3,5), c=d.slice(5,9); return [a,b,c].filter(Boolean).join('-'); };
const isABA = v => { const d=onlyDigits(v,9); if(d.length!==9) return false; const n=[...d].map(Number); const sum=3*(n[0]+n[3]+n[6])+7*(n[1]+n[4]+n[7])+(n[2]+n[5]+n[8]); return sum%10===0; };
const maskCurrency = v => { const d = v.replace(/[^\d.]/g,''); const [i,f=''] = d.split('.'); const I = (i||'0').replace(/^0+(?=\d)/,'') || '0'; const F = (f+'00').slice(0,2); return `$${I}.${F}`; };
const maskPhone = v => { const d=onlyDigits(v,10); if(d.length<=3) return d; if(d.length<=6) return `(${d.slice(0,3)}) ${d.slice(3)}`; return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,10)}`; };

/* DOB -> Age */
function calcAge(val){
  const m=val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/); if(!m) return '';
  let [_,MM,DD,YYYY]=m; MM=+MM; DD=+DD; YYYY=+YYYY; if(YYYY<100) YYYY+=2000;
  const b=new Date(YYYY,MM-1,DD); if(isNaN(+b)) return '';
  const t=new Date(); let age=t.getFullYear()-b.getFullYear();
  const md=t.getMonth()-b.getMonth(); if(md<0||(md===0&&t.getDate()<b.getDate())) age--;
  return age>0?String(age):'';
}
function wireDOBtoAge(){
  $$('.dob').forEach(dob=>{
    const age = dob.closest('.form-grid,.fs,.view')?.querySelector('.age'); if(!age) return;
    dob.addEventListener('input', e=>{ age.value = calcAge(e.target.value.trim()); autosave(); });
  });
}
wireDOBtoAge();

/* Autosave */
let saveTimer;
function autosave(){
  clearTimeout(saveTimer);
  $('#save-status').textContent='Saving…';
  saveTimer=setTimeout(()=>{
    try{ localStorage.setItem(stateKey, JSON.stringify(collectForm())); $('#save-status').textContent='Saved'; }
    catch{ $('#save-status').textContent='Save failed'; }
  }, 300);
}
function collectForm(){
  const data = {};
  $$('input,select,textarea').forEach(el=>{
    if(!el.id) return;
    if(el.type==='file'){ data[el.id] = [...el.files].map(f=>f.name); }
    else if(el.type==='checkbox' || el.type==='radio'){ data[el.id] = el.checked; }
    else { data[el.id] = el.value; }
  });
  return data;
}
function restoreForm(){
  try{
    const d = JSON.parse(localStorage.getItem(stateKey)||'{}');
    Object.entries(d).forEach(([id,v])=>{
      const el = $('#'+id); if(!el) return;
      if(el.type==='checkbox'||el.type==='radio') el.checked = !!v;
      else if(el.type!=='file') el.value = v;
    });
    // recompute ages
    $$('.dob').forEach(dob=>{ const age = dob.closest('.form-grid,.fs,.view')?.querySelector('.age'); if(age) age.value = calcAge(dob.value||''); });
    updateBeneTotals(); renderEmailList();
  }catch{}
}
restoreForm();

/* Input wiring */
document.body.addEventListener('input', (e)=>{
  const t = e.target;
  if(!(t instanceof HTMLElement)) return;
  if(t.classList.contains('ssn')) t.value = maskSSN(t.value);
  if(t.classList.contains('money')) t.value = maskCurrency(t.value);
  if(t.classList.contains('routing')){ t.value = onlyDigits(t.value,9); t.classList.toggle('error', !!t.value && !isABA(t.value)); }
  if(t.classList.contains('account')){ t.value = onlyDigits(t.value,17); t.classList.toggle('error', !!t.value && (t.value.length<4 || t.value.length>17)); }
  if(t.classList.contains('phone')) t.value = maskPhone(t.value);
  if(t.classList.contains('zip')) t.value = onlyDigits(t.value,5);
  autosave();
});

/* Hash router */
window.addEventListener('hashchange', ()=>{ const target = location.hash.replace('#/','') || 'home'; to(target); });
if(!location.hash) to('login'); else to(location.hash.replace('#/',''));

/* Beneficiaries */
const beneBody = $('#bene-body');
function beneRow(id, name='', rel='', type='Primary', pct=''){
  return `<tr data-id="${id}">
    <td><input id="bene-name-${id}" class="input" value="${name}"/></td>
    <td><input id="bene-rel-${id}" class="input" value="${rel}"/></td>
    <td><select id="bene-type-${id}" class="select"><option ${type==='Primary'?'selected':''}>Primary</option><option ${type==='Contingent'?'selected':''}>Contingent</option></select></td>
    <td style="max-width:110px"><input id="bene-pct-${id}" class="input" inputmode="numeric" value="${pct}" /></td>
    <td><button class="btn btn--ghost bene-del" type="button">Remove</button></td>
  </tr>`;
}
function updateBeneTotals(){
  let total = 0;
  $$('[id^="bene-pct-"]').forEach(i=>{ const n = parseInt(onlyDigits(i.value,3)||'0',10); i.value = String(n); total += (isNaN(n)?0:n); });
  const el = $('#bene-total'); if(el){ el.textContent = `Total: ${total}%`; el.style.color = (total===100?'#0a7b12':'#b00020'); }
}
$('#bene-add')?.addEventListener('click', ()=>{
  const id = Math.random().toString(36).slice(2,8);
  beneBody.insertAdjacentHTML('beforeend', beneRow(id));
  autosave(); updateBeneTotals();
});
beneBody?.addEventListener('click', (e)=>{
  const btn = e.target.closest('.bene-del'); if(!btn) return;
  btn.closest('tr')?.remove(); autosave(); updateBeneTotals();
});
beneBody?.addEventListener('input', (e)=>{
  if(e.target.id.startsWith('bene-pct-')) updateBeneTotals();
});

/* Validation (step 14) */
const requiredIds = [
  'firstName','lastName','dob','gender','coverage','state','ptype',
  'pi-first','pi-last','pi-dob','pi-gender','pi-ssn'
];
$('#btn-validate')?.addEventListener('click', ()=>{
  const errs = [];
  requiredIds.forEach(id=>{
    const el = $('#'+id);
    if(!el) return;
    const val = (el.type==='checkbox'||el.type==='radio') ? el.checked : (el.value||'').trim();
    const bad = (el.type==='checkbox'||el.type==='radio') ? !val : val==='';
    el.classList.toggle('error', bad);
    if(bad) errs.push(`Missing: ${id}`);
  });
  if($('#routing') && $('#routing').value && !isABA($('#routing').value)) errs.push('Routing number invalid');
  if($('#bene-body') && $('#bene-body').children.length>0){
    const total = [...$$('[id^="bene-pct-"]')].reduce((a,i)=>a+(parseInt(i.value||'0',10)||0),0);
    if(total!==100) errs.push('Beneficiaries must total 100%');
  }
  const list = $('#val-errors');
  list.innerHTML = errs.length? errs.map(e=>`<li>${e}</li>`).join('') : '<li>All required items complete.</li>';
});

/* Email list (step 16) */
function renderEmailList(){
  const ul = $('#email-list'); if(!ul) return;
  const data = JSON.parse(localStorage.getItem(stateKey)||'{}');
  const emails = (data._emails||[]); ul.innerHTML='';
  emails.forEach((em,i)=>{
    const li = document.createElement('li'); li.textContent = em + ' ';
    const btn = document.createElement('button'); btn.className='btn btn--ghost'; btn.textContent='Remove';
    btn.addEventListener('click', ()=>{
      const d = JSON.parse(localStorage.getItem(stateKey)||'{}');
      (d._emails||[]).splice(i,1); localStorage.setItem(stateKey, JSON.stringify(d)); renderEmailList();
    });
    li.appendChild(btn); ul.appendChild(li);
  });
}
$('#email-add-btn')?.addEventListener('click', ()=>{
  const box = $('#email-add'); const v = (box.value||'').trim(); if(!v) return;
  const d = JSON.parse(localStorage.getItem(stateKey)||'{}'); d._emails = d._emails || []; d._emails.push(v);
  localStorage.setItem(stateKey, JSON.stringify(d)); box.value=''; renderEmailList();
});

/* Footer year */
$('#year').textContent = new Date().getFullYear();

# /manifest.json
{
  "name": "DAWGCHECK Trainer",
  "short_name": "DAWGCHECK",
  "start_url": "./",
  "display": "standalone",
  "orientation": "landscape",
  "background_color": "#f3f5f7",
  "theme_color": "#2b99ca",
  "icons": [
    { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
