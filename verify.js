const inputs = document.querySelectorAll('.digit-input');
const verifyForm = document.getElementById('verify-form');
const errorMessage = document.getElementById('error-message');
const resendLink = document.getElementById('resend-link');
const resendStatus = document.getElementById('resend-status');
const emailDisplay = document.getElementById('email-display');
const timerDisplay = document.getElementById('verify-timer');

const codeExpirySeconds = 105; // 1 minute 45 seconds
let remainingSeconds = codeExpirySeconds;
let expiryTimerId = null;

function updateTimerDisplay() {
  if (!timerDisplay) return;
  if (remainingSeconds > 0) {
    timerDisplay.textContent = `Code expires in ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}.`;
    timerDisplay.classList.remove('expired');
  } else {
    timerDisplay.textContent = 'Verification code expired. Please resend the code.';
    timerDisplay.classList.add('expired');
  }
}

function showResendStatus(message) {
  if (!resendStatus) return;
  resendStatus.textContent = message;
  resendStatus.classList.remove('hidden');
}

function hideResendStatus() {
  if (!resendStatus) return;
  resendStatus.classList.add('hidden');
}

function clearTimer() {
  if (expiryTimerId) {
    clearInterval(expiryTimerId);
    expiryTimerId = null;
  }
}

function startTimer() {
  clearTimer();
  remainingSeconds = codeExpirySeconds;
  updateTimerDisplay();
  expiryTimerId = setInterval(() => {
    remainingSeconds -= 1;
    updateTimerDisplay();
    if (remainingSeconds <= 0) {
      clearTimer();
    }
  }, 1000);
}

if(inputs.length > 0) {
  inputs[0].focus();
}

const userEmail = localStorage.getItem('userEmail');
if (userEmail) {
  emailDisplay.textContent = `Code sent to: ${userEmail}`;
}

startTimer();

inputs.forEach((input, index) => {
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    if (!/^[0-9]$/.test(value)) {
      e.target.value = '';
      return;
    }
    if (value && index < inputs.length - 1) {
      inputs[index + 1].focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
      if (!input.value && index > 0) {
        inputs[index - 1].focus();
        inputs[index - 1].value = '';
      }
    }
  });
});

const verifyButton = verifyForm.querySelector('.submit-btn');

function setLoading(isLoading) {
  if (isLoading) {
    verifyButton.classList.add('loading');
    verifyButton.querySelector('.btn-label').textContent = 'Verifying...';
  } else {
    verifyButton.classList.remove('loading');
    verifyButton.querySelector('.btn-label').textContent = 'Verify and Enter';
  }
}

verifyForm.addEventListener('submit', (e) => {
  e.preventDefault();
  errorMessage.classList.add('hidden');
  hideResendStatus();
  setLoading(true);

  let fullCode = '';
  inputs.forEach(input => {
    fullCode += input.value;
  });

  if (!userEmail) {
    setLoading(false);
    errorMessage.textContent = 'Session expired. Please return to the login screen.';
    errorMessage.classList.remove('hidden');
    return;
  }

  if (remainingSeconds <= 0) {
    setLoading(false);
    errorMessage.textContent = 'Your verification code has expired. Please resend a new code.';
    errorMessage.classList.remove('hidden');
    return;
  }

  fetch('/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      code: fullCode
    })
  })
  .then(async (response) => {
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Server error: Route not found. Make sure to restart your terminal server.");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Verification failed.');
    }

    // Navigate without adding a history entry so Back won't return to the verification page
    try { sessionStorage.setItem('justLoggedIn', '1'); } catch (e) {}
    window.location.replace('dashboard.html');
  })
  .catch((err) => {
    setLoading(false);
    errorMessage.textContent = err.message;
    errorMessage.classList.remove('hidden');
    verifyForm.reset();
    inputs[0].focus();
  });
});

resendLink.addEventListener('click', async (e) => {
  e.preventDefault();
  errorMessage.classList.add('hidden');

  const userEmail = localStorage.getItem('userEmail');
  if (!userEmail) {
    errorMessage.textContent = 'Session expired. Please log in again.';
    errorMessage.classList.remove('hidden');
    return;
  }

  try {
    const response = await fetch('/api/resend-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to resend code.');
    showResendStatus('A new verification code has been sent to your email.');
    startTimer();
  } catch (err) {
    errorMessage.textContent = err.message;
    errorMessage.classList.remove('hidden');
  }
});