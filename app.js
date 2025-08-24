// Mutual of Omaha App Replica: Full Multi-Step Wizard

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const steps = Array.from(document.querySelectorAll('.wizard-step'));
const stepNav = document.getElementById('step-list').children;
let currentStep = 0;

// Product matrix (simplified for demo, expand as needed)
const PRODUCT_MATRIX = {
  "Nebraska|Term Life": [
    "Term Life Answers - Full Application",
    "Term Life Answers - Speed eTicket",
    "Term Life Express Point of Sale Decision"
  ],
  "Nebraska|Final Expense": [
    "Living Promise Level",
    "Living Promise Graded"
  ],
  "Nebraska|IUL": [
    "Indexed Universal Life"
  ],
  "California|Term Life": [
    "Term Life Answers - Full Application"
  ],
  "California|IUL": [
    "Indexed Universal Life"
  ],
  "Texas|Term Life": [
    "Term Life Answers - Full Application"
  ]
};

function showStep(idx) {
  steps.forEach((s, i) => s.hidden = i !== idx);
  Array.from(stepNav).forEach((li, i) => {
    li.classList.toggle('is-active', i === idx);
    li.classList.toggle('is-done', i < idx);
    li.querySelector('.step-dot').textContent = i < idx ? '✓' : (i+1);
  });
  $('#btn-back').disabled = idx === 0;
  $('#btn-next').textContent = idx === steps.length-1 ? 'Finish' : 'Next ▸';
  if(idx === 7) $('#btn-next').style.display = "none";
  else $('#btn-next').style.display = "";
}

$('#btn-next').onclick = () => {
  if(!validateStep(currentStep)) return;
  if(currentStep < steps.length - 1) {
    currentStep++;
    showStep(currentStep);
  } else {
    // Final "Finish"
    currentStep++;
    showStep(currentStep);
  }
};
$('#btn-back').onclick = () => {
  if(currentStep > 0) {
    currentStep--;
    showStep(currentStep);
  }
};
Array.from(stepNav).forEach((li,i)=>{
  li.onclick = ()=>{ if(i<=currentStep) { currentStep=i; showStep(currentStep); } };
});

showStep(0);
$('#year').textContent = new Date().getFullYear();

// Required field validation for each step
function validateStep(idx) {
  let valid = true;
  // Step 1: Producer Info
  if(idx===0) {
    ['prod-fn','prod-ln'].forEach(id=>{
      const el = $('#'+id); if(!el) return;
      if(!el.value.trim()) { el.classList.add('error'); valid=false; }
      else el.classList.remove('error');
    });
  }
  // Step 2: Proposed Insured
  if(idx===1) {
    ['pi-fn','pi-ln','pi-dob','pi-gender','pi-ssn'].forEach(id=>{
      const el = $('#'+id); if(!el) return;
      if(!el.value.trim()) { el.classList.add('error'); valid=false; }
      else el.classList.remove('error');
    });
  }
  // Step 3: Product Selection
  if(idx===2) {
    ['state','ptype','coverage','product'].forEach(id=>{
      const el = $('#'+id); if(!el) return;
      if(!el.value.trim()) { el.classList.add('error'); valid=false; }
      else el.classList.remove('error');
    });
    if(!productDropdownUnlocked) {
      $('#find-status').textContent = "Please click Find Available Products";
      valid = false;
    } else {
      $('#find-status').textContent = "";
    }
  }
  // Step 4: Beneficiaries
  if(idx===3) {
    const rows = $$('#bene-body tr');
    let total = 0;
    rows.forEach(row=>{
      const pct = $('#bene-pct-'+row.dataset.id);
      total += parseInt(pct.value||'0',10)||0;
    });
    if(rows.length===0 || total!==100) {
      $('#bene-total').style.color = '#b00020';
      valid = false;
      alert('Beneficiaries must total 100%');
    } else {
      $('#bene-total').style.color = '#0a7b12';
    }
  }
  return valid;
}

// Age auto-calculation
function calcAge(val){
  if(!val) return '';
  const m=val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/); if(!m) return '';
  let [_,MM,DD,YYYY]=m; MM=+MM; DD=+DD; YYYY=+YYYY; if(YYYY<100) YYYY+=2000;
  const b=new Date(YYYY,MM-1,DD); if(isNaN(+b)) return '';
  const t=new Date(); let age=t.getFullYear()-b.getFullYear();
  const md=t.getMonth()-b.getMonth(); if(md<0||(md===0&&t.getDate()<b.getDate())) age--;
  return age>0?String(age):'';
}
$('#pi-dob').addEventListener('input', e=>{
  $('#pi-age').value = calcAge(e.target.value.trim());
});

