const steps = Array.from(document.querySelectorAll('.wizard-step'));
const stepNav = document.getElementById('step-list').children;
let currentStep = 0;

function showStep(idx) {
  steps.forEach((s, i) => s.hidden = i !== idx);
  Array.from(stepNav).forEach((li, i) => {
    li.classList.toggle('is-active', i === idx);
    li.classList.toggle('is-done', i < idx);
    li.querySelector('.step-dot').textContent = i < idx ? '✓' : (i+1);
  });
  document.getElementById('btn-back').disabled = idx === 0;
  document.getElementById('btn-next').textContent = idx === steps.length-1 ? 'Finish' : 'Next ▸';
}

document.getElementById('btn-next').onclick = () => {
  if (currentStep < steps.length - 1) {
    currentStep++;
    showStep(currentStep);
  } else {
    // TODO: final submit/confirmation
    alert('Application complete!');
  }
};

document.getElementById('btn-back').onclick = () => {
  if (currentStep > 0) {
    currentStep--;
    showStep(currentStep);
  }
};

showStep(0);
document.getElementById('year').textContent = new Date().getFullYear();