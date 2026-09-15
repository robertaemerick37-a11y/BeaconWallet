const adminKeyInput = document.getElementById('admin-key');
const loadUsersButton = document.getElementById('load-users-btn');
const usersBody = document.getElementById('users-body');
const adminMessage = document.getElementById('admin-message');
const usersCount = document.getElementById('users-count');

function showMessage(message) {
  adminMessage.textContent = message;
  adminMessage.classList.remove('hidden');
}

function clearMessage() {
  adminMessage.textContent = '';
  adminMessage.classList.add('hidden');
}

function adminHeaders() {
  return { 'x-admin-key': adminKeyInput.value.trim() };
}

function renderUsers(users) {
  if (usersCount) usersCount.textContent = users.length;
  usersBody.replaceChildren();
  if (!users.length) {
    usersBody.innerHTML = '<tr><td colspan="4">No registered users.</td></tr>';
    return;
  }

  users.forEach((user) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(user.username)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>Stored securely (hashed)</td>
      <td>
        <button type="button" class="restriction-btn" data-user-id="${user.id}" data-user-email="${escapeHtml(user.email)}" data-restricted="${user.is_restricted}">${user.is_restricted ? 'Restore access' : 'Restrict access'}</button>
        <button type="button" class="delete-btn" data-user-id="${user.id}">Delete</button>
      </td>
    `;
    usersBody.appendChild(row);
  });
}

function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = value ?? '';
  return element.innerHTML;
}

async function loadUsers() {
  clearMessage();
  if (!adminKeyInput.value.trim()) {
    showMessage('Enter the admin key.');
    return;
  }

  try {
    const response = await fetch('/api/admin/users', { headers: adminHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load users.');
    renderUsers(data.users);
  } catch (error) {
    showMessage(error.message);
  }
}

loadUsersButton.addEventListener('click', loadUsers);
adminKeyInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') loadUsers();
});

usersBody.addEventListener('click', async (event) => {
  const restrictionButton = event.target.closest('.restriction-btn');
  if (restrictionButton) {
    const currentlyRestricted = restrictionButton.dataset.restricted === 'true';
    const action = currentlyRestricted ? 'restore access for' : 'restrict access for';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    clearMessage();
    restrictionButton.disabled = true;
    try {
      const response = await fetch(`/api/admin/users/${restrictionButton.dataset.userId}/restriction`, {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ restricted: !currentlyRestricted })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update user access.');
      if (!currentlyRestricted) {
        localStorage.setItem('beacon-account-restricted', JSON.stringify({
          email: restrictionButton.dataset.userEmail,
          timestamp: Date.now()
        }));
      }
      await loadUsers();
    } catch (error) {
      restrictionButton.disabled = false;
      showMessage(error.message);
    }
    return;
  }

  const button = event.target.closest('.delete-btn');
  if (!button) return;
  if (!window.confirm('Delete this user permanently?')) return;

  clearMessage();
  button.disabled = true;
  try {
    const response = await fetch(`/api/admin/users/${button.dataset.userId}`, {
      method: 'DELETE',
      headers: adminHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to delete user.');
    await loadUsers();
  } catch (error) {
    button.disabled = false;
    showMessage(error.message);
  }
});
