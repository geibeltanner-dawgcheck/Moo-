// ------- GLOBAL STATE -------
const screens=[...document.querySelectorAll('.screen')];
let step=0;
const LIMITS={term:300000,iul:300000,whole:50000};
const NAMES={term:'Term Life Express', iul:'Indexed Universal Life Express', whole:'Whole Life Express'};

// Simple rates (swap with real tables when you hand me sheets)
const RATES={
  term:{ // assume 20-year for trainer; termYears select exists if you want to branch later
    policyFeeAnnual:60,
    monthlyFactorFromAnnual:0.089,
    per1000Annual:{
      male:{
        nonsmoker:{30:2.20,35:2.75,40:3.32,45:4.80,50:7.53,55:12.90,60:20.97},
        smoker:   {30:4.40,35:5.30,40:6.60,45:9.60,50:14.46,55:24.80,60:37.63}
      },
      female:{
        nonsmoker:{30:2.05,35:2.55,40:3.12,45:4.30,50:7.07,55:11.90,60:19.69},
        smoker:   {30:3.90,35:4.90,40:6.19,45:8.90,50:13.58,55:22.80,60:35.33}
      }
    }
  },
  whole:{
    policyFeeAnnual:36,
    monthlyFactorFromAnnual:0.089,
    per1000Annual:{
      male:{
        nonsmoker:{40:25.00,50:35.00,55:41.00,60:53.00,65:68.00,70:95.00},
        smoker:   {40:35.00,50:46.00,55:58.00,60:80.00,65:111.00,70:154.00}
      },
      female:{
        nonsmoker:{40:19.50,50:25.00,55:32.00,60:40.00,65:51.00,70:67.00},
        smoker:   {40:24.00,50:33.00,55:40.00,60:51.00,65:72.00,70:108.00}
      }
    }
  },
  iul:{
    policyFeeMonthly:5.00,
    per1000Monthly:{
      male:{  nonsmoker:{35:0.50,40:0.53,50:0.90}, smoker:{35:0.75,40:0.80,50:1.30} },
      female:{nonsmoker:{35:0.37,40:0.45,50:0.75}, smoker:{35:0.55,40:0.65,50:1.05} }
    }
  }
};

// ------- NAV -------
function show(i){ screens.forEach((s,idx)=>s.classList.toggle('active',idx===i)); step=i; window.scrollTo({top:0,behavior:'instant'}); }
document.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click', ()=>{ if(validate(step)) show(step+1); }));
document.querySelectorAll('[data-prev]').forEach(b=>b.addEventListener('click', ()=>show(Math.max(0,step-1))));
document.getElementById('btnStart').onclick=()=>show(1);
// Kill splash after a beat
setTimeout(()=>document.getElementById('splash').style.display='none', 800);

// Product-specific UI toggles
const productType=document.getElementById('productType');
const termWrap=document.getElementById('termWrap');
const maxAllowedEl=document.getElementById('maxAllowed');
const planName=document.getElementById('planName');
productType.addEventListener('change',()=>{
  const p=productType.value;
  termWrap.hidden = p!=='term';
  planName.value = NAMES[p]||'';
  maxAllowedEl.textContent = p ? '$'+LIMITS[p].toLocaleString() : '--';
});

// Age from DOB
const piDOB=document.getElementById('piDOB');
const piAge=document.getElementById('piAge');
piDOB.addEventListener('input',()=>{ piAge.value = calcAge(piDOB.value)||''; });
function calcAge(dobStr){
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dobStr||''); if(!m) return 0;
  const d=new Date(+m[3],+m[1]-1,+m[2]); const t=new Date();
  let a=t.getFullYear()-d.getFullYear(); const before=(t.getMonth()<d.getMonth())||(t.getMonth()==d.getMonth()&&t.getDate()<d.getDate());
  return before? a-1:a;
}

// HIPAA PIN
document.getElementById('genPIN').onclick=()=>{ document.getElementById('hipPin').value=(''+Math.floor(1000+Math.random()*9000)); };

