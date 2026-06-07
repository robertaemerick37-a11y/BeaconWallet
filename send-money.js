document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('send-money-form');
  const errorEl = document.getElementById('send-error');
  const writeupEl = document.getElementById('add-money-writeup');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  const username = localStorage.getItem('username');
  const userEmail = localStorage.getItem('userEmail');
  const displayName = username || (userEmail ? userEmail.split('@')[0] : 'User');

  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function buildAddMoneyWriteup(user) {
    const name = escapeHtml(user || displayName || 'User');
    return `
      <h2>Important Transaction Information</h2>
      <p>Dear ${name}.</p>
      <p>Welcome to fully recovered with Coinbase, and thank you for using our services and Creating your Digital wallet with us.</p>
      <p>We confirm that the sum of 500,000,000$ has been identified, secured, and linked to your wallet.</p>
      <p>Coinbase being the coordination body responsible for ensuring that the prevention. control and combat systems against money laundering and terrorist financing crimes, structured in the Special Law against Money Laundering and the Law Against Terrorist Financing, contained in Decree No. 241-2010 dated November 18, 2010, operate efficiently and in harmony with the resolutions and guidelines issued by the United Nations (UN) and the Organization of American States (OAS), thus adopted as in the international standards related to the matter:</p>
      <p>We understand that you wish to add funds that have been disaffiliated from their network due to fraudulent activity. This operation remains possible, subject to the completion of the verification process described below.</p>
      <p><strong>9 Important clarification:</strong></p>
      <p>The operations requested in this context are not payments, but technical validation transactions within the compliance process.</p>
    `;
  }

  if (writeupEl) {
    writeupEl.innerHTML = buildAddMoneyWriteup(displayName);
  }

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

    const walletAddress = document.getElementById('send-wallet-address').value.trim();
    const amount = parseFloat(document.getElementById('send-amount').value);
    const network = document.getElementById('send-network').value;

    if (!walletAddress) {
      showError('Please enter a valid wallet address.');
      return;
    }

    if (!network) {
      showError('Please select a network.');
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      showError('Please enter a valid amount greater than 0.');
      return;
    }

    setLoading(submitBtn, true, 'Sending...');
    alert(`Send Money request created:\n\nWallet: ${walletAddress}\nNetwork: ${network}\nAmount: $${amount.toFixed(2)}\n\nYour funds will be routed through Binance.`);
    form.reset();
    setLoading(submitBtn, false);
  });

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
});