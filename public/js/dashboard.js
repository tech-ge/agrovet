const Dashboard = (() => {
  const render = async () => {
    if (Auth.user()?.role === 'staff') return renderStaff();
    try {
      const { data } = await API.get('/reports/dashboard');
      const content = document.getElementById('page-content');

      const cards = [
        { label: "Today's Revenue", value: App.money(data.today.revenue), icon: 'money', cls: 'stat-green' },
        { label: "Today's Profit", value: App.money(data.today.profit), icon: 'trendUp', cls: 'stat-blue' },
        { label: "Today's Sales", value: data.today.count, icon: 'receipt', cls: 'stat-purple' },
        { label: 'Month Revenue', value: App.money(data.month.revenue), icon: 'calendar', cls: 'stat-teal' },
        { label: 'Month Profit', value: App.money(data.month.profit), icon: 'coins', cls: 'stat-amber' },
        { label: 'Products', value: data.totalProducts, icon: 'box', cls: 'stat-slate' },
        { label: 'Low Stock', value: data.lowStockCount, icon: 'alert', cls: data.lowStockCount ? 'stat-red' : 'stat-slate' },
      ];

      content.innerHTML = `
        <div class="stats-grid">
          ${cards
            .map(
              (c) => `
            <div class="stat-card ${c.cls}">
              <div class="stat-icon"><span data-icon="${c.icon}" data-size="22"></span></div>
              <div class="stat-body">
                <span class="stat-label">${c.label}</span>
                <span class="stat-value">${c.value}</span>
              </div>
            </div>`
            )
            .join('')}
        </div>

        <div class="dashboard-grid">
          <div class="card">
            <div class="card-header">
              <h3>Recent Sales</h3>
              <a href="/receipts.html" class="link">View all</a>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr><th>Receipt</th><th>Customer</th><th class="text-right">Total</th><th>Time</th></tr>
                </thead>
                <tbody>
                  ${data.recentSales.length
                    ? data.recentSales
                        .map(
                          (s) => `
                    <tr>
                      <td>${App.escapeHtml(s.receiptNumber)}</td>
                      <td>${App.escapeHtml(s.customerName)}</td>
                      <td class="text-right">${App.money(s.total)}</td>
                      <td>${App.fmtDate(s.createdAt)}</td>
                    </tr>`
                        )
                        .join('')
                    : '<tr><td colspan="4" class="empty">No sales yet</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3>Quick Actions</h3></div>
            <div class="quick-actions">
              <a href="/sales.html" class="quick-action"><span class="qa-icon" data-icon="cartPlus" data-size="22"></span><div><strong>New Sale</strong><small>Record a sale</small></div></a>
              <a href="/products.html" class="quick-action"><span class="qa-icon" data-icon="box" data-size="22"></span><div><strong>Add Product</strong><small>Manage inventory</small></div></a>
              <a href="/reports.html" class="quick-action"><span class="qa-icon" data-icon="chart" data-size="22"></span><div><strong>Reports</strong><small>Profit and loss</small></div></a>
              <a href="/receipts.html" class="quick-action"><span class="qa-icon" data-icon="receipt" data-size="22"></span><div><strong>Receipts</strong><small>View and print</small></div></a>
            </div>
          </div>
        </div>
      `;
      Icons.render(content);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const renderStaff = async () => {
    try {
      const { products } = await API.get('/products');
      const productsById = new Map(products.map((product) => [product._id, product]));
      const unavailable = products.filter((product) => product.stock <= 0 && (product.alternatives || []).length);
      const content = document.getElementById('page-content');

      content.innerHTML = `
        <section class="card staff-alternatives-panel">
          <div class="card-header">
            <h3>Alternatives to offer</h3>
            <a href="/sales.html" class="link">New sale</a>
          </div>
          <div class="staff-alternative-list">
            ${unavailable.length ? unavailable.map((product) => {
              const alternatives = product.alternatives
                .map((id) => productsById.get(String(id?._id || id)))
                .filter(Boolean);
              return `
                <article class="staff-alternative-product">
                  <div class="staff-alternative-source">
                    <strong>${App.escapeHtml(product.name)}</strong>
                    <span class="badge">Out of stock</span>
                  </div>
                  ${product.alternativeDescription ? `<p class="muted">${App.escapeHtml(product.alternativeDescription)}</p>` : ''}
                  <div class="staff-alternative-options">
                    ${alternatives.map((alternative) => `
                      <div class="staff-alternative-option">
                        <span><strong>${App.escapeHtml(alternative.name)}</strong><span class="muted">${App.money(alternative.sellingPrice)} - ${alternative.stock} in stock</span></span>
                        ${alternative.stock > 0
                          ? `<a class="btn btn-ghost btn-sm" href="/sales.html?product=${encodeURIComponent(alternative._id)}">Sell</a>`
                          : '<span class="badge">Out of stock</span>'}
                      </div>`).join('')}
                  </div>
                </article>`;
            }).join('') : '<p class="empty">No out-of-stock products with alternatives.</p>'}
          </div>
        </section>
      `;
      Icons.render(content);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const init = () => render();
  return { init };
})();