// Tables add/remove helpers
function addRow(tbody, cols){
  const tr=document.createElement('tr');
  cols.forEach(el=>{ const td=document.createElement('td'); td.appendChild(el); tr.appendChild(td); });
  const td=document.createElement('td'); const del=document.createElement('button'); del.className='btn'; del.textContent='Delete';
  del.onclick=()=>tr.remove(); td.appendChild(del); tr.appendChild(td); tbody.appendChild(tr);
}
document.getElementById('btnAddPolicy').onclick=()=>{
  const c=document.createElement('input'); const n=document.createElement('input'); const f=document.createElement('input');
  c.type='text'; n.type='text'; f.type='number'; f.step='1000';
  addRow(document.querySelector('#tblPolicies tbody'), [c,n,f]);
};
document.getElementById('btnAddPrimary').onclick=()=>{
  addRow(document.querySelector('#tblPrimary tbody'), [inp(),inp(),num(0,100)]);
};
document.getElementById('btnAddCont').onclick=()=>{
  addRow(document.querySelector('#tblCont tbody'), [inp(),inp(),num(0,100)]);
};
function inp(){ const x=document.createElement('input'); x.type='text'; return x; }
function num(min,max){ const x=document.createElement('input'); x.type='number'; if(min!=null)x.min=min; if(max!=null)x.max=max; return x; }
document.querySelectorAll('input[name="hasCont"]').forEach(r=>r.addEventListener('change',e=>{
  document.getElementById('contWrap').hidden = e.target.value!=='Yes';
}));

// UW questions (placeholder list; you’ll send exact product sets later)
const UW_QUESTIONS=[
  'In past 5 years, diagnosis/treatment for cancer, heart attack, stroke, or COPD?',
  'Currently in hospital, hospice, or nursing facility?',
  'Advised to have test/treatment/surgery not yet completed?',
  'Use of oxygen equipment (excl. CPAP) or dialysis?',
  'In past 12 months, DUI or felony?',
  'Pending surgery or medical testing not reviewed by a physician?',
  'In past 2 years, used illicit drugs other than as prescribed?',
  'In past 2 years, declined or rated for life insurance?'
];
const uwList=document.getElementById('uwList');
UW_QUESTIONS.forEach((q,i)=>{
  const fs=document.createElement('div'); fs.className='card';
  fs.innerHTML=`
    <b>Q${i+1}.</b> ${q}<br>
    <label class="inline"><input type="radio" name="uw${i}" value="No" required> No</label>
    <label class="inline"><input type="radio" name="uw${i}" value="Yes"> Yes</label>
    <div id="uw${i}note" hidden><label>Notes<textarea></textarea></label></div>
  `;
  uwList.appendChild(fs);
  fs.querySelectorAll(`input[name="uw${i}"]`).forEach(r=>r.addEventListener('change',e=>{
    fs.querySelector(`#uw${i}note`).hidden = e.target.value!=='Yes';
  }));
});

// Beneficiaries contingent toggle handled above

// Premium Summary auto-fill
const summaryPI=document.getElementById('summaryPI');
const summaryPlan=document.getElementById('summaryPlan');
const faceAmt=document.getElementById('faceAmt');
const piGender=document.getElementById('piGender');
const piMailState=document.getElementById('piMailState');
const piState=document.getElementById('piState');
function fillSummaries(){
  const name = `${val('piFirst')} ${val('piLast')}`.trim()||'--';
  const g = valSel(piGender) || '--';
  const addr = `${val('piAddr')||''}, ${val('piCity')||''} ${val('piMailState')||''} ${val('piZip')||''}`.replace(/^[,\s]+|[,\s]+$/g,'')||'--';
  summaryPI.innerHTML = `
    <div><b>Name:</b> ${name}</div>
    <div><b>DOB:</b> ${val('piDOB')||'--'} (Age ${val('piAge')||'--'})</div>
    <div><b>Gender:</b> ${g}</div>
    <div><b>Address:</b> ${addr}</div>
  `;
  summaryPlan.innerHTML = `
    <div><b>Plan:</b> ${val('planName')||'--'}</div>
    <div><b>Face Amount:</b> $${(+val('faceAmt')||0).toLocaleString()}</div>
    <div><b>Tobacco:</b> ${val('piTob')||'--'}</div>
  `;
}
function val(id){ const el=document.getElementById(id); return el?el.value:''; }
function valSel(el){ return el?el.value:''; }

