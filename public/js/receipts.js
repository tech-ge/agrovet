const Receipts = (() => {
  const render = () => {
    document.getElementById('page-content').innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="input-wrap">
            <span data-icon="search" data-size="16"></span>
            <input class="input" id="receiptSearch" placeholder="Search receipt or customer" />
          </div>
          <input class="input" type="date" id="fromDate" />
          <input class="input" type="date" id="toDate" />
        </div>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th>Customer</th>
                <th class="text-center">Items</th>
                <th class="text-right">Total</th>
                <th class="text-right">Profit</th>
                <th>Payment</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="receiptsBody"><tr><td colspan="8" class="empty">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>
    `;
    Icons.render(document.getElementById('page-content'));

    document.getElementById('receiptSearch').addEventListener('input', debounce(load, 300));
    document.getElementById('fromDate').addEventListener('change', load);
    document.getElementById('toDate').addEventListener('change', load);

    document.getElementById('receiptsBody').addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === 'view') return view(id);
      if (btn.dataset.action === 'refund') return refund(id);
    });
  };

  const debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  const load = async () => {
    const params = new URLSearchParams();
    const search = document.getElementById('receiptSearch').value.trim();
    const from = document.getElementById('fromDate').value;
    const to = document.getElementById('toDate').value;
    if (search) params.append('search', search);
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    try {
      const data = await API.get('/sales?' + params.toString());
      const body = document.getElementById('receiptsBody');
      if (!data.sales.length) {
        body.innerHTML = '<tr><td colspan="8" class="empty">No receipts found</td></tr>';
        return;
      }
      body.innerHTML = data.sales
        .map(
          (s) => `
        <tr>
          <td><strong title="Unique verification ID">${App.escapeHtml(s.receiptNumber)}</strong></td>
          <td>${App.fmtDate(s.createdAt)}</td>
          <td>${App.escapeHtml(s.customerName)}</td>
          <td class="text-center">${s.items.reduce((a, i) => a + i.quantity, 0)}</td>
          <td class="text-right"><strong>${App.money(s.total)}</strong></td>
          <td class="text-right ${s.totalProfit >= 0 ? 'text-success' : 'text-danger'}">${App.money(s.totalProfit)}</td>
          <td><span class="badge badge-${s.paymentStatus}">${s.paymentMethod} • ${s.paymentStatus}</span></td>
          <td class="text-right">
            <button class="btn btn-ghost btn-sm" data-action="view" data-id="${s._id}" title="View"><span data-icon="receipt" data-size="14"></span></button>
            ${s.paymentStatus === 'paid' ? `<button class="btn btn-ghost btn-sm text-danger" data-action="refund" data-id="${s._id}" title="Refund"><span data-icon="refresh" data-size="14"></span></button>` : ''}
          </td>
        </tr>`
        )
        .join('');
      Icons.render(body);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const view = async (id) => {
    try {
      const { sale } = await API.get(`/sales/${id}`);
      openReceiptModal(sale);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const openReceiptModal = (sale) => {
    const itemsRows = sale.items
      .map(
        (i) => `
      <tr>
        <td>${App.escapeHtml(i.name)}</td>
        <td class="text-center">${i.quantity}</td>
        <td class="text-right">${App.money(i.sellingPrice)}</td>
        <td class="text-right">${App.money(i.subtotal)}</td>
      </tr>`
      )
      .join('');

    const root = App.modal.show(`
      <div class="receipt-print" id="receiptPrint">
        <div class="receipt-header">
          <h2>Karen Agrovet</h2>
          <p class="muted">Stock Management System</p>
        </div>
        <div class="receipt-meta">
          <div><strong>Receipt No. / Verification ID:</strong> ${App.escapeHtml(sale.receiptNumber)}</div>
          <div><strong>Date:</strong> ${App.fmtDate(sale.createdAt)}</div>
          <div><strong>Customer:</strong> ${App.escapeHtml(sale.customerName)}</div>
          ${sale.customerPhone ? `<div><strong>Phone:</strong> ${App.escapeHtml(sale.customerPhone)}</div>` : ''}
          <div><strong>Payment:</strong> ${sale.paymentMethod} (${sale.paymentStatus})</div>
        </div>
        <table class="receipt-table">
          <thead>
            <tr><th>Item</th><th class="text-center">Qty</th><th class="text-right">Price</th><th class="text-right">Subtotal</th></tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>
        <div class="receipt-totals">
          <div><span>Subtotal</span><span>${App.money(sale.subtotal)}</span></div>
          ${sale.discount ? `<div><span>Discount</span><span>-${App.money(sale.discount)}</span></div>` : ''}
          ${sale.tax ? `<div><span>Tax</span><span>${App.money(sale.tax)}</span></div>` : ''}
          <div class="total"><span>Total</span><span>${App.money(sale.total)}</span></div>
        </div>
        <p class="receipt-footer">Thank you for your shopping!</p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Close</button>
        <button class="btn btn-primary" id="printReceiptBtn"><span data-icon="print" data-size="14"></span> Print</button>
      </div>
    `);

    root.querySelector('.modal')?.classList.add('modal-lg');
    document.getElementById('printReceiptBtn').addEventListener('click', () => window.print());
  };

  const refund = async (id) => {
    if (!App.confirmDialog('Refund this sale? Stock will be restored and the sale marked as refunded.')) return;
    try {
      await API.post(`/sales/${id}/refund`);
      App.toast('Sale refunded');
      load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const init = () => {
    render();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) view(id);
    else load();
  };

  return { init };
})();
