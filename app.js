const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const stateKey = "dc-form";

/* Router */
function to(view){
  $$('.view').forEach(v=>{
    const active = v.dataset.view === view;
    v.hidden = !active; v.classList.toggle('view--active', active);
  });
  const app = view.startsWith('app-');
  const tabs = $$('.tabs .tab');
  tabs[0].style.background = app ? '#cfe6f4' : '#fff';
  tabs[0].style.borderBottom = app ? '0' : '3px solid var(--blue-800)';
  tabs[1].style.background = app ? '#fff' : '#cfe6f4';
  tabs[1].style.borderBottom = app ? '3px solid var(--blue-800)' : '0';
  setStepper(view);
  location.hash = `/${view}`;
  $('#router')?.focus();
}

/* Stepper state */
function setStepper(view){
  const stepIdx = view==="app-proposed" ? 1 : view==="app-driver" ? 2 : view==="app-payment" ? 3 : 0;
  $$('.stepper').forEach(s=>{
    $$('.step', s).forEach((node, i)=>{
      node.classList.toggle('is-active', i+1 === stepIdx);
      node.classList.toggle('is-done', i+1 < stepIdx);
      const dot = $('.step__dot', node);
      if(i+1 < stepIdx) dot.textContent = '✓'; else dot.textContent = String(i+1);
    });
  });
}

/* Orientation guard */
function wireOrientationGuard(){
  const guard = $('#orientation-guard');
  const update = () => {
    const portrait = matchMedia('(orientation:portrait)').matches;
    const narrow = innerWidth < 900;
    guard.hidden = !(portrait && narrow);
  };
  update(); addEventListener('resize', update); addEventListener('orientationchange', update);
}

/* PWA */
function pwa(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  }
}

/* Autosave */
let saveTimer;
function autosave(){
  clearTimeout(saveTimer);
  $('#save-status').textContent = 'Saving…';
  saveTimer = setTimeout(()=>{
    const payload = collectForm();
    try{
      localStorage.setItem(stateKey, JSON.stringify(payload));
      $('#save-status').textContent = `Saved ${new Date().toLocaleTimeString()}`;
    }catch{
      $('#save-status').textContent = 'Save failed';
    }
  }, 500);
}

/* State helpers */
function setVal(id, val){ const el = $('#'+id); if(el!=null) el.value = val ?? el.value; }
function getVal(id){ const el = $('#'+id); return el?.value ?? ''; }
function collectForm(){
  return {
    firstName:getVal('firstName'), lastName:getVal('lastName'), dob:getVal('dob'), age:getVal('age'), gender:getVal('gender'),
    desc:getVal('desc'), coverage:getVal('coverage'), state:getVal('state'), ptype:getVal('ptype'),
    pi_first:getVal('pi-first'), pi_mi:getVal('pi-mi'), pi_last:getVal('pi-last'),
    pi_dob:getVal('pi-dob'), pi_age:getVal('pi-age'), pi_gender:getVal('pi-gender'),
    ssn:getVal('pi-ssn'), h_ft:getVal('h-ft'), h_in:getVal('h-in'), pi_weight:getVal('pi-weight'),
    dl: $('#dl-no')?.checked ? 'no':'yes', dl_number:getVal('dl-number'), dl_state:getVal('dl-state'),
    birth_country:getVal('birth-country'), birth_state:getVal('birth-state'),
    owner: $('#own-no')?.checked ? 'no':'yes',
    bank_name:getVal('bank-name'), routing:getVal('routing'), account:getVal('account'),
    payday: $('#pay-sched')?.checked ? 'sched':'any', weekday:getVal('weekday'), week:getVal('week'), amount:getVal('amount')
  };
}
function restoreForm(){
  try{
    const data = JSON.parse(localStorage.getItem(stateKey) || '{}');

    setVal('firstName', data.firstName);
    setVal('lastName', data.lastName);
    setVal('dob', data.dob);
    setVal('age', data.age);
    setVal('gender', data.gender);
    setVal('desc', data.desc);
    setVal('coverage', data.coverage);
    setVal('state', data.state);
    setVal('ptype', data.ptype);

    setVal('pi-first', data.pi_first);
    setVal('pi-mi', data.pi_mi);
    setVal('pi-last', data.pi_last);
    setVal('pi-dob', data.pi_dob);
    setVal('pi-age', data.pi_age);
    setVal('pi-gender', data.pi_gender);
    setVal('pi-ssn', data.ssn);
    setVal('h-ft', data.h_ft);
    setVal('h-in', data.h_in);
    setVal('pi-weight', data.pi_weight);

    if(data.dl==='no') $('#dl-no').checked = true;
    setVal('dl-number', data.dl_number);
    setVal('dl-state', data.dl_state);
    setVal('birth-country', data.birth_country);
    setVal('birth-state', data.birth_state);
    if(data.owner==='no') $('#own-no').checked = true;

    setVal('bank-name', data.bank_name);
    setVal('routing', data.routing);
    setVal('account', data.account);
    if(data.payday==='sched') $('#pay-sched').checked = true;
    setVal('weekday', data.weekday);
    setVal('week', data.week);
    setVal('amount', data.amount);
  }catch{}
}

