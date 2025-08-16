// Simple SPA state + nav
const stack = [];
function go(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (!stack.length || stack[stack.length-1]!==id) stack.push(id);
  const tab = (id.startsWith('scr_case')||id==='scr_home'||id==='scr_welcome')?'case':'app';
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
}
function back(){
  stack.pop();
  const id = stack.pop() || 'scr_home';
  go(id);
}

// Global form snapshot
const form = {
  pi:{}, pr:{}, ci:{}, product:'', tob:'Nontobacco', face:0, max:0, mode:null
};

// Case Info → validate + product caps
function next_caseinfo(){
  const f = v=>document.getElementById(v).value.trim();
  form.pi.first = f('pi_first'); form.pi.last = f('pi_last');
  form.pi.dob   = f('pi_dob');  form.pi.age  = +f('pi_age');
  form.pi.gender= f('pi_gender'); form.pi.state = f('pi_state');
  form.product  = f('product');

  if(!form.pi.first||!form.pi.last||!form.pi.age||!form.pi.gender||!form.pi.state||!form.product){
    alert('Please complete Proposed Insured, State, and Product Type.'); return;
  }
  form.max = (form.product==='whole') ? 50000 : 300000;
  form.tob = 'Nontobacco';
  go('scr_producer');
}

// Plan screen guard
function next_plan(){
  const face = +document.getElementById('plan_face').value;
  if(!face || face<1000){ alert('Enter a face amount.'); return; }
  if(face>form.max){ alert('Face amount exceeds product maximum.'); return; }
  form.face = face;
  go('scr_pre');
}

// Beneficiaries
function addBene(isContingent=false){
  const tbody = document.querySelector('#bene_tbl tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" placeholder="${isContingent?'Contingent Name':'Name'}"></td>
    <td><input type="text" placeholder="Relationship"></td>
    <td><input type="number" min="0" max="100" value="${isContingent?0:100}"></td>
    <td><button class="danger" onclick="this.closest('tr').remove()">Delete</button></td>
  `;
  tbody.appendChild(tr);
}

// Modal premium (trainer math)
function calcModal(){
  const ageF = form.pi.age<40 ? 1 : form.pi.age<55 ? 1.2 : 1.5;
  const prodF = form.product==='term' ? 0.35 : form.product==='iul' ? 0.85 : 1.1;
  const tobF = (form.tob==='Nontobacco') ? 1 : 1.4;
  const baseAnnual = (form.face/1000) * ageF * prodF * tobF * 100;
  const modes = [
    {label:'Direct Bill Annual', amt:baseAnnual},
    {label:'Direct Bill Semi-Annual', amt:baseAnnual/2*1.02},
    {label:'Direct Bill Quarterly', amt:baseAnnual/4*1.03},
    {label:'Monthly Automatic Bill Pay', amt:baseAnnual/12*1.01},
  ];
  const list = document.getElementById('modeList');
  list.innerHTML='';
  modes.forEach(m=>{
    const div = document.createElement('div');
    div.innerHTML = `
      <label class="inline" style="justify-content:space-between">
        <span><input type="radio" name="mode" onclick="form.mode='${m.label}'"> ${m.label}</span>
        <b>$${m.amt.toFixed(2)}</b>
      </label>`;
    list.appendChild(div);
  });
  document.getElementById('modes').style.display='block';
}

// UW question sets (swap with exact copy later if you want)
const UW = {
  term: [
    'Past 5 years any stroke, TIA, or heart attack?',
    'Any insulin use or A1C ≥ 8.5 within last 12 months?',
    'Currently prescribed 3+ cardiac meds (e.g., beta blocker, ACE, statin)?'
  ],
  iul: [
    'Any cancer (except basal cell) in past 5 years?',
    'COPD, emphysema, or oxygen use?',
    'Uncontrolled diabetes with complications?'
  ],
  whole: [
    'Bedridden, hospice, or nursing home care?',
    'Oxygen use for any condition?',
    'ALS, dementia, or Alzheimer’s diagnosed?'
  ]
};

// Prefill hooks
function enter_plan(){
  byId('plan_max').value = `$${form.max.toLocaleString()}`;
  byId('plan_name').value =
    form.product==='term' ? 'Term Life Express' :
    form.product==='iul'  ? 'Indexed Universal Life Express' :
                            'Whole Life Express';
  byId('plan_tob').value = form.tob;
}
function enter_summary(){
  byId('sum_state').value = form.pi.state;
  byId('sum_age').value = form.pi.age;
  byId('sum_gender').value = form.pi.gender;
  byId('sum_plan').value = byId('plan_name').value;
  byId('sum_face').value = `$${form.face.toLocaleString()}`;
  byId('sum_tob').value = form.tob;
}
function enter_uw(){
  const box = document.getElementById('uw_qs');
  box.innerHTML='';
  (UW[form.product]||[]).forEach((q,i)=>{
    const div = document.createElement('div');
    div.className='inline';
    div.innerHTML = `<label>${q}</label>
      <label><input type="radio" name="uw${i}" value="yes"> Yes</label>
      <label><input type="radio" name="uw${i}" value="no" checked> No</label>`;
    box.appendChild(div);
  });
}
function byId(i){return document.getElementById(i)}

function finish(){
  console.log('Trainer submit:', {form});
  go('scr_done');
}

// Screen-entry observer (fires hooks when a screen becomes active)
const entryHooks = {
  'scr_plan': enter_plan,
  'scr_summary': enter_summary,
  'scr_uw': enter_uw
};
const observer = new MutationObserver(()=>{
  const active = document.querySelector('.screen.active');
  if(active && entryHooks[active.id]) entryHooks[active.id]();
});
observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});

// Init
go('scr_welcome');

// PWA: register service worker if available
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(console.warn);
  }
});
