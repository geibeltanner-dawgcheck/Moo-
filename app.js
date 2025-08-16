/* MOO Trainer – single-page stepper */
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => [...ctx.querySelectorAll(sel)];

const STEPS = [
  'step-0','step-1','step-2','step-3','step-4','step-5','step-6','step-7',
  'step-8','step-9','step-10','step-11','step-12','step-13','step-14',
  'step-15','step-16','step-17'
];

const LIMITS = { TLE: 300000, IULE: 300000, WLE: 50000 };

const state = {
  current: 0,
  data: {}
};

const el = {
  back: $('#backBtn'),
  next: $('#nextBtn'),
  label: $('#stepLabel'),
  steps: STEPS.map(id => $('#'+id)),
  caseForm: $('#caseForm'),
  planForm: $('#planForm'),
  maxCoverageNote: $('#maxCoverageNote'),
  summaryPI: $('#summaryPI'),
  summaryPlan: $('#summaryPlan'),
  modes: $('#modes'),
  uwQuestions: $('#uwQuestions'),
  rowDialog: $('#rowDialog'),
  rowForm: $('#rowForm')
};

// basic nav
function show(i){
  state.current = i;
  el.steps.forEach((s,idx) => s.hidden = idx !== i);
  const label = el.steps[i].dataset.label || 'MOO';
  el.label.textContent = label;
  el.back.disabled = i === 0;
  el.next.textContent = i === STEPS.length-1 ? 'Finish' : 'Next →';
  // on-enter hooks per step
  if (STEPS[i] === 'step-8') updateMaxCoverage();
  if (STEPS[i] === 'step-10') buildUW();
  if (STEPS[i] === 'step-12') fillSummaries();
}

function next(){
  if (!validateStep()) return;
  if (state.current < STEPS.length-1) show(state.current+1);
}
function back(){ if (state.current>0) show(state.current-1); }

el.next.addEventListener('click', next);
el.back.addEventListener('click', back);
$$('[data-action="startDemo"]').forEach(b=>b.addEventListener('click',()=>show(1)));
$$('[data-action="goto"]').forEach(b=>b.addEventListener('click',()=>show(STEPS.indexOf(b.dataset.target))));

// small helpers
function flash(elm){ elm.style.outline='2px solid #ffb3b3'; setTimeout(()=>elm.style.outline='none', 1200); }

// validation minimal per step
function validateStep(){
  switch(STEPS[state.current]){
    case 'step-2': {
      const f = el.caseForm;
      if(!f.reportValidity()) return false;
      state.data.product = f.product.value;
      state.data.state = f.state.value;
      state.data.pi = {
        first: f.pi_first.value.trim(),
        last:  f.pi_last.value.trim(),
        dob:   f.pi_dob.value,
        age:   +f.pi_age.value,
        gender:f.pi_gender.value
      };
      return true;
    }
    case 'step-3': {
      const f = $('#producerForm');
      if(!f.reportValidity()) return false;
      state.data.producer = Object.fromEntries(new FormData(f).entries());
      return true;
    }
    case 'step-4': {
      const f = $('#piForm');
      if(!f.reportValidity()) return false;
      Object.assign(state.data.pi, Object.fromEntries(new FormData(f).entries()));
      return true;
    }
    case 'step-6': {
      const f = $('#piContForm');
      if(!f.reportValidity()) return false;
      Object.assign(state.data.pi, Object.fromEntries(new FormData(f).entries()));
      return true;
    }
    case 'step-7': {
      // store history items
      state.data.history = collectRows('#historyList');
      return true;
    }
    case 'step-8': {
      const f = el.planForm;
      if (!f.reportValidity()) return false;
      const face = +f.face.value;
      const lim = LIMITS[state.data.product] || 0;
      if (face<=0 || face>lim){
        alert(`Enter face amount ≤ ${lim.toLocaleString()}.`);
        flash(f.face); return false;
      }
      state.data.plan = { face };
      return true;
    }
    case 'step-9': return true; // favorable page
    case 'step-10': {
      // collect underwriting answers
      const answers = {};
      $$('#uwQuestions input[type=radio]:checked').forEach(r=>{
        const k = r.name; answers[k] = r.value;
      });
      state.data.uw = answers;
      return true;
    }
    case 'step-11': {
      state.data.beneficiaries = collectRows('#beneList');
      return true;
    }
    case 'step-12': {
      // mode selection saved
      const mode = $('input[name="mode"]:checked')?.value || 'MONTHLY';
      state.data.mode = mode;
      return true;
    }
    case 'step-13': {
      state.data.ach = Object.fromEntries(new FormData($('#achForm')).entries());
      return true;
    }
    default: return true;
  }
}

