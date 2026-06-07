// Profile dropdown functionality
const profileTrigger = document.getElementById('profile-trigger');
const profileDropdown = document.getElementById('profile-dropdown');
const usernameElement = document.querySelector('.profile-trigger .username');

// Display username from localStorage
let username = localStorage.getItem('username');
const userEmail = localStorage.getItem('userEmail');
const userPassword = localStorage.getItem('userPassword');
let displayName = username || (userEmail ? userEmail.split('@')[0] : 'User');

async function refreshProfileIfNeeded() {
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
      console.error('Profile lookup failed:', error);
    }
  }
}

refreshProfileIfNeeded().then(() => {
  if (displayName) {
    usernameElement.textContent = displayName;
    document.getElementById('display-username').textContent = displayName;
  }
  document.getElementById('display-email').textContent = userEmail || 'No email set';
});

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

// Display user information
// values are set after profile refresh above

// Password visibility toggle
const togglePasswordBtn = document.getElementById('toggle-password-btn');
const displayPassword = document.getElementById('display-password');

displayPassword.value = userPassword || '********';

togglePasswordBtn.addEventListener('click', () => {
  if (displayPassword.type === 'password') {
    displayPassword.type = 'text';
    displayPassword.value = userPassword || '********';
    togglePasswordBtn.textContent = 'Hide';
  } else {
    displayPassword.type = 'password';
    displayPassword.value = userPassword ? userPassword : '********';
    togglePasswordBtn.textContent = 'Show';
  }
});

// Change Email Modal
const changeEmailBtn = document.getElementById('change-email-btn');
const changeEmailModal = document.getElementById('change-email-modal');
const emailModalCancel = document.getElementById('email-modal-cancel');
const changeEmailForm = document.getElementById('change-email-form');
const emailModalError = document.getElementById('email-modal-error');

const changePasswordBtn = document.getElementById('change-password-btn');
const changePasswordModal = document.getElementById('change-password-modal');
const passwordModalCancel = document.getElementById('password-modal-cancel');
const changePasswordForm = document.getElementById('change-password-form');
const passwordModalError = document.getElementById('password-modal-error');

const emailModalSubmitBtn = changeEmailForm ? changeEmailForm.querySelector('button[type="submit"]') : null;
const passwordModalSubmitBtn = changePasswordForm ? changePasswordForm.querySelector('button[type="submit"]') : null;

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

changeEmailBtn.addEventListener('click', () => {
  changeEmailModal.classList.remove('hidden');
  document.getElementById('email-password').focus();
});

emailModalCancel.addEventListener('click', () => {
  changeEmailModal.classList.add('hidden');
  changeEmailForm.reset();
  emailModalError.classList.add('hidden');
});

changeEmailModal.querySelector('.modal-overlay').addEventListener('click', () => {
  changeEmailModal.classList.add('hidden');
  changeEmailForm.reset();
  emailModalError.classList.add('hidden');
});

changeEmailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  emailModalError.classList.add('hidden');

  const password = document.getElementById('email-password').value;
  const newEmail = document.getElementById('new-email').value;

  try {
    setLoading(emailModalSubmitBtn, true, 'Saving...');
    // TODO: Implement backend API for changing email
    alert('Email change functionality will be implemented with backend integration.');
    changeEmailModal.classList.add('hidden');
    changeEmailForm.reset();
    setLoading(emailModalSubmitBtn, false);
  } catch (err) {
    setLoading(emailModalSubmitBtn, false);
    emailModalError.textContent = err.message;
    emailModalError.classList.remove('hidden');
  }
});

// Change Password Modal
changePasswordBtn.addEventListener('click', () => {
  changePasswordModal.classList.remove('hidden');
  document.getElementById('current-password').focus();
});

passwordModalCancel.addEventListener('click', () => {
  changePasswordModal.classList.add('hidden');
  changePasswordForm.reset();
  passwordModalError.classList.add('hidden');
});

changePasswordModal.querySelector('.modal-overlay').addEventListener('click', () => {
  changePasswordModal.classList.add('hidden');
  changePasswordForm.reset();
  passwordModalError.classList.add('hidden');
});

changePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  passwordModalError.classList.add('hidden');

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-new-password').value;

  if (newPassword !== confirmPassword) {
    passwordModalError.textContent = 'New passwords do not match!';
    passwordModalError.classList.remove('hidden');
    return;
  }

  try {
    setLoading(passwordModalSubmitBtn, true, 'Saving...');
    // TODO: Implement backend API for changing password
    alert('Password change functionality will be implemented with backend integration.');
    changePasswordModal.classList.add('hidden');
    changePasswordForm.reset();
    setLoading(passwordModalSubmitBtn, false);
  } catch (err) {
    setLoading(passwordModalSubmitBtn, false);
    passwordModalError.textContent = err.message;
    passwordModalError.classList.remove('hidden');
  }
});
