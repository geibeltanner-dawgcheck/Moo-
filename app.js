/* DAWGCHECK Training Simulator – Polished Replica (2025-08-25)
   Improvements:
   - Sidebar status badges (locks, sent, totals, premium)
   - Error summary banner + scroll to first invalid
   - Scroll to step on navigation
   - LocalStorage autosave/restore
   - Service fixes and small UX polish
*/

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

/* ---------- Simple View Router (Login -> App) ---------- */
(function initViews(){
  const loginView = document.querySelector('[data-view="login"]');
  const appView = document.querySelector('[data-view="home"]');
  const loginBtn = $('#btn-login');

  function gotoApp(first, last){
    const name = [first, last].filter(Boolean).join(' ') || 'User';
    const welcomeEl = $('#welcome-text');
    if (welcomeEl) welcomeEl.textContent = `Welcome ${name}`;
    if (loginView) loginView.hidden = true;
    if (appView) appView.hidden = false;
    restoreState();
    setActiveStep(state.currentIndex || 0);
    updateAllStatuses();
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const first = ($('#login-first')?.value || '').trim();
      const last  = ($('#login-last')?.value || '').trim();
      gotoApp(first, last);
    });
  } else {
    gotoApp('', '');
  }
})();

/* ---------- State ---------- */
const state = {
  stepOrder: [
    'producer','insured','confirm-id','hipaa-lock','hipaa-method',
    'insured-continued','history','plan','pre-approval','underwriting',
    'beneficiaries','premium','billing','validate-lock','attachments',
    'post-email','signature-method','producer-statement','welcome-consent',
    'apply-esign-producer'
  ],
  currentIndex: 0,
  locked: { hipaa: false, app: false },
  uwComplete: false,
  signatures: { hipaaSent: false, appSent: false },
  beneficiaries: [],
  files: [],
  premium: { annual: 0, semi: 0, quarter: 0, month: 0 }
};

/* ---------- Helpers ---------- */
const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL","GA","HI","IA","ID","IL","IN","KS","KY","LA","MA","MD","ME","MI","MN","MO","MS","MT","NC","ND","NE","NH","NJ","NM","NV","NY","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VA","VT","WA","WI","WV","WY"
];
function fillStateSelect(sel){
  if (!sel) return;
  sel.innerHTML = '<option value="">Please select…</option>' + STATES.map(s=>`<option value="${s}">${s}</option>`).join('');
}
['#prod-state','#pi-state','#pre-state','#signed-state'].forEach(id=>fillStateSelect($(id)));
$('#year') && ($('#year').textContent = new Date().getFullYear());

function money(n){ return `$${(n||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`; }
function parseMoney(s){ return parseFloat(String(s||'').replace(/[^\d.]/g,''))||0; }
function calcAgeFromDOB(dob){
  const m = String(dob||'').match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if(!m) return '';
  let [_,MM,DD,YYYY] = m; MM=+MM; DD=+DD; YYYY=+YYYY; if(YYYY<100) YYYY+=2000;
  const b = new Date(YYYY,MM-1,DD); if(isNaN(b)) return '';
  const t = new Date();
  let age = t.getFullYear()-b.getFullYear();
  if (t.getMonth()<b.getMonth() || (t.getMonth()===b.getMonth() && t.getDate()<b.getDate())) age--;
  return age>=0?String(age):'';
}