function updateMaxCoverage(){
  const p = state.data.product;
  const lim = LIMITS[p] || 0;
  el.maxCoverageNote.textContent = `Max coverage allowed: ${lim.toLocaleString()}`;
}

// Lock data (simulated)
$$('[data-action="lockData"]').forEach(b=>b.addEventListener('click', next));

// ==== Underwriting questions (training set, product-specific) ====
const UW = {
  TLE: [
    {k:'t1', q:'In the last 2 years, diagnosed/treated for cancer, heart attack, stroke, or TIA?', y='Yes', n='No'},
    {k:'t2', q:'Currently hospitalized, in a nursing facility, or receiving hospice care?', y:'Yes', n:'No'},
    {k:'t3', q:'Have you used tobacco/nicotine in the last 12 months?', y:'Yes', n:'No'}
  ],
  WLE: [
    {k:'w1', q:'In the last 12 months, advised to have tests/surgery not yet completed?', y:'Yes', n:'No'},
    {k:'w2', q:'Have you been declined for life insurance in the past 2 years?', y:'Yes', n:'No'},
    {k:'w3', q:'Use of oxygen equipment to assist with breathing?', y:'Yes', n:'No'}
  ],
  IULE: [
    {k:'u1', q:'In the past 5 years, diagnosed/treated for diabetes with complications, cancer, or heart disease?', y:'Yes', n:'No'},
    {k:'u2', q:'Any DUI or felony conviction in the past 5 years?', y:'Yes', n:'No'},
    {k:'u3', q:'Any pending surgery or medical tests?', y:'Yes', n:'No'}
  ]
};

function buildUW(){
  const list = UW[state.data.product] || [];
  el.uwQuestions.innerHTML = list.map(it => `
    <fieldset class="inline">
      <legend>${it.q}</legend>
      <label><input type="radio" name="${it.k}" value="Yes"> Yes</label>
      <label><input type="radio" name="${it.k}" value="No"> No</label>
    </fieldset>
  `).join('') || '<div class="note">No questions configured.</div>';
}

// ==== Beneficiaries & History rows (modal) ====
function openRowDialog(prefill={}){
  el.rowForm.reset();
  Object.entries(prefill).forEach(([k,v])=>{
    const f = el.rowForm.elements[k]; if (f) f.value = v;
  });
  return el.rowDialog.showModal();
}
function addRow(listSel, row){
  const host = $(listSel);
  const item = document.createElement('div');
  item.className = 'rowline';
  item.innerHTML = `
    <div class="summary">
      <strong>Name</strong><span>${row.name}</span>
      <strong>Relationship</strong><span>${row.rel}</span>
      <strong>% Share</strong><span>${row.share}</span>
    </div>
    <div style="display:flex; gap:8px; margin:6px 0 14px;">
      <button class="secondary" data-edit>Edit</button>
      <button data-del>Delete</button>
    </div>
  `;
  item.querySelector('[data-edit]').onclick = async () => {
    openRowDialog(row);
    el.rowDialog.addEventListener('close', () => {
      if (el.rowDialog.returnValue === 'ok'){
        const data = Object.fromEntries(new FormData(el.rowForm).entries());
        row.name=data.name; row.rel=data.rel; row.share=data.share;
        item.querySelector('.summary').innerHTML = `
          <strong>Name</strong><span>${row.name}</span>
          <strong>Relationship</strong><span>${row.rel}</span>
          <strong>% Share</strong><span>${row.share}</span>`;
      }
    }, {once:true});
  };
  item.querySelector('[data-del]').onclick = () => item.remove();
  host.appendChild(item);
}
function collectRows(sel){
  return $$(sel+' .rowline').map(line=>{
    const parts = [...line.querySelectorAll('.summary span')].map(s=>s.textContent.trim());
    return { name: parts[0], rel: parts[1], share: parts[2] };
  });
}

