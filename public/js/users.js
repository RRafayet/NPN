// ===== User Management (Admin) =====

async function loadManageUsers() {
  try {
    var data = await api('/api/users');
    var tbody = document.getElementById('manage-users-body');
    if (!data.users || data.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;">No users found.</td></tr>';
      return;
    }
    tbody.innerHTML = data.users.map(function(u) {
      var isActive = u.is_active !== 0;
      var roleBadge = u.role === 'admin'
        ? '<span class="badge badge-in_progress">IT Staff</span>'
        : '<span class="badge" style="background:#6c757d;color:#fff;">Employee</span>';
      var statusBadgeHtml = isActive
        ? '<span class="badge badge-open" style="background:#28a745;">Active</span>'
        : '<span class="badge" style="background:#dc3545;color:#fff;">Inactive</span>';
      var isSelf = currentUser && u.id === currentUser.id;
      var toggleLabel = isActive ? 'Deactivate' : 'Activate';
      var toggleClass = isActive ? 'btn btn-sm' : 'btn btn-sm btn-primary';
      var toggleBtn = isSelf
        ? ''
        : '<button class="' + toggleClass + '" style="margin-left:6px;" onclick="toggleUserActive(' + u.id + ',' + (isActive ? 1 : 0) + ')">' + toggleLabel + '</button>';
      return '<tr>' +
        '<td>' + escapeHtml(u.name) + (isSelf ? ' <span style="font-size:11px;color:#999;">(you)</span>' : '') + '</td>' +
        '<td>' + escapeHtml(u.email) + '</td>' +
        '<td>' + roleBadge + '</td>' +
        '<td>' + statusBadgeHtml + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-outline" onclick="openUserModal(' + u.id + ')">Edit</button>' +
          toggleBtn +
        '</td>' +
        '</tr>';
    }).join('');
  } catch (e) {
    console.error(e);
  }
}

function openUserModal(userId) {
  var modal = document.getElementById('user-modal');
  var form = document.getElementById('user-modal-form');
  var errEl = document.getElementById('user-modal-error');
  form.reset();
  errEl.classList.remove('visible');
  errEl.style.color = '';

  if (userId) {
    document.getElementById('user-modal-title').textContent = 'Edit User';
    document.getElementById('user-edit-id').value = userId;
    document.getElementById('user-password-group').style.display = 'none';
    document.getElementById('user-password').required = false;
    // Find user from current table data
    api('/api/users').then(function(data) {
      var u = data.users.find(function(x) { return x.id === userId; });
      if (u) {
        document.getElementById('user-name').value = u.name;
        document.getElementById('user-email').value = u.email;
        document.getElementById('user-email').disabled = true;
        document.getElementById('user-role').value = u.role;
      }
    });
  } else {
    document.getElementById('user-modal-title').textContent = 'Add User';
    document.getElementById('user-edit-id').value = '';
    document.getElementById('user-password-group').style.display = '';
    document.getElementById('user-password').required = true;
    document.getElementById('user-email').disabled = false;
  }

  modal.classList.add('active');
}

function closeUserModal() {
  document.getElementById('user-modal').classList.remove('active');
  document.getElementById('user-email').disabled = false;
}

function initManageUsers() {
  document.getElementById('btn-new-user').addEventListener('click', function() {
    openUserModal(null);
  });

  document.getElementById('user-save-btn').addEventListener('click', async function() {
    var errEl = document.getElementById('user-modal-error');
    errEl.classList.remove('visible');
    var editId = document.getElementById('user-edit-id').value;
    var name = document.getElementById('user-name').value.trim();
    var email = document.getElementById('user-email').value.trim();
    var password = document.getElementById('user-password').value;
    var role = document.getElementById('user-role').value;

    if (!name || !email) {
      errEl.textContent = 'Name and email are required';
      errEl.classList.add('visible');
      return;
    }
    if (!editId && password.length < 6) {
      errEl.textContent = 'Password must be at least 6 characters';
      errEl.classList.add('visible');
      return;
    }

    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      if (editId) {
        await api('/api/users/' + editId, {
          method: 'PUT',
          body: { name: name, role: role, is_active: 1 }
        });
      } else {
        await api('/api/users', {
          method: 'POST',
          body: { name: name, email: email, password: password, role: role }
        });
      }
      closeUserModal();
      loadManageUsers();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.add('visible');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  });
}

async function toggleUserActive(userId, currentlyActive) {
  var action = currentlyActive ? 'deactivate' : 'activate';
  if (!confirm('Are you sure you want to ' + action + ' this user?')) return;
  try {
    await api('/api/users/' + userId, {
      method: 'PUT',
      body: { is_active: currentlyActive ? 0 : 1 }
    });
    loadManageUsers();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}
