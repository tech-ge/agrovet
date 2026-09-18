const Reports = (() => {
  const render = () => {
    document.getElementById('page-content').innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <input class="input" type="date" id="fromDate" />
          <input class="input" type="date" id="toDate" />
          <button class="btn btn-primary" id="applyBtn"><span data-icon="filter" data-size="14"></span> Apply</button>
          <button class="btn btn-ghost" id="resetBtn"><span data-icon="refresh" data-size="14"></span> Reset</button>
        </div>
      </div>

      <div class="stats-grid" id="summaryStats"></div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header"><h3>Top Products</h3></div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Product</th><th class="text-center">Qty</th><th class="text-right">Revenue</th><th class="text-right">Profit</th></tr></thead>
              <tbody id="topProductsBody"></tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Daily Breakdown</h3></div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Date</th><th class="text-center">Sales</th><th class="text-right">Revenue</th><th class="text-right">Profit</th></tr></thead>
              <tbody id="dailyBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Inventory Valuation</h3></div>
        <div id="inventoryReport" class="inventory-report"></div>
      </div>
    `;
    Icons.render(document.getElementById('page-content'));

    document.getElementById('applyBtn').addEventListener('click', load);
    document.getElementById('resetBtn').addEventListener('click', () => {
      document.getElementById('fromDate').value = '';
      document.getElementById('toDate').value = '';
      load();
    });

    load();
  };

  const load = async () => {
    const params = new URLSearchParams();
    const from = document.getElementById('fromDate').value;
    const to = document.getElementById('toDate').value;
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    try {
      const [pl, inv] = await Promise.all([
        API.get('/reports/profit-loss?' + params.toString()),
        API.get('/reports/inventory'),
      ]);

      const s = pl.summary;
      document.getElementById('summaryStats').innerHTML = `
        <div class="stat-card stat-green"><div class="stat-icon"><span data-icon="money" data-size="22"></span></div><div class="stat-body"><span class="stat-label">Total Revenue</span><span class="stat-value">${App.money(s.revenue)}</span></div></div>
        <div class="stat-card stat-amber"><div class="stat-icon"><span data-icon="box" data-size="22"></span></div><div class="stat-body"><span class="stat-label">Cost of Goods</span><span class="stat-value">${App.money(s.cost)}</span></div></div>
        <div class="stat-card stat-blue"><div class="stat-icon"><span data-icon="trendUp" data-size="22"></span></div><div class="stat-body"><span class="stat-label">Gross Profit</span><span class="stat-value">${App.money(s.profit)}</span></div></div>
        <div class="stat-card stat-purple"><div class="stat-icon"><span data-icon="receipt" data-size="22"></span></div><div class="stat-body"><span class="stat-label">Sales Count</span><span class="stat-value">${s.salesCount}</span></div></div>
        <div class="stat-card stat-teal"><div class="stat-icon"><span data-icon="layers" data-size="22"></span></div><div class="stat-body"><span class="stat-label">Items Sold</span><span class="stat-value">${s.itemsSold}</span></div></div>
      `;
      Icons.render(document.getElementById('summaryStats'));

      document.getElementById('topProductsBody').innerHTML = pl.topProducts.length
        ? pl.topProducts.map((p) => `
          <tr>
            <td>${App.escapeHtml(p.name)}</td>
            <td class="text-center">${p.quantity}</td>
            <td class="text-right">${App.money(p.revenue)}</td>
            <td class="text-right text-success">${App.money(p.profit)}</td>
          </tr>`).join('')
        : '<tr><td colspan="4" class="empty">No data</td></tr>';

      document.getElementById('dailyBody').innerHTML = pl.daily.length
        ? pl.daily.map((d) => `
          <tr>
            <td>${d._id}</td>
            <td class="text-center">${d.salesCount}</td>
            <td class="text-right">${App.money(d.revenue)}</td>
            <td class="text-right text-success">${App.money(d.profit)}</td>
          </tr>`).join('')
        : '<tr><td colspan="4" class="empty">No data</td></tr>';

      document.getElementById('inventoryReport').innerHTML = `
        <div class="inv-stats">
          <div><span class="muted">Products</span><strong>${inv.productCount}</strong></div>
          <div><span class="muted">Stock Value (cost)</span><strong>${App.money(inv.totalStockValue)}</strong></div>
          <div><span class="muted">Retail Value</span><strong>${App.money(inv.totalRetailValue)}</strong></div>
          <div><span class="muted">Potential Profit</span><strong class="text-success">${App.money(inv.potentialProfit)}</strong></div>
          <div><span class="muted">Low Stock Items</span><strong class="text-danger">${inv.lowStock.length}</strong></div>
        </div>
      `;
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const init = () => render();
  return { init };
})();