$('[data-action="addBene"]').addEventListener('click', async () => {
  openRowDialog();
  el.rowDialog.addEventListener('close', () => {
    if (el.rowDialog.returnValue === 'ok'){
      const data = Object.fromEntries(new FormData(el.rowForm).entries());
      addRow('#beneList', data);
    }
  }, {once:true});
});

$('[data-action="addHistory"]').addEventListener('click', async () => {
  openRowDialog({share: 'Face Amount'});
  el.rowDialog.addEventListener('close', () => {
    if (el.rowDialog.returnValue === 'ok'){
      const d = Object.fromEntries(new FormData(el.rowForm).entries());
      addRow('#historyList', { name:d.name, rel:d.rel, share:d.share });
    }
  }, {once:true});
});

// ==== Premium summary & simple trainer quote ====
function fillSummaries(){
  const { pi, product, plan } = state.data;
  el.summaryPI.innerHTML = `
    <div><strong>Issue State</strong><span>${state.data.state || ''}</span></div>
    <div><strong>Age</strong><span>${pi?.age ?? ''}</span></div>
    <div><strong>Gender</strong><span>${pi?.gender ?? ''}</span></div>
  `;
  const planName = product === 'TLE' ? 'Term Life Express'
    : product === 'WLE' ? 'Whole Life Express'
    : 'Indexed Universal Life Express';
  const tobacco = $('input[name="pi_tobacco"]:checked')?.value === 'Yes' ? 'Tobacco' : 'Nontobacco';
  el.summaryPlan.innerHTML = `
    <div><strong>Plan</strong><span>${planName}</span></div>
    <div><strong>Face Amount</strong><span>$${(+plan?.face||0).toLocaleString()}</span></div>
    <div><strong>Tobacco Status</strong><span>${tobacco}</span></div>
  `;
}

function baseRatePerThousand(age, product){
  // Training-only dummy rates (NOT real MOO pricing)
  const a = Math.max(18, Math.min(80, +age||40));
  if (product === 'TLE')  return 0.35 + 0.01*(a-30);
  if (product === 'WLE')  return 0.80 + 0.02*(a-30);
  if (product === 'IULE') return 0.50 + 0.015*(a-30);
  return 0.5;
}

function quoteMonthly(age, product, face, tobacco){
  const rate = baseRatePerThousand(age, product);
  const mult = tobacco ? 1.5 : 1.0;
  return Math.max(5, Math.round(((face/1000)*rate*mult)*100)/100);
}

function formatMoney(n){ return `$${n.toFixed(2)}`; }

$$('[data-action="calcPremiums"]').forEach(btn => btn.addEventListener('click', () => {
  const { pi, product, plan } = state.data;
  const tobacco = $('input[name="pi_tobacco"]:checked')?.value === 'Yes';
  const m = quoteMonthly(pi?.age, product, +plan?.face||0, tobacco);
  const annual = +(m*12).toFixed(2);
  const semi   = +(annual/2).toFixed(2);
  const quarter= +(annual/4).toFixed(2);

  el.modes.hidden = false;
  el.modes.querySelector('[data-mode="MONTHLY"]').textContent = formatMoney(m);
  el.modes.querySelector('[data-mode="ANNUAL"]').textContent  = formatMoney(annual);
  el.modes.querySelector('[data-mode="SEMI"]').textContent    = formatMoney(semi);
  el.modes.querySelector('[data-mode="QUARTER"]').textContent = formatMoney(quarter);
}));

// init
show(0);