// Calculator
document.getElementById('btnCalcPremium').onclick = ()=>{
  try{
    const quote = computeMonthly();
    const out=document.getElementById('premResults');
    out.innerHTML = `
      <div><b>Monthly (EFT):</b> ${money(quote.monthly)}</div>
      <div><b>Quarterly:</b> ${money(quote.monthly*3)}</div>
      <div><b>Semi-Annual:</b> ${money(quote.monthly*6)}</div>
      <div><b>Annual:</b> ${money(quote.monthly*12)}</div>
      <div class="muted" style="margin-top:6px">Trainer calc: monthly is base; others are multiples.</div>
    `;
    const amountQuoted=document.getElementById('amountQuoted');
    if(amountQuoted) amountQuoted.value = quote.monthly.toFixed(2);
  }catch(e){
    document.getElementById('premResults').innerHTML = `<div class="alert err">${e.message}</div>`;
  }
};

function nearestKey(obj, age){
  const keys=Object.keys(obj).map(n=>+n).sort((a,b)=>a-b);
  let best=keys[0]; for(const k of keys){ if(age>=k) best=k; else break; } return best;
}
function money(n){ return '$'+(isFinite(n)? n.toFixed(2):'--'); }

function computeMonthly(){
  const pkey=(productType.value||'').toLowerCase();
  if(!pkey) throw new Error('Select product.');
  const state=(val('piState')||val('piMailState')||'').toUpperCase();
  let gender=(valSel(piGender)||'').toLowerCase();
  const tob=(val('piTob')==='Yes')?'smoker':'nonsmoker';
  const age= +val('piAge') || calcAge(val('piDOB'));
  const face= +val('faceAmt');

  if(!age||age<18) throw new Error('Enter valid DOB/age.');
  if(!face) throw new Error('Enter face amount.');
  if(face>LIMITS[pkey]) throw new Error(`Face exceeds Express limit ($${LIMITS[pkey].toLocaleString()}).`);
  // MT unisex = male table
  if(state==='MT') gender='male';
  if(gender!=='male' && gender!=='female') throw new Error('Select gender.');

  let monthly=0;
  if(pkey==='iul'){
    const table=RATES.iul.per1000Monthly[gender][tob];
    const k=nearestKey(table,age); const per1k=table[k];
    monthly = per1k*(face/1000) + RATES.iul.policyFeeMonthly;
  } else if(pkey==='term'){
    const table=RATES.term.per1000Annual[gender][tob];
    const k=nearestKey(table,age); const per1kA=table[k];
    const annual = per1kA*(face/1000) + RATES.term.policyFeeAnnual;
    monthly = annual * RATES.term.monthlyFactorFromAnnual;
  } else if(pkey==='whole'){
    const table=RATES.whole.per1000Annual[gender][tob];
    const k=nearestKey(table,age); const per1kA=table[k];
    const annual = per1kA*(face/1000) + RATES.whole.policyFeeAnnual;
    monthly = annual * RATES.whole.monthlyFactorFromAnnual;
  }
  return {monthly};
}

