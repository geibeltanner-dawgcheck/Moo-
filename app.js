// helpers
const $ = s => document.querySelector(s);
const $all = s => [...document.querySelectorAll(s)];
const show = id => {
  // switch visible panel
  $all('main .panel').forEach(p => p.hidden = true);
  const el = $('#'+id);
  el.hidden = false;
  // sync tabs
  const tab = el.getAttribute('data-tab');
  $all('#subtabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  // scroll top
  window.scrollTo({top:0, behavior:'instant'});
};
const toast = (msg, t=2000) => {
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(()=>{ el.hidden = true; }, t);
};
const dollar = n => n.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2});

// state
const STATE = {
  case: { },
  producer: { },
  client: { },
  hipaa: { },
  history: { },
  plan: { max:0, face:0, tob:'Nontobacco' },
  bene: { primary:[], contingent:[] },
  premium: { monthly:null, mode:null },
  billing: {},
  emails: {},
  signatures: {}
};

// product config
const PRODUCT_MAX = { term:300000, iul:300000, whole:50000 };
const PRODUCT_NAME = {
  term: 'Term Life Express',
  iul: 'Indexed Universal Life Express with Easy Solve',
  whole: 'Whole Life Express'
};

// underwriting question bank (simplified per product)
const UW_QUESTIONS = {
  term: [
    'Past 5 years any stroke, TIA, or heart attack?',
    'Any insulin use or A1C ≥ 8.5 within last 12 months?',
    'Currently prescribed 3+ cardiac meds (e.g., beta blocker, ACE, statin)?'
  ],
  iul: [
    'Past 5 years any stroke, TIA, or heart attack?',
    'Any insulin use or A1C ≥ 8.5 within last 12 months?',
    'Currently prescribed 3+ cardiac meds (e.g., beta blocker, ACE, statin)?'
  ],
  whole: [
    'Currently receiving home health care or using oxygen?',
    'Diagnosed with cancer (other than basal cell) within past 2 years?',
    'In the last 12 months, confined to hospital or nursing facility?'
  ]
};

// super simple "rate table" for training (monthly base per $1,000 of face)
const RATE_BASE = {
  term: 0.90,
  whole: 1.20,
  // tuned so 150k ≈ $240.40 monthly in the screenshot (150 * 1.6027)
  iul: 1.6027
};
const GENDER_FACTOR = { Male:1.00, Female:0.95 };
const TOBACCO_FACTOR = { Nontobacco:1.00, Tobacco:1.60 };
const AGE_FACTOR = age => (age>=60?1.20: age>=50?1.10: age>=40?1.05:1.00);

function quickQuote({productType, face, age, gender, tob}){
  const base = RATE_BASE[productType] || 1.2;
  const mf = (GENDER_FACTOR[gender]||1);
  const tf = (TOBACCO_FACTOR[tob]||1);
  const af = AGE_FACTOR(Number(age||0));
  const monthly = (face/1000) * base * mf * tf * af;
  return Math.max(0, Math.round(monthly*100)/100);
}

// navigation wiring by data-go
document.addEventListener('click', evt=>{
  const go = evt.target.closest('[data-go]');
  if(!go) return;
  evt.preventDefault();
  show(go.dataset.go);
});

// tab manual click
$all('#subtabs .tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const targetTab = btn.dataset.tab;
    // choose a default screen in that tab
    const first = document.querySelector(`.panel[data-tab="${targetTab}"]`);
    if(first) show(first.id);
  });
});

