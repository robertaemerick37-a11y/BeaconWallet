const activeUserEmail = localStorage.getItem('userEmail');
let restrictionNoticeShown = false;

window.addEventListener('storage', (event) => {
  if (event.key !== 'beacon-account-restricted' || !event.newValue) return;
  try {
    const restriction = JSON.parse(event.newValue);
    if (restriction.email === activeUserEmail) {
      signOutRestrictedUser('Your account has been placed on hold.');
    }
  } catch (error) {
    console.error('Account restriction notification failed:', error);
  }
});

function signOutRestrictedUser(message) {
  if (restrictionNoticeShown) return;
  restrictionNoticeShown = true;
  localStorage.removeItem('userEmail');
  localStorage.removeItem('username');
  sessionStorage.clear();
  window.alert(message || 'Your account has been placed on hold.');
  window.location.replace('index.html');
}

async function checkAccountAccess() {
  if (!activeUserEmail) {
    window.location.replace('index.html');
    return;
  }

  try {
    const response = await fetch(`/api/profile?email=${encodeURIComponent(activeUserEmail)}`, {
      cache: 'no-store'
    });
    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      signOutRestrictedUser(data.error);
    } else if (response.status === 404) {
      signOutRestrictedUser('Your account is no longer available.');
    }
  } catch (error) {
    console.error('Account access check failed:', error);
  }
}

checkAccountAccess();
setInterval(checkAccountAccess, 5000);
