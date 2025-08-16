function nextStep(step) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(`step${step}`).classList.add('active');

  if (step === 3) {
    const form1 = new FormData(document.getElementById('clientForm'));
    const form2 = new FormData(document.getElementById('coverageForm'));

    const age = parseInt(form1.get('age'));
    const gender = form1.get('gender');
    const coverage = parseInt(form2.get('coverage'));

    // Dummy rate calc: $1.25 per $1000 coverage base
    const baseRate = 1.25;
    const genderFactor = gender === "M" ? 1.1 : 1.0;
    const ageFactor = age > 50 ? 1.5 : 1.0;

    const monthly = ((coverage / 1000) * baseRate * genderFactor * ageFactor).toFixed(2);

    document.getElementById('quoteOutput').innerHTML =
      `<p><strong>Client:</strong> ${form1.get('name')} (${age}, ${gender})</p>
       <p><strong>Coverage:</strong> $${coverage.toLocaleString()}</p>
       <p><strong>Monthly Premium:</strong> $${monthly}</p>`;
  }
}