document.addEventListener('DOMContentLoaded', () => {

  // find products (just sets plan name + max)
  $('#btn-find').addEventListener('click', ()=>{
    const st = $('#pi-state').value;
    const prod = $('#product-type').value;
    if(!st || !prod){ toast('Select State and Product Type first.'); return; }
    STATE.case.state = st;
    STATE.case.productType = prod;
    $('#product-note').textContent = 'Express products available. Proceed to Next.';
  });

  // from case info → producer
  $('#caseinfo-next').addEventListener('click', ()=>{
    // save basics
    const required = ['#pi-first','#pi-last','#pi-dob','#pi-age','#pi-gender','#pi-state','#product-type'];
    for(const sel of required){
      const el = $(sel);
      if(!el.value){ el.focus(); toast('Please complete all highlighted fields.'); return; }
    }
    STATE.case.first = $('#pi-first').value.trim();
    STATE.case.last  = $('#pi-last').value.trim();
    STATE.case.dob   = $('#pi-dob').value.trim();
    STATE.case.age   = Number($('#pi-age').value);
    STATE.case.gender= $('#pi-gender').value;
    STATE.case.state = $('#pi-state').value;
    STATE.case.productType = $('#product-type').value;

    // prefill some downstream fields
    $('#plan-name').value = PRODUCT_NAME[STATE.case.productType] || '';
    const max = PRODUCT_MAX[STATE.case.productType] || 0;
    STATE.plan.max = max; $('#plan-max').value = dollar(max);

    // switch tab and continue
    show('screen-producer');
  });

  // plan -> preapproval (validate face ≤ max)
  $('#plan-next').addEventListener('click', ()=>{
    const faceRaw = $('#plan-face').value.replace(/[^0-9.]/g,'');
    if(!faceRaw){ toast('Enter face amount.'); $('#plan-face').focus(); return; }
    const face = Number(faceRaw);
    const max = Number(STATE.plan.max || 0);
    if(max && face > max){ toast(`Face exceeds product max of ${dollar(max)}.`); return; }
    STATE.plan.face = face;
    STATE.plan.tob = (document.querySelector('input[name="plan-tob"]:checked')||{}).value || 'Nontobacco';
    show('screen-preapproval');
  });

  // lock -> UW
  $('#btn-lock').addEventListener('click', ()=>{
    // build UW questions for selected product
    const p = STATE.case.productType || 'term';
    const list = UW_QUESTIONS[p] || [];
    const holder = $('#uw-qs'); holder.innerHTML = '';
    list.forEach((q,i)=>{
      const row = document.createElement('div');
      row.className='radio-line';
      row.innerHTML = `<span>${q}</span>
        <label><input type="radio" name="uw${i}" value="Yes"> Yes</label>
        <label><input type="radio" name="uw${i}" value="No" checked> No</label>`;
      holder.appendChild(row);
    });
    show('screen-uw');
  });

  // contingent toggle
  $('#cont-yes').addEventListener('change', e=>{
    $('#cont-block').hidden = !e.target.checked;
  });

  // bene add/edit
  const dlg = $('#dlg-bene');
  let editing = null, editingType='primary';
  function openBeneEditor(kind, item=null){
    editingType = kind;
    editing = item;
    $('#bf-name').value = item?.name || '';
    $('#bf-rel').value = item?.rel || 'Spouse';
    $('#bf-share').value = item?.share || '';
    dlg.showModal();
  }
  function paintBene(){
    function paintRows(arr, tbodySel){
      const tb = $(tbodySel); tb.innerHTML='';
      arr.forEach((b,idx)=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${b.name}</td>
          <td>${b.rel}</td>
          <td>${b.share}%</td>
          <td>
            <button class="btn" data-edit="${idx}" data-type="${tbodySel}">Edit</button>
            <button class="btn ghost" data-del="${idx}" data-type="${tbodySel}">Delete</button>
          </td>`;
        tb.appendChild(tr);
      });
    }
    paintRows(STATE.bene.primary, '#bene-rows');
    paintRows(STATE.bene.contingent, '#cont-rows');
  }
  $('#add-primary').addEventListener('click', ()=> openBeneEditor('primary'));
  $('#add-cont').addEventListener('click', ()=> openBeneEditor('contingent'));

  document.addEventListener('click', e=>{
    const edit = e.target.closest('[data-edit]');
    const del  = e.target.closest('[data-del]');
    if(edit){
      const idx = Number(edit.dataset.edit);
      const typeSel = edit.dataset.type;
      const arr = (typeSel==='#bene-rows')? STATE.bene.primary : STATE.bene.contingent;
      openBeneEditor(typeSel==='#bene-rows'?'primary':'contingent', {...arr[idx], __idx:idx});
    }
    if(del){
      const idx = Number(del.dataset.del);
      const typeSel = del.dataset.type;
      const arr = (typeSel==='#bene-rows')? STATE.bene.primary : STATE.bene.contingent;
      arr.splice(idx,1);
      paintBene();
    }
  });

  $('#bene-form').addEventListener('submit', e=>{
    e.preventDefault();
    const item = {
      name: $('#bf-name').value.trim(),
      rel:  $('#bf-rel').value,
      share: Number($('#bf-share').value)
    };
    if(!item.name || !item.share){ toast('Name and % share required.'); return; }
    let arr = (editingType==='primary')? STATE.bene.primary : STATE.bene.contingent;
    if(editing && editing.__idx!==undefined){
      arr[editing.__idx] = item;
    }else{
      arr.push(item);
    }
    dlg.close(); paintBene();
  });

  dlg.addEventListener('close', ()=>{ editing=null; });

  // bene -> premium
  $('#bene-next').addEventListener('click', ()=>{
    if(STATE.bene.primary.length===0){ toast('Add at least one primary beneficiary.'); return; }
    // fill summary fields
    $('#sum-issue').value = STATE.case.state || '';
    $('#sum-age').value   = STATE.case.age ?? '';
    $('#sum-gender').value= STATE.case.gender || '';
    $('#sum-plan').value  = PRODUCT_NAME[STATE.case.productType] || '';
    $('#sum-face').value  = dollar(STATE.plan.face || 0);
    $('#sum-tob').value   = STATE.plan.tob || 'Nontobacco';
    $('#mode-block').hidden = true;
    $('#premium-next').disabled = true;
    show('screen-premium');
  });

  // calculate modes
  $('#btn-calc').addEventListener('click', ()=>{
    const monthly = quickQuote({
      productType: STATE.case.productType,
      face: STATE.plan.face,
      age: STATE.case.age,
      gender: STATE.case.gender,
      tob: STATE.plan.tob
    });
    STATE.premium.monthly = monthly;

    const modes = [
      {label:'Direct Bill Annual', mult:12},
      {label:'Direct Bill Semi-Annual', mult:6},
      {label:'Direct Bill Quarterly', mult:3},
      {label:'Monthly Automatic Bill Pay', mult:1}
    ];
    const wrap = $('#mode-block'); wrap.innerHTML='';
    modes.forEach(m=>{
      const row = document.createElement('div'); row.className='mode-row';
      row.innerHTML = `
        <label class="inline"><input type="radio" name="mode" value="${m.label}"> ${m.label}</label>
        <div class="mode-amount">${dollar(monthly*m.mult)}</div>`;
      wrap.appendChild(row);
    });
    wrap.hidden = false;
    $('#premium-next').disabled = false;

    // payor list for billing next screen (Proposed Insured + other)
    const payor = $('#bill-payor');
    payor.innerHTML = '';
    const piName = `${STATE.case.first||STATE.client?.first||'Proposed'} ${STATE.case.last||STATE.client?.last||'Insured'}`.trim();
    ['-- Select --', piName, 'Other'].forEach((n,i)=>{
      const o=document.createElement('option'); o.textContent=n; if(i===0) o.value=''; else o.value=n; payor.appendChild(o);
    });
  });

  $('#premium-next').addEventListener('click', ()=> show('screen-billing'));

  // billing -> lock
  $('#billing-next').addEventListener('click', ()=> show('screen-lock'));
  $('#lock-next').addEventListener('click', ()=> show('screen-postsub'));
  $('#postsub-next').addEventListener('click', ()=> show('screen-sigmethod'));
  $('#sigmethod-next').addEventListener('click', ()=> show('screen-prodstmt'));
  $('#prodstmt-next').addEventListener('click', ()=> show('screen-esign'));

  // eSign simulate
  $('#btn-apply-esign').addEventListener('click', ()=>{
    $('#esign-done').classList.remove('hide');
  });
  $('#btn-submit').addEventListener('click', ()=> show('screen-done'));

  // prefill client identity from Case Info on entry
  function syncClientFromCase(){
    $('#ci-first').value = STATE.case.first || '';
    $('#ci-last').value  = STATE.case.last || '';
    $('#ci-dob').value   = STATE.case.dob || '';
    $('#ci-age').value   = STATE.case.age || '';
    const g = STATE.case.gender;
    if(g) document.querySelector(`input[name="ci-gender"][value="${g}"]`)?.click();
  }
  document.querySelector('[data-go="screen-client"]').addEventListener('click', syncClientFromCase);
});