// Product selection logic
let productDropdownUnlocked = false;
$('#find-products').onclick = () => {
  const state = $('#state').value;
  const type = $('#ptype').value;
  const list = PRODUCT_MATRIX[`${state}|${type}`] || [];
  const prodSel = $('#product');
  prodSel.innerHTML = '<option value="">Select a product…</option>';
  list.forEach(p=>{
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    prodSel.appendChild(opt);
  });
  productDropdownUnlocked = true;
  $('#find-status').textContent = list.length ? 'Products found.' : 'No products available.';
};

// Cover amount formatting
$('#coverage').addEventListener('input', e=>{
  let v = e.target.value.replace(/[^\d]/g,'');
  if(v.length) v = `$${parseInt(v,10).toLocaleString()}`;
  e.target.value = v;
});

// Premium calculation
function calculatePremium() {
  const state = $('#state').value;
  const type = $('#ptype').value;
  const prod = $('#product').value;
  const dob = $('#pi-dob').value;
  const coverage = parseInt($('#coverage').value.replace(/[^\d]/g,'')) || 0;
  const premField = $('#prem-mo');
  if(!state||!type||!prod||!coverage||!dob) { premField.value = ""; return; }
  // Simulate real premium logic:
  let rate = 1.0;
  const age = parseInt(calcAge(dob)) || 45;
  if(type==="Term Life") rate = 0.9;
  if(type==="Final Expense") rate = 1.2;
  if(type==="IUL") rate = 1.05;
  if(age>65) rate *= 1.7;
  else if(age>60) rate *= 1.5;
  else if(age>=50) rate *= 1.15;
  if(age<40) rate *= 0.85;
  const monthly = ((coverage/1000)*rate).toFixed(2);
  premField.value = `$${monthly}`;
}
['state','ptype','product','pi-dob','coverage'].forEach(id=>{
  $('#'+id).addEventListener('change', calculatePremium);
  $('#'+id).addEventListener('input', calculatePremium);
});

// Beneficiaries logic
function beneRow(id, name='', rel='', type='Primary', pct=''){
  return `<tr data-id="${id}">
    <td><input id="bene-name-${id}" class="input" value="${name}" /></td>
    <td><input id="bene-rel-${id}" class="input" value="${rel}" /></td>
    <td><select id="bene-type-${id}" class="select"><option ${type==='Primary'?'selected':''}>Primary</option><option ${type==='Contingent'?'selected':''}>Contingent</option></select></td>
    <td style="max-width:110px"><input id="bene-pct-${id}" class="input" inputmode="numeric" value="${pct}" /></td>
    <td><button class="btn btn--ghost bene-del" type="button">Remove</button></td>
  </tr>`;
}
const beneBody = $('#bene-body');
function updateBeneTotals(){
  let total = 0;
  $$('[id^="bene-pct-"]').forEach(i=>{ const n = parseInt(i.value||'0',10); i.value = String(n); total += (isNaN(n)?0:n); });
  $('#bene-total').textContent = `Total: ${total}%`;
}
$('#bene-add').addEventListener('click', ()=>{
  const id = Math.random().toString(36).slice(2,8);
  beneBody.insertAdjacentHTML('beforeend', beneRow(id));
  updateBeneTotals();
});
beneBody.addEventListener('click', (e)=>{
  const btn = e.target.closest('.bene-del'); if(!btn) return;
  btn.closest('tr').remove(); updateBeneTotals();
});
beneBody.addEventListener('input', (e)=>{
  if(e.target.id.startsWith('bene-pct-')) updateBeneTotals();
});

// Input masks
document.body.addEventListener('input', (e)=>{
  const t = e.target;
  if(!(t instanceof HTMLElement)) return;
  if(t.classList.contains('ssn')) t.value = t.value.replace(/[^\d]/g,'').replace(/^(\d{3})(\d{2})(\d{0,4})$/,'$1-$2-$3').slice(0,11);
  if(t.classList.contains('routing')) t.value = t.value.replace(/\D/g,'').slice(0,9);
  if(t.classList.contains('account')) t.value = t.value.replace(/\D/g,'').slice(0,17);
});

// Hide Next button after final step
if(steps[7]) steps[7].addEventListener('show', ()=>$('#btn-next').style.display='none');