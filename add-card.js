document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('add-card-form');
  const errorEl = document.getElementById('add-card-error');
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

    const label = document.getElementById('card-label').value.trim();
    const walletAddress = document.getElementById('card-wallet-address').value.trim();
    const network = document.getElementById('card-network').value;

    if (!label) {
      showError('Please enter a wallet label.');
      return;
    }

    if (!walletAddress) {
      showError('Please enter the wallet address.');
      return;
    }

    if (!network) {
      showError('Please select a network.');
      return;
    }

    setLoading(submitBtn, true, 'Saving...');
    alert(`Wallet saved successfully:\n\nLabel: ${label}\nNetwork: ${network}\nAddress: ${walletAddress}`);
    form.reset();
    setLoading(submitBtn, false);
  });

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
});