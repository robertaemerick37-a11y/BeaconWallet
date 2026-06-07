// Profile dropdown functionality
const profileTrigger = document.getElementById('profile-trigger');
const profileDropdown = document.getElementById('profile-dropdown');
const usernameElement = document.querySelector('.profile-trigger .username');

// Display username from localStorage
let username = localStorage.getItem('username');
const userEmail = localStorage.getItem('userEmail');
let displayName = username || (userEmail ? userEmail.split('@')[0] : 'User');

async function refreshWithdrawProfile() {
  if (!userEmail) return;
  if (!username) {
    try {
      const response = await fetch(`/api/profile?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      if (response.ok && data.username) {
        username = data.username;
        localStorage.setItem('username', username);
        displayName = username;
      }
    } catch (error) {
      console.error('Withdraw profile lookup failed:', error);
    }
  }

  if (displayName) {
    usernameElement.textContent = displayName;
  }
}

refreshWithdrawProfile();

// Toggle dropdown
profileTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!profileDropdown.classList.contains('hidden')) {
    if (!profileTrigger.contains(e.target) && !profileDropdown.contains(e.target)) {
      profileDropdown.classList.add('hidden');
    }
  }
});

// Withdrawal handling and Modal Popup system mapping
const withdrawForm = document.getElementById('withdraw-form');
const withdrawError = document.getElementById('withdraw-error');

const confirmModal = document.getElementById('withdraw-confirm-modal');
const overlayClose = document.getElementById('modal-overlay-close');
const cancelWithdrawBtn = document.getElementById('cancel-withdraw-btn');
const confirmWithdrawBtn = document.getElementById('confirm-withdraw-btn');

// Target Fields inside the Confirm Modal
const confirmAmount = document.getElementById('confirm-amount');
const confirmWallet = document.getElementById('confirm-wallet');
const confirmNetwork = document.getElementById('confirm-network');
const confirmTag = document.getElementById('confirm-tag');

// Target Elements inside the Statement Success Modal
const successModal = document.getElementById('withdraw-success-modal');
const successCloseBtn = document.getElementById('success-close-btn');
const successUserGreeting = document.getElementById('success-user-greeting');

let pendingWithdrawData = null;

function showConfirmModal(data) {
  if (!data) return;
  confirmAmount.textContent = `$${parseFloat(data.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  confirmWallet.textContent = data.walletAddress;
  confirmNetwork.textContent = data.network;
  confirmTag.textContent = data.walletTag || 'None';

  confirmModal.classList.remove('hidden');
}

function closeConfirmModal() {
  confirmModal.classList.add('hidden');
}

if (cancelWithdrawBtn) {
  cancelWithdrawBtn.addEventListener('click', () => {
    closeConfirmModal();
    pendingWithdrawData = null;
  });
}

if (overlayClose) {
  overlayClose.addEventListener('click', () => {
    closeConfirmModal();
    pendingWithdrawData = null;
  });
}

if (confirmWithdrawBtn) {
  confirmWithdrawBtn.addEventListener('click', () => {
    if (!pendingWithdrawData) return;
    closeConfirmModal();
    executeWithdraw(pendingWithdrawData);
  });
}

// Close success modal and redirect back to dashboard view loop
if (successCloseBtn) {
  successCloseBtn.addEventListener('click', () => {
    successModal.classList.add('hidden');
    window.location.href = 'dashboard.html';
  });
}

// 1. Capture Form Submission and show the Review Details confirmation modal
withdrawForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  withdrawError.classList.add('hidden');

  const email = document.getElementById('withdraw-email').value.trim();
  const amount = document.getElementById('withdraw-amount').value.trim();
  const walletAddress = document.getElementById('wallet-address').value.trim();
  const network = document.getElementById('network-select').value;
  const walletTag = document.getElementById('wallet-tag').value.trim();

  if (!walletAddress) {
    withdrawError.textContent = 'Please enter a valid wallet address.';
    withdrawError.classList.remove('hidden');
    return;
  }

  if (!network) {
    withdrawError.textContent = 'Please select a network protocol.';
    withdrawError.classList.remove('hidden');
    return;
  }

  const withdrawalAmount = parseFloat(amount);
  if (!amount || withdrawalAmount <= 0) {
    withdrawError.textContent = 'Please enter a valid withdrawal amount.';
    withdrawError.classList.remove('hidden');
    return;
  }

  if (withdrawalAmount < 500) {
    alert('The minimum allowable processing withdrawal limit on recovered funds is $500.00.');
    return;
  }

  pendingWithdrawData = { email, amount, walletAddress, network, walletTag };
  showConfirmModal(pendingWithdrawData);
});

// 2. Triggers after confirming details inside popup layout frame
async function executeWithdraw(data) {
  if (!data) return;
  withdrawError.classList.add('hidden');
  
  const originalSubmitBtn = document.querySelector('#withdraw-form .submit-btn');
  const originalText = originalSubmitBtn ? originalSubmitBtn.textContent : 'Withdraw to Wallet';
  
  if (originalSubmitBtn) {
    originalSubmitBtn.textContent = 'Processing Transmission...';
    originalSubmitBtn.style.opacity = '0.7';
    originalSubmitBtn.disabled = true;
  }

  // Simulation processing transmission latency delay
  setTimeout(() => {
    if (originalSubmitBtn) {
      originalSubmitBtn.textContent = originalText;
      originalSubmitBtn.style.opacity = '1';
      originalSubmitBtn.disabled = false;
    }

    // Dynamic username compilation insertion step
    if (successUserGreeting) {
      successUserGreeting.textContent = displayName;
    }

    // Reveal custom statement content layout panel frame modal seamlessly
    successModal.classList.remove('hidden');

    withdrawForm.reset();
    pendingWithdrawData = null;
  }, 1500);
}