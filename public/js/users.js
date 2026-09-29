const Users = (() => {
  const render = () => {
    document.getElementById('page-content').innerHTML = `
      <div class="toolbar"><h2>Staff and customer accounts</h2><button class="btn btn-primary" id="addStaff"><span data-icon="plus" data-size="16"></span> Create Staff Account</button></div>
      <div class="card"><div class="table-wrapper"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th class="text-right">Access</th></tr></thead><tbody id="usersBody"></tbody></table></div></div>
    `;
    Icons.render(document.getElementById('page-content'));
    document.getElementById('addStaff').addEventListener('click', openStaffForm);
    document.getElementById('usersBody').addEventListener('click', toggleUser);
    load();
  };

  const load = async () => {
    try {
      const { users } = await API.get('/users');
      const currentUser = Auth.user();
      document.getElementById('usersBody').innerHTML = users.map((user) => `
        <tr><td><strong>${App.escapeHtml(user.name)}</strong></td><td>${App.escapeHtml(user.email)}</td><td><span class="badge">${App.escapeHtml(user.role)}</span></td><td>${user.isActive ? 'Active' : 'Disabled'}</td><td>${App.fmtDate(user.createdAt)}</td><td class="text-right">${user.role === 'admin' || user._id === currentUser?._id ? '—' : `<button class="btn btn-ghost btn-sm" data-user-id="${user._id}" data-active="${user.isActive}">${user.isActive ? 'Disable' : 'Enable'}</button>`}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No accounts found</td></tr>';
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const openStaffForm = () => {
    App.modal.show(`
      <h3>Create Staff Account</h3>
      <form id="staffForm">
        <div class="form-group"><label>Full name *</label><input class="input" name="name" required /></div>
        <div class="form-group"><label>Email *</label><input class="input" type="email" name="email" required /></div>
        <div class="form-group"><label>Temporary password *</label><input class="input" type="password" name="password" minlength="6" required /></div>
      </form>
      <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="createStaffBtn">Create Account</button></div>
    `);
    document.getElementById('createStaffBtn').addEventListener('click', async () => {
      const form = document.getElementById('staffForm');
      if (!form.reportValidity()) return;
      const fields = new FormData(form);
      try {
        await API.post('/users', { name: fields.get('name').trim(), email: fields.get('email').trim(), password: fields.get('password') });
        App.modal.hide();
        App.toast('Staff account created');
        load();
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  };

  const toggleUser = async (event) => {
    const button = event.target.closest('button[data-user-id]');
    if (!button) return;
    const isActive = button.dataset.active !== 'true';
    try {
      await API.patch(`/users/${button.dataset.userId}/status`, { isActive });
      App.toast(isActive ? 'Account enabled' : 'Account disabled');
      load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const init = () => render();
  return { init };
})();