/* Masks/validation */
const onlyDigits = (v,max) => (v.replace(/\D+/g,'').slice(0,max ?? 999));
const maskSSN = v => { const d = onlyDigits(v,9); const a=d.slice(0,3), b=d.slice(3,5), c=d.slice(5,9); return [a,b,c].filter(Boolean).join('-'); };
const isABA = v => { const d = onlyDigits(v,9); if(d.length!==9) return false; const n=[...d].map(Number);
  const sum = 3*(n[0]+n[3]+n[6]) + 7*(n[1]+n[4]+n[7]) + (n[2]+n[5]+n[8]); return sum % 10 === 0; };
const maskCurrency = v => { const d = v.replace(/[^\d.]/g,''); const [i,f=''] = d.split('.'); const I = (i||'0').replace(/^0+(?=\d)/,'') || '0'; const F = (f+'00').slice(0,2); return `$${I}.${F}`; };
function parseCurrency(v){ const d = v.replace(/[^\d]/g,''); return d ? parseInt(d,10) : 0; }

/* Quote */
function updateQuote(){
  const age = parseInt(getVal('pi-age') || getVal('age') || '0', 10) || 0;
  const cov = parseCurrency(getVal('coverage'));
  const out = $('#quote-premium'); const meta = $('#quote-breakdown');
  if(!out || !meta) return;
  if(age<=0 || cov<=0){ out.textContent = '—'; meta.textContent = 'Enter Age & Coverage'; return; }
  const base = 15, ageLoad = Math.max(0, age-30)*0.4, amtLoad = (cov/100000)*2.2;
  const premium = (base + ageLoad + amtLoad).toFixed(2);
  out.textContent = `$${premium}/mo`;
  meta.textContent = `Base $${base.toFixed(2)} + Age $${ageLoad.toFixed(2)} + Amount $${amtLoad.toFixed(2)} for $${cov.toLocaleString()}`;
}

/* Wire inputs */
function wireInputs(){
  document.body.addEventListener('input', (e)=>{
    const t = e.target;
    if(!(t instanceof HTMLElement)) return;
    if(t.id === 'pi-ssn'){ t.value = maskSSN(t.value); }
    if(t.id === 'routing'){ t.value = onlyDigits(t.value,9); t.classList.toggle('error', !!t.value && !isABA(t.value)); }
    if(t.id === 'account'){ t.value = onlyDigits(t.value,17); t.classList.toggle('error', !!t.value && (t.value.length<4 || t.value.length>17)); }
    if(t.id === 'amount' || t.id === 'coverage'){ t.value = maskCurrency(t.value); }
    if(t.id === 'coverage' || t.id === 'pi-age' || t.id === 'age'){ updateQuote(); }
    autosave();
  });

  $('#btn-find-products')?.addEventListener('click', ()=>{
    $('#product-list')?.removeAttribute('hidden');
  });
}

/* Navigation */
function wireNav(){
  window.addEventListener('hashchange', ()=>{
    const target = location.hash.replace('#/','') || 'home';
    to(target);
    updateQuote();
  });
  const initial = location.hash.replace('#/','') || 'home';
  to(initial);
}

/* Boot */
document.addEventListener('DOMContentLoaded', ()=>{
  $('#year').textContent = new Date().getFullYear();
  wireOrientationGuard();
  pwa();
  restoreForm();
  wireInputs();
  wireNav();
  updateQuote();
});