/* Masks */
document.addEventListener('input', (e)=>{
  const t = e.target;
  if(!(t instanceof HTMLInputElement)) return;

  if (t.classList.contains('mask-ssn')) {
    let v = t.value.replace(/\D/g,'').slice(0,9);
    if (v.length>5) v = `${v.slice(0,3)}-${v.slice(3,5)}-${v.slice(5)}`;
    else if (v.length>3) v = `${v.slice(0,3)}-${v.slice(3)}`;
    t.value = v;
  }
  if (t.classList.contains('mask-phone')) {
    let v = t.value.replace(/\D/g,'').slice(0,10);
    if (v.length>6) v = `(${v.slice(0,3)}) ${v.slice(3,6)}-${v.slice(6)}`;
    else if (v.length>3) v = `(${v.slice(0,3)}) ${v.slice(3)}`;
    t.value = v;
  }
  if (t.classList.contains('mask-4pin')) t.value = t.value.replace(/\D/g,'').slice(0,4);
  if (t.classList.contains('mask-routing')) t.value = t.value.replace(/\D/g,'').slice(0,9);
  if (t.classList.contains('mask-account')) t.value = t.value.replace(/\D/g,'').slice(0,17);
  if (t.classList.contains('mask-money')) {
    let v = t.value.replace(/[^\d]/g,'');
    if (v) v = `$${parseInt(v,10).toLocaleString()}`;
    t.value = v;
  }
  if (t.classList.contains('mask-dob')) {
    let v = t.value.replace(/\D/g,'').slice(0,8);
    if (v.length>4) v = `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
    else if (v.length>2) v = `${v.slice(0,2)}/${v.slice(2)}`;
    t.value = v;
  }
});

/* ---------- Stepper Navigation ---------- */
const stepper = $('#step-list');
const stepViews = $$('.step-view');
function stepKeyAt(i){ return state.stepOrder[i]; }

function setActiveStep(i){
  state.currentIndex = i;
  $$('.step', stepper).forEach((li, idx)=>{
    li.classList.toggle('is-active', idx===i);
    li.classList.toggle('is-done', idx<i);
    li.setAttribute('aria-selected', String(idx===i));
    li.tabIndex = idx===i ? 0 : -1;
    const dot = $('.dot', li);
    if (dot) dot.textContent = idx<i ? '✓' : String(idx+1);
  });
  stepViews.forEach(sec=>{
    const show = sec.dataset.step === stepKeyAt(i);
    sec.hidden = !show;
  });
  $('#btn-back').disabled = i===0;
  $('#btn-next').textContent = (i === state.stepOrder.length-1) ? 'Finish' : 'Next ▸';
  document.querySelector('[data-view="home"]')?.scrollIntoView({behavior:'smooth', block:'start'});
  saveState();
  updateAllStatuses();
  const ge = $('#global-error'); if (ge) ge.classList.add('hidden');
}
setActiveStep(0);

stepper.addEventListener('click', (e)=>{
  const li = e.target.closest('.step');
  if(!li) return;
  const idx = $$('.step', stepper).indexOf(li);
  if (idx<=state.currentIndex && !li.classList.contains('is-locked')) setActiveStep(idx);
});
stepper.addEventListener('keydown', (e)=>{
  if (!e.target.classList.contains('step')) return;
  const steps = $$('.step', stepper);
  const i = steps.indexOf(e.target);
  if (e.key==='ArrowDown' && i<steps.length-1) { steps[i+1].focus(); e.preventDefault(); }
  if (e.key==='ArrowUp' && i>0) { steps[i-1].focus(); e.preventDefault(); }
  if ((e.key==='Enter'||e.key===' ') && i<=state.currentIndex) { setActiveStep(i); e.preventDefault(); }
});

/* ---------- Navigation Buttons ---------- */
$('#btn-next').addEventListener('click', ()=>{
  if (!validateCurrentStep()) return;
  const last = state.stepOrder.length-1;
  if (state.currentIndex < last) setActiveStep(state.currentIndex+1);
  else $('#submit-messages').innerHTML = `<div class="alert success">All steps completed.</div>`;
});
$('#btn-back').addEventListener('click', ()=>{ if (state.currentIndex>0) setActiveStep(state.currentIndex-1); });

/* ---------- Sidebar mini statuses ---------- */
function setStatus(stepKey, text, color='var(--muted)'){
  const el = $(`#st-${stepKey.replace(/[^a-z0-9\-]/gi,'')}`);
  if (!el) return;
  el.textContent = text || '';
  el.style.color = color;
}
function updateAllStatuses(){
  // Producer -> no status
  const clientName = `${$('#pi-first')?.value||''} ${$('#pi-last')?.value||''}`.trim();
  setStatus('insured', clientName ? clientName : '');
  setStatus('hipaa-lock', state.locked.hipaa ? '🔒 Locked' : '');
  setStatus('hipaa-method', state.signatures.hipaaSent ? '✉️ Sent' : '');
  setStatus('underwriting', state.uwComplete ? '✓ Completed' : '');
  // Beneficiaries total
  const total = state.beneficiaries.reduce((s,b)=>s+(parseInt(b.share||'0',10)||0),0);
  if (total>0) setStatus('beneficiaries', `${total}%`, total===100?'#065f46':'#b91c1c'); else setStatus('beneficiaries','');
  // Premium
  if (state.premium.month>0) setStatus('premium', money(state.premium.month), '#0b5d11'); else setStatus('premium','');
  // App lock
  setStatus('validate-lock', state.locked.app ? '🔒 Locked' : '');
  // Signature method
  setStatus('signature-method', state.signatures.appSent ? '✉️ Sent' : '');
}

/* ---------- Case Header dynamic ---------- */
function updateCaseHeader(){
  const client = `${$('#pi-first')?.value || '—'} ${$('#pi-last')?.value || ''}`.trim() || '—';
  $('#case-client').textContent = `Client: ${client}`;
  const plan = $('#plan-select')?.value || '—';
  $('#case-product').textContent = `Product: ${plan}`;
  $('#summary-plan') && ($('#summary-plan').value = plan);
  $('#summary-state') && ($('#summary-state').value = $('#pi-state')?.value || '');
  $('#summary-age') && ($('#summary-age').value = $('#pi-age')?.value || '');
  $('#summary-gender') && ($('#summary-gender').value = $('#pi-gender')?.value || '');
  $('#summary-face') && ($('#summary-face').value = $('#face-amount')?.value || '');
  updateAllStatuses();
  saveState();
}
document.addEventListener('input', (e)=>{
  if (['pi-first','pi-last','plan-select','pi-state','pi-gender','face-amount'].includes(e.target.id)) updateCaseHeader();
});

/* ---------- Field Logic ---------- */
$('#pi-dob')?.addEventListener('input', e=>{
  const age = calcAgeFromDOB(e.target.value);
  const ageEl = $('#pi-age'); if (ageEl) ageEl.value = age;
  updateCaseHeader();
});

/* ---------- HIPAA Lock ---------- */
$('#btn-lock-hipaa')?.addEventListener('click', ()=>{
  state.locked.hipaa = true;
  $('#hipaa-lock-msg').hidden = false;
  $('#hipaa-unlocked-msg').hidden = true;
  $('#btn-lock-hipaa').hidden = true;
  $('#btn-unlock-hipaa').hidden = false;
  updateAllStatuses();
  saveState();
});
$('#btn-unlock-hipaa')?.addEventListener('click', ()=>{
  state.locked.hipaa = false;
  $('#hipaa-lock-msg').hidden = true;
  $('#hipaa-unlocked-msg').hidden = false;
  $('#btn-lock-hipaa').hidden = false;
  $('#btn-unlock-hipaa').hidden = true;
  updateAllStatuses();
  saveState();
});

/* ---------- HIPAA Method Send ---------- */
$('#btn-hipaa-send')?.addEventListener('click', ()=>{
  const phone = $('#hipaa-phone')?.value.trim();
  const pin = $('#hipaa-pin')?.value.trim();
  if (!phone || (pin||'').length!==4) { $('#hipaa-send-status').textContent = 'Enter a valid phone and 4-digit PIN.'; return; }
  state.signatures.hipaaSent = true;
  $('#hipaa-send-status').textContent = 'Text sent from 1‑844‑307‑6442 with link to sign.';
  updateAllStatuses();
  saveState();
});

/* ---------- Policies Tables ---------- */
function policyRow(id, carrier=false){
  return `<tr data-id="${id}">
    <td><input ${carrier?'value="Mutual of Omaha"':''} /></td>
    <td><input /></td>
    <td><input class="mask-money" placeholder="$20,000" /></td>
    <td>${carrier?'<select><option>Yes</option><option>No</option></select>':'<select><option>Life</option><option>Annuity</option></select>'}</td>
    <td><button type="button" class="btn btn--ghost" data-remove>Remove</button></td>
  </tr>`;
}
$('#btn-add-carrier-policy')?.addEventListener('click', ()=>{ $('#carrier-policies').insertAdjacentHTML('beforeend', policyRow(randId(), true)); saveState(); });
$('#btn-add-other-policy')?.addEventListener('click', ()=>{ $('#other-policies').insertAdjacentHTML('beforeend', policyRow(randId(), false)); saveState(); });
['carrier-policies','other-policies'].forEach(id=>{
  const el = $('#'+id);
  el?.addEventListener('click', e=>{ if (e.target.matches('[data-remove]')) {e.target.closest('tr').remove(); saveState();} });
});

/* ---------- Beneficiaries ---------- */
function renderBeneTable(){
  const tbody = $('#bene-body'); if (!tbody) return;
  tbody.innerHTML = '';
  let total = 0;
  state.beneficiaries.forEach(b=>{
    total += Number(b.share||0);
    tbody.insertAdjacentHTML('beforeend', `
      <tr data-id="${b.id}">
        <td><input value="${b.name||''}" data-bene="name" /></td>
        <td><input value="${b.rel||''}" data-bene="rel" /></td>
        <td>
          <select data-bene="type">
            <option ${b.type==='Primary'?'selected':''}>Primary</option>
            <option ${b.type==='Contingent'?'selected':''}>Contingent</option>
          </select>
        </td>
        <td style="max-width:110px"><input inputmode="numeric" value="${b.share||''}" data-bene="share" /></td>
        <td><button type="button" class="btn btn--ghost" data-remove>Remove</button></td>
      </tr>`);
  });
  const totalEl = $('#bene-total');
  if (totalEl) {
    totalEl.textContent = `Total: ${total}%`;
    totalEl.style.color = (total===100 && state.beneficiaries.some(b=>b.type==='Primary')) ? '#065f46' : '#b91c1c';
  }
  updateAllStatuses();
  saveState();
}
function randId(){ return Math.random().toString(36).slice(2,9); }
$('#btn-add-bene')?.addEventListener('click', ()=>{
  state.beneficiaries.push({id:randId(), name:'', rel:'', type:'Primary', share:''});
  renderBeneTable();
});
$('#bene-body')?.addEventListener('click', e=>{
  if (e.target.matches('[data-remove]')) {
    const id = e.target.closest('tr').dataset.id;
    state.beneficiaries = state.beneficiaries.filter(b=>b.id!==id);
    renderBeneTable();
  }
});
$('#bene-body')?.addEventListener('input', e=>{
  const tr = e.target.closest('tr'); if(!tr) return;
  const id = tr.dataset.id;
  const key = e.target.dataset.bene;
  const bene = state.beneficiaries.find(b=>b.id===id);
  if (!bene) return;
  bene[key] = e.target.value;
  if (key==='share') bene.share = String(parseInt(e.target.value.replace(/\D/g,''))||'');
  renderBeneTable();
});

/* ---------- Pre-Approval products ---------- */
const PRODUCT_MATRIX = {
  "AL|Term Life":[ "Term Life Express Application","Term Life Answers – Full Application","Term Life Express Point of Sale Decision" ],
  "AL|Whole Life":[ "Whole Life Express Application","Living Promise Level Express","Living Promise Graded Express" ],
  "AL|Indexed Universal Life":[ "Indexed Universal Life Express Application","IUL Express with Easy Solve" ],
  "CA|Term Life":[ "Term Life Express Application","Term Life Answers – Full Application" ],
  "CA|Whole Life":[ "Whole Life Express Application","Living Promise Level Express" ],
  "CA|Indexed Universal Life":[ "Indexed Universal Life Express Application","IUL Express with Easy Solve" ],
  "FL|Term Life":[ "Term Life Express Application","Term Life Answers – Full Application","Term Life Express Point of Sale Decision" ],
  "FL|Whole Life":[ "Whole Life Express Application","Living Promise Level Express","Living Promise Graded Express" ],
  "FL|Indexed Universal Life":[ "Indexed Universal Life Express Application","IUL Express with Easy Solve" ],
  "GA|Term Life":[ "Term Life Express Application","Term Life Answers – Full Application" ],
  "GA|Whole Life":[ "Whole Life Express Application","Living Promise Level Express" ],
  "GA|Indexed Universal Life":[ "Indexed Universal Life Express Application","IUL Express with Easy Solve" ],
  "NE|Term Life":[ "Term Life Express Application","Term Life Answers – Full Application","Term Life Express Point of Sale Decision" ],
  "NE|Whole Life":[ "Whole Life Express Application","Living Promise Level Express","Living Promise Graded Express" ],
  "NE|Indexed Universal Life":[ "Indexed Universal Life Express Application","IUL Express with Easy Solve" ],
  "TX|Term Life":[ "Term Life Express Application","Term Life Answers – Full Application","Term Life Express Point of Sale Decision" ],
  "TX|Whole Life":[ "Whole Life Express Application","Living Promise Level Express" ],
  "TX|Indexed Universal Life":[ "Indexed Universal Life Express Application","IUL Express with Easy Solve" ]
};
$('#btn-find-products')?.addEventListener('click', ()=>{
  const s = $('#pre-state').value;
  const t = $('#pre-product-type').value;
  const list = PRODUCT_MATRIX[`${s}|${t}`] || [];
  const sel = $('#pre-products');
  sel.innerHTML = list.map(p=>`<option>${p}</option>`).join('') || '<option disabled>No products found</option>';
  setStatus('pre-approval', list.length? `${list.length} found` : 'None', list.length?'#0b5d11':'#b91c1c');
  saveState();
});

/* ---------- Medical Questionnaire ---------- */
$('#btn-complete-medical')?.addEventListener('click', ()=>{
  $('#medical-status').textContent = 'Processing questionnaire responses...';
  setTimeout(()=>{
    state.uwComplete = true;
    $('#uw-success').hidden = false;
    $('#medical-status').textContent = 'Questionnaire completed.';
    updateAllStatuses();
    saveState();
  }, 1000);
});

// Show product-specific medical questions based on selected plan
function updateMedicalQuestions() {
  const selectedPlan = $('#plan-select')?.value || '';
  const termQuestions = $('#term-questions');
  const wholeLifeQuestions = $('#whole-life-questions');
  const iulQuestions = $('#iul-questions');
  
  // Hide all product-specific questions first
  if (termQuestions) termQuestions.style.display = 'none';
  if (wholeLifeQuestions) wholeLifeQuestions.style.display = 'none';
  if (iulQuestions) iulQuestions.style.display = 'none';
  
  // Show relevant questions based on product type
  if (selectedPlan.includes('Term Life')) {
    if (termQuestions) termQuestions.style.display = 'block';
  } else if (selectedPlan.includes('Whole Life') || selectedPlan.includes('Living Promise')) {
    if (wholeLifeQuestions) wholeLifeQuestions.style.display = 'block';
  } else if (selectedPlan.includes('Universal Life') || selectedPlan.includes('IUL')) {
    if (iulQuestions) iulQuestions.style.display = 'block';
  }
}

// Update medical questions when plan selection changes
$('#plan-select')?.addEventListener('change', updateMedicalQuestions);

// Initialize medical questions on page load
document.addEventListener('DOMContentLoaded', ()=>{
  updateMedicalQuestions();
  
  // Handle pre-selected product from landing pages
  const selectedProduct = sessionStorage.getItem('selectedProduct');
  const applicantName = sessionStorage.getItem('applicantName');
  
  if (selectedProduct && $('#plan-select')) {
    $('#plan-select').value = selectedProduct;
    updateMedicalQuestions(); // Update questions based on pre-selected product
  }
  
  if (applicantName) {
    const [first, ...lastParts] = applicantName.split(' ');
    const last = lastParts.join(' ');
    if ($('#login-first')) $('#login-first').value = first;
    if ($('#login-last')) $('#login-last').value = last;
  }
});

/* ---------- Premium Calculation ---------- */
$('#btn-calc-premium')?.addEventListener('click', ()=>{
  const face = parseMoney($('#face-amount')?.value || $('#summary-face')?.value);
  const age = parseInt($('#pi-age')?.value||'45',10);
  const tobacco = $('#summary-tobacco')?.value === 'Tobacco';
  const selectedPlan = $('#plan-select')?.value || '';
  
  // Product-specific rate calculation
  let baseRate;
  if (selectedPlan.includes('Term Life')) {
    // Term life rates - lowest cost
    baseRate = Math.max(0.60, Math.min(1.50, 0.75 + (age-35)*0.015 + (tobacco?0.35:0)));
  } else if (selectedPlan.includes('Whole Life') || selectedPlan.includes('Living Promise')) {
    // Whole life rates - higher cost, builds cash value
    baseRate = Math.max(1.20, Math.min(3.50, 1.80 + (age-35)*0.025 + (tobacco?0.55:0)));
  } else if (selectedPlan.includes('Universal Life') || selectedPlan.includes('IUL')) {
    // IUL rates - moderate cost, investment component
    baseRate = Math.max(0.95, Math.min(2.80, 1.35 + (age-35)*0.020 + (tobacco?0.45:0)));
  } else {
    // Default calculation
    baseRate = Math.max(0.75, Math.min(1.85, 0.9 + (age-35)*0.02 + (tobacco?0.25:0)));
  }
  
  const annual = (face/1000) * (baseRate*12*1.15);
  const monthly = annual/12;
  const semi = annual/2 * 1.02;
  const quarter = annual/4 * 1.03;
  state.premium = { annual, semi, quarter, month: monthly };
  $('#prem-annual').textContent = money(annual);
  $('#prem-semi').textContent = money(semi);
  $('#prem-quarter').textContent = money(quarter);
  $('#prem-month').textContent = money(monthly);
  updateAllStatuses();
  saveState();
});

/* ---------- Validate & Lock (App) ---------- */
$('#btn-lock-app')?.addEventListener('click', ()=>{
  state.locked.app = true;
  $('#lock-status').hidden = false;
  $('#btn-lock-app').hidden = true;
  $('#btn-unlock-app').hidden = false;
  setFormEnabled(false);
  updateAllStatuses();
  saveState();
});
$('#btn-unlock-app')?.addEventListener('click', ()=>{
  state.locked.app = false;
  $('#lock-status').hidden = true;
  $('#btn-lock-app').hidden = false;
  $('#btn-unlock-app').hidden = true;
  setFormEnabled(true);
  updateAllStatuses();
  saveState();
});
function setFormEnabled(enabled){
  $$('#wizard input, #wizard select, #wizard textarea').forEach(el=>{
    if (el.closest('[data-step="validate-lock"]')) return;
    el.disabled = !enabled;
  });
}

/* ---------- Attachments ---------- */
$('#btn-upload')?.addEventListener('click', ()=>{
  const files = $('#attach-input').files;
  if (!files || !files.length) return;
  for (const f of files) state.files.push({id:randId(), name:f.name, size:f.size});
  renderFiles();
  $('#attach-input').value = '';
  setStatus('attachments', `${state.files.length} file${state.files.length!==1?'s':''}`, '#0b5d11');
  saveState();
});
function renderFiles(){
  const ul = $('#attach-list'); if (!ul) return;
  ul.innerHTML = '';
  state.files.forEach(f=>{
    const li = document.createElement('li');
    li.innerHTML = `<span>${f.name} — ${(f.size/1024).toFixed(1)} KB</span><button type="button" class="btn btn--ghost" data-id="${f.id}">Remove</button>`;
    ul.appendChild(li);
  });
}
$('#attach-list')?.addEventListener('click', (e)=>{
  if (e.target.matches('button[data-id]')) {
    const id = e.target.dataset.id;
    state.files = state.files.filter(x=>x.id!==id);
    renderFiles();
    setStatus('attachments', state.files.length? `${state.files.length} files` : '', state.files.length?'#0b5d11':'var(--muted)');
    saveState();
  }
});

/* ---------- Signature Method Send ---------- */
$('#btn-send-sign')?.addEventListener('click', ()=>{
  const phone = $('#sig-phone')?.value.trim();
  const pin = $('#sig-pin')?.value.trim();
  if (!phone || (pin||'').length!==4) { $('#sig-send-status').textContent = 'Enter a valid phone and 4-digit PIN.'; return; }
  state.signatures.appSent = true;
  $('#sig-send-status').textContent = 'Signature links sent. You will receive an alert when completed.';
  updateAllStatuses();
  saveState();
});

/* ---------- Apply eSignature / Submit ---------- */
$('#btn-apply-esign')?.addEventListener('click', ()=>{ appendSubmitMsg('Your producer eSignature has been captured.', 'success'); });
$('#btn-print-app')?.addEventListener('click', ()=>{
  appendSubmitMsg('Print job queued for wet signature.', 'info');
  window.print();
});
$('#btn-submit-app')?.addEventListener('click', ()=>{
  const pol = 'BUS' + Math.floor(100000 + Math.random()*899999);
  appendSubmitMsg('Thank you for submitting your Electronic Application!', 'success');
  appendSubmitMsg('Application has been referred to Underwriting for further review (1–2 business days).', 'info');
  appendSubmitMsg(`Policy Number: ${pol}`, 'info');
});
function appendSubmitMsg(text, type){
  const el = document.createElement('div');
  el.className = 'alert ' + (type==='success'?'success':type==='error'?'error':'info');
  el.textContent = text;
  $('#submit-messages')?.appendChild(el);
}

/* ---------- Validation per Step ---------- */
function validateCurrentStep(){
  const key = state.stepOrder[state.currentIndex];
  const view = $(`.step-view[data-step="${key}"]`);
  const required = $$('input[required], select[required], textarea[required]', view);
  let ok = true;
  let messages = [];

  required.forEach(f=>{
    const good = !!String(f.value).trim();
    f.classList.toggle('error', !good);
    if (!good) {
      ok = false;
      const label = f.closest('.field')?.querySelector('label')?.textContent?.replace('*','').trim() || f.id;
      messages.push(`${label} is required`);
    }
  });

  if (key==='insured') {
    const ageEl = $('#pi-age');
    const age = calcAgeFromDOB($('#pi-dob')?.value);
    if (ageEl) ageEl.value = age;
    if (!age) { ok=false; $('#pi-dob').classList.add('error'); messages.push('Valid Date of Birth required'); }
  }
  if (key==='hipaa-lock' && !state.locked.hipaa) { ok = false; messages.push('Lock HIPAA data to continue'); }
  if (key==='beneficiaries') {
    const total = state.beneficiaries.reduce((s,b)=>s+(parseInt(b.share||'0',10)||0),0);
    if (total!==100 || !state.beneficiaries.some(b=>b.type==='Primary')) {
      ok = false; messages.push('Beneficiary shares must total 100% and include at least one Primary');
    }
  }
  if (key==='premium') {
    if (!state.premium.month || parseMoney($('#face-amount')?.value)<=0) { ok = false; messages.push('Calculate premium before continuing'); }
  }
  if (key==='validate-lock' && !state.locked.app) { ok = false; messages.push('Application must be locked before signatures'); }
  if (key==='signature-method' && !state.signatures.appSent) { ok = false; messages.push('Send signature links before continuing'); }
  if (key==='welcome-consent' && !$('#welcome-consent-check')?.checked) { ok = false; messages.push('Acknowledge welcome consent'); }

  if (!ok) {
    showGlobalError(messages);
    // scroll to first error input if exists
    const firstError = view.querySelector('.error');
    firstError?.scrollIntoView({behavior:'smooth', block:'center'});
  } else {
    $('#global-error')?.classList.add('hidden');
  }
  return ok;
}
function showGlobalError(messages){
  const ge = $('#global-error'); if (!ge) return;
  ge.innerHTML = 'Please address the following:<ul style="margin:.4rem 0 .2rem 1rem">' + messages.map(m=>`<li>${m}</li>`).join('') + '</ul>';
  ge.classList.remove('hidden');
}
function appendBanner(view, msg, type){
  let banner = $('.inline-banner', view);
  if (!banner) { banner = document.createElement('div'); banner.className = 'alert inline-banner'; view.prepend(banner); }
  banner.className = `alert inline-banner ${type==='error'?'error':type==='warn'?'warn':'info'}`;
  banner.textContent = msg;
}

/* ---------- Case Actions menu ---------- */
$('#btn-case-actions')?.addEventListener('click', ()=>{
  const menu = $('#case-actions-menu');
  menu.hidden = !menu.hidden;
});
document.addEventListener('click', (e)=>{
  if (!e.target.closest('#btn-case-actions') && !e.target.closest('#case-actions-menu')) {
    const menu = $('#case-actions-menu'); if (menu) menu.hidden = true;
  }
});

/* ---------- Auto-populate Premium Summary from Plan step ---------- */
['face-amount','pi-state','pi-gender'].forEach(id=>{
  const el = $('#'+id);
  el?.addEventListener('input', ()=>{
    $('#summary-face') && ($('#summary-face').value = $('#face-amount')?.value || '');
    $('#summary-state') && ($('#summary-state').value = $('#pi-state')?.value || '');
    $('#summary-gender') && ($('#summary-gender').value = $('#pi-gender')?.value || '');
    saveState();
  });
});

/* ---------- Persistence ---------- */
const STORAGE_KEY = 'dawgcheck-app-state-v2';
function saveState(){
  try{
    const values = {};
    $$('#wizard input, #wizard select, #wizard textarea').forEach(el=>{
      if (!el.id) return;
      if (el.type==='radio' || el.type==='checkbox') {
        values[el.id || el.name + ':' + el.value] = el.checked;
      } else {
        values[el.id] = el.value;
      }
    });
    const payload = {
      values,
      state,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }catch{}
}
function restoreState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (payload?.values) {
      Object.entries(payload.values).forEach(([id,val])=>{
        const el = document.getElementById(id) || document.querySelector(`[name="${id.split(':')[0]}"][value="${id.split(':')[1]}"]`);
        if (!el) return;
        if (el.type==='radio' || el.type==='checkbox') el.checked = !!val;
        else el.value = val;
      });
    }
    if (payload?.state) {
      Object.assign(state, payload.state);
      // Re-render dynamic bits
      renderFiles();
      renderBeneTable();
    }
  }catch{}
}

/* ---------- Initial set ---------- */
updateCaseHeader();
renderBeneTable();
updateAllStatuses();