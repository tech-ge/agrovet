const App = (() => {
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard.html', icon: 'dashboard' },
    { id: 'products', label: 'Inventory', href: '/products.html', icon: 'box' },
    { id: 'sales', label: 'New Sale', href: '/sales.html', icon: 'cart' },
    { id: 'receipts', label: 'Receipts', href: '/receipts.html', icon: 'receipt' },
    { id: 'reports', label: 'Reports', href: '/reports.html', icon: 'chart' },
  ];

  const mount = ({ active, title }) => {
    const user = Auth.user();
    if (!Auth.isLoggedIn()) return (window.location.href = '/login.html');
    const isAdmin = user?.role === 'admin';
    if (!isAdmin && !['products', 'sales'].includes(active)) {
      return (window.location.href = '/products.html');
    }

    const visibleNavItems = isAdmin ? NAV_ITEMS : NAV_ITEMS.filter((item) => ['products', 'sales'].includes(item.id));
    const nav = visibleNavItems.map(
      (item) => `
        <a href="${item.href}" class="nav-link ${item.id === active ? 'active' : ''}">
          <span class="nav-icon" data-icon="${item.icon}" data-size="18"></span>
          <span>${item.label}</span>
        </a>`
    ).join('');

    const shell = document.getElementById('app-shell');
    shell.innerHTML = `
      <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <span class="brand-icon-sm" data-icon="leaf" data-size="22"></span>
          <span class="brand-name">Karen Agrovet</span>
        </div>
        <nav class="nav">${nav}</nav>
        <div class="sidebar-footer">
          <div class="user-chip">
            <div class="avatar">${(user?.name || 'A').charAt(0).toUpperCase()}</div>
            <div class="user-info">
              <span class="user-name">${user?.name || 'Admin'}</span>
              <span class="user-role">${user?.role || 'admin'}</span>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm btn-block btn-logout" onclick="Auth.logout()">
            <span data-icon="logout" data-size="14"></span> Logout
          </button>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <button class="menu-toggle" aria-label="Open navigation">
            <span data-icon="menu" data-size="22"></span>
          </button>
          <h1 class="page-title">${title}</h1>
          <div class="topbar-right">
            <span class="date-chip">${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </header>
        <main class="content" id="page-content"></main>
      </div>

      <div class="toast-container" id="toast-container"></div>
    `;

    Icons.render(shell);
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const closeSidebar = () => {
      sidebar?.classList.remove('open');
      backdrop?.classList.remove('visible');
    };
    document.querySelector('.menu-toggle')?.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      backdrop?.classList.toggle('visible', sidebar?.classList.contains('open'));
    });
    backdrop?.addEventListener('click', closeSidebar);
    document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', closeSidebar));
  };

  const toast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const icon = type === 'error' ? 'alert' : 'check';
    el.innerHTML = `<span data-icon="${icon}" data-size="16"></span><span>${escapeHtml(message)}</span>`;
    container.appendChild(el);
    Icons.render(el);
    setTimeout(() => {
      el.classList.add('hide');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  };

  const money = (n) =>
    'KES ' + Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (d) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const escapeHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const confirmDialog = (message) => window.confirm(message);

  const modal = (() => {
    const show = (html) => {
      let root = document.getElementById('modal-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'modal-root';
        document.body.appendChild(root);
      }
      root.innerHTML = `<div class="modal-backdrop"><div class="modal">${html}</div></div>`;
      root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', hide));
      root.querySelector('.modal-backdrop').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) hide();
      });
      Icons.render(root);
      return root;
    };
    const hide = () => {
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = '';
    };
    return { show, hide };
  })();

  return { mount, toast, money, fmtDate, escapeHtml, confirmDialog, modal };
})();