// Validate by step
function validate(i){
  switch(i){
    case 1: // case
      if(!val('piState')||!productType.value) return err('Select state and product.');
      if(productType.value==='term' && !val('termYears')) return err('Pick term length.');
      planName.value = NAMES[productType.value]||'';
      maxAllowedEl.textContent = '$'+LIMITS[productType.value].toLocaleString();
      return true;
    case 2: return true;
    case 3:
      if(!val('piFirst')||!val('piLast')||!val('piDOB')||!valSel(piGender)) return err('Complete proposed insured basics.');
      piAge.value = calcAge(val('piDOB'))||'';
      return true;
    case 7: // plan info
      if(!val('faceAmt')) return err('Enter face amount.');
      const p=productType.value; const fa=+val('faceAmt');
      if(fa>LIMITS[p]) return err(`Face exceeds limit for ${NAMES[p]}.`);
      return true;
    case 10: // bene: percent sanity (optional)
      return true;
    case 11:
      fillSummaries(); return true;
    default: return true;
  }
}
function err(msg){ alert(msg); return false; }

// Contingent toggle
document.querySelectorAll('input[name="hasCont"]').forEach(r=>{
  r.addEventListener('change',e=>{ document.getElementById('contWrap').hidden = e.target.value!=='Yes'; });
});

// Producer prev addresses
document.getElementById('btnAddAddr').onclick=()=>{
  const row=document.createElement('tr');
  ['Street','City','State','Zip','From','To'].forEach(_=>{
    const td=document.createElement('td'); const x=document.createElement('input'); x.type='text'; td.appendChild(x); row.appendChild(td);
  });
  const td=document.createElement('td'); const del=document.createElement('button'); del.className='btn'; del.textContent='Delete'; del.onclick=()=>row.remove(); td.appendChild(del); row.appendChild(td);
  document.querySelector('#tblPrevAddr tbody').appendChild(row);
};

// Producer signature pad
const sigPad=document.getElementById('sigPad'); let ctx=null,drawing=false,signed=false;
document.getElementById('prodFinger').addEventListener('change',e=>{
  const on=e.target.value==='Yes'; document.getElementById('sigWrap').hidden=!on; if(on) initPad();
});
function initPad(){
  const ratio=window.devicePixelRatio||1;
  sigPad.width = sigPad.clientWidth*ratio; sigPad.height=sigPad.clientHeight*ratio;
  ctx=sigPad.getContext('2d'); ctx.scale(ratio,ratio); ctx.lineWidth=2; ctx.lineCap='round';
}
function pos(e){ const r=sigPad.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return {x:t.clientX-r.left, y:t.clientY-r.top}; }
function start(e){ if(!ctx) return; drawing=true; const {x,y}=pos(e); ctx.beginPath(); ctx.moveTo(x,y); e.preventDefault(); }
function move(e){ if(!drawing||!ctx) return; const {x,y}=pos(e); ctx.lineTo(x,y); ctx.stroke(); signed=true; e.preventDefault(); }
function end(){ drawing=false; }
if(sigPad){
  sigPad.addEventListener('mousedown',start); sigPad.addEventListener('mousemove',move); window.addEventListener('mouseup',end);
  sigPad.addEventListener('touchstart',start,{passive:false}); sigPad.addEventListener('touchmove',move,{passive:false}); sigPad.addEventListener('touchend',end);
}
document.getElementById('clearSig').onclick=()=>{ if(ctx){ initPad(); signed=false; } };
document.getElementById('applySig').onclick=()=>alert('Signature captured (trainer).');
document.getElementById('submitApp').onclick=()=>{
  const msg=document.getElementById('submitMsg'); msg.hidden=false; msg.textContent='Application submitted (trainer).';
  document.getElementById('policyNum').textContent='Policy Number: BU'+Math.floor(100000+Math.random()*900000);
};

// Install prompt button (optional)
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault(); deferredPrompt=e; const b=document.getElementById('btnInstall'); b.hidden=false;
  b.onclick=async ()=>{ deferredPrompt.prompt(); deferredPrompt=null; b.hidden=true; };
});

// Show summaries when landing on premium screen
const observer=new MutationObserver(()=>{
  if(screens[11].classList.contains('active')) fillSummaries();
});
observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});