const Purchases = (() => {
  const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const render = () => {
    document.getElementById('page-content').innerHTML = `
      <div class="toolbar"><div class="toolbar-left"><input class="input" type="date" id="fromDate" /><input class="input" type="date" id="toDate" /><button class="btn btn-primary" id="applyPurchases">Apply</button><button class="btn btn-ghost" id="currentMonth">This month</button></div></div>
      <div class="stats-grid" id="purchaseStats"></div>
      <div class="card"><div class="table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Product</th><th class="text-center">Qty received</th><th>Supplier</th><th>Invoice / reference</th><th class="text-right">Unit cost</th><th class="text-right">Total paid</th><th>Received by</th><th>Notes</th></tr></thead><tbody id="purchasesBody"></tbody></table></div></div>
    `;
    const now = new Date();
    document.getElementById('fromDate').value = dateValue(new Date(now.getFullYear(), now.getMonth(), 1));
    document.getElementById('toDate').value = dateValue(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    document.getElementById('applyPurchases').addEventListener('click', load);
    document.getElementById('currentMonth').addEventListener('click', () => {
      const today = new Date();
      document.getElementById('fromDate').value = dateValue(new Date(today.getFullYear(), today.getMonth(), 1));
      document.getElementById('toDate').value = dateValue(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      load();
    });
    load();
  };

  const load = async () => {
    const params = new URLSearchParams();
    const from = document.getElementById('fromDate').value;
    const to = document.getElementById('toDate').value;
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    try {
      const { purchases } = await API.get('/purchases?' + params.toString());
      const quantity = purchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
      const paid = purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0);
      document.getElementById('purchaseStats').innerHTML = `
        <div class="stat-card stat-green"><div class="stat-body"><span class="stat-label">Purchase entries</span><span class="stat-value">${purchases.length}</span></div></div>
        <div class="stat-card stat-blue"><div class="stat-body"><span class="stat-label">Units received</span><span class="stat-value">${quantity}</span></div></div>
        <div class="stat-card stat-amber"><div class="stat-body"><span class="stat-label">Total purchase spend</span><span class="stat-value">${App.money(paid)}</span></div></div>
      `;
      document.getElementById('purchasesBody').innerHTML = purchases.length ? purchases.map((purchase) => `
        <tr><td>${App.fmtDate(purchase.createdAt)}</td><td>${App.escapeHtml(purchase.productName)}</td><td class="text-center">${purchase.quantity}</td><td>${App.escapeHtml(purchase.supplier || '—')}</td><td>${App.escapeHtml(purchase.reference || '—')}</td><td class="text-right">${App.money(purchase.unitCost)}</td><td class="text-right"><strong>${App.money(purchase.totalCost)}</strong></td><td>${App.escapeHtml(purchase.receivedBy?.name || '—')}</td><td>${App.escapeHtml(purchase.notes || '—')}</td></tr>`).join('') : '<tr><td colspan="9" class="empty">No purchases for this period</td></tr>';
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const init = () => render();
  return { init };
})();