document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('exchange-form');
  const errorEl = document.getElementById('exchange-error');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  function setLoading(button, isLoading, loadingText) {
    if (!button) return;
    if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
    const labelEl = button.querySelector('.btn-label');
    if (isLoading) {
      button.classList.add('loading');
      if (labelEl) labelEl.textContent = loadingText || 'Processing...';
      else button.textContent = loadingText || 'Processing...';
    } else {
      button.classList.remove('loading');
      if (labelEl) labelEl.textContent = button.dataset.originalText;
      else button.textContent = button.dataset.originalText;
    }
  }

  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    errorEl.classList.add('hidden');

    const fromCurrency = document.getElementById('exchange-from').value;
    const toCurrency = document.getElementById('exchange-to').value;
    const amount = parseFloat(document.getElementById('exchange-amount').value);

    if (!fromCurrency || !toCurrency) {
      showError('Please select both currencies.');
      return;
    }

    if (fromCurrency === toCurrency) {
      showError('Please select different currencies to exchange.');
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      showError('Please enter a valid amount greater than 0.');
      return;
    }

    setLoading(submitBtn, true, 'Processing...');
    alert(`Exchange order created:\n\nFrom: ${fromCurrency}\nTo: ${toCurrency}\nAmount: $${amount.toFixed(2)}\n\nYour order will process through Binance.`);
    form.reset();
    setLoading(submitBtn, false);
  });

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
});