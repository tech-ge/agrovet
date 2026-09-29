const Sales = (() => {
  let cart = [];
  let products = [];
  let discount = 0;
  let tax = 0;

  const render = () => {
    const isAdmin = Auth.user()?.role === 'admin';
    document.getElementById('page-content').innerHTML = `
      <div class="pos-grid">
        <section class="pos-products card">
          <div class="pos-search input-wrap">
            <span data-icon="search" data-size="16"></span>
            <input class="input" id="productSearch" placeholder="Search product" autocomplete="off" />
          </div>
          <div class="product-list" id="productList"></div>
        </section>

        <section class="pos-cart card">
          <header class="cart-header">
            <h3><span data-icon="cart" data-size="18"></span> Cart</h3>
            <button class="btn btn-ghost btn-sm" id="clearCartBtn"><span data-icon="trash" data-size="14"></span> Clear</button>
          </header>
          <div class="cart-items" id="cartItems"></div>

          <div class="cart-summary">
            <div class="summary-row"><span>Subtotal</span><span id="sumSubtotal">KES 0.00</span></div>
            <div class="summary-row">
              <span>Discount</span>
              <input class="input input-sm" type="number" min="0" step="0.01" id="discountInput" value="0" />
            </div>
            <div class="summary-row">
              <span>Tax</span>
              <input class="input input-sm" type="number" min="0" step="0.01" id="taxInput" value="0" />
            </div>
            <div class="summary-row total"><span>Total</span><span id="sumTotal">KES 0.00</span></div>
            <div class="summary-row profit"><span>Profit</span><span id="sumProfit">KES 0.00</span></div>
          </div>

          <div class="cart-customer">
            <input class="input" id="customerName" placeholder="Customer name (optional)" />
            <input class="input" id="customerPhone" placeholder="Phone (optional)" />
            <input class="input" type="email" id="customerEmail" value="geoffreymuthoka200@gmail.com" readonly />
            <select class="input" id="paymentMethod">
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="paystack">Paystack</option>
            </select>
          </div>

          ${isAdmin ? '<button class="btn btn-primary btn-block" id="checkoutBtn" disabled>Complete Sale</button>' : '<p class="muted staff-note">Staff can prepare the cart. An administrator must complete the sale.</p>'}
        </section>
      </div>
    `;

    Icons.render(document.getElementById('page-content'));
    bindEvents();
    renderProductList();
    renderCart();
  };

  const bindEvents = () => {
    document.getElementById('productSearch').addEventListener('input', renderProductList);
    document.getElementById('discountInput').addEventListener('input', (e) => {
      discount = Number(e.target.value) || 0;
      renderCart();
    });
    document.getElementById('taxInput').addEventListener('input', (e) => {
      tax = Number(e.target.value) || 0;
      renderCart();
    });
    document.getElementById('clearCartBtn').addEventListener('click', () => {
      if (cart.length && App.confirmDialog('Clear the cart?')) {
        cart = [];
        renderCart();
      }
    });
    document.getElementById('checkoutBtn')?.addEventListener('click', checkout);
    document.getElementById('cartItems').addEventListener('change', (e) => {
      const input = e.target.closest('input[data-field]');
      if (!input) return;
      const item = cart[Number(input.dataset.idx)];
      if (!item) return;
      const value = Number(input.value);
      item[input.dataset.field] = input.dataset.field === 'quantity'
        ? Math.max(1, Math.min(item.stock, Math.floor(value || 1)))
        : Math.max(0, value || 0);
      renderCart();
    });
    document.getElementById('cartItems').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const idx = Number(btn.dataset.idx);
      const action = btn.dataset.action;
      if (action === 'remove') cart.splice(idx, 1);
      renderCart();
    });
  };

  const renderProductList = () => {
    const term = document.getElementById('productSearch').value.toLowerCase();
    const list = products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.sku || '').toLowerCase().includes(term)
    );
    const el = document.getElementById('productList');
    if (!list.length) {
      el.innerHTML = '<p class="empty">No products found</p>';
      return;
    }
    el.innerHTML = list
      .map(
        (p) => `
        <div class="product-card ${p.stock <= 0 ? 'disabled' : ''}" data-id="${p._id}">
          <div class="product-info">
            <strong>${App.escapeHtml(p.name)}</strong>
            <span class="muted">${App.money(p.sellingPrice)} • ${App.escapeHtml(p.unit || 'pcs')}</span>
            <span class="stock-pill ${p.stock <= p.lowStockThreshold ? 'stock-low' : 'stock-ok'}">${p.stock} left</span>
          </div>
          <button class="btn btn-primary btn-sm" ${p.stock <= 0 ? 'disabled' : ''}>
            <span data-icon="plus" data-size="14"></span> Add
          </button>
        </div>`
      )
      .join('');
    Icons.render(el);

    el.querySelectorAll('.product-card').forEach((card) => {
      card.addEventListener('click', () => {
        const p = products.find((x) => x._id === card.dataset.id);
        if (p && p.stock > 0) addToCart(p);
      });
    });
  };

  const addToCart = (p) => {
    const existing = cart.find((c) => c.product === p._id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + 1 > p.stock) return App.toast('Not enough stock', 'error');

    if (existing) existing.quantity += 1;
    else
      cart.push({
        product: p._id,
        name: p.name,
        quantity: 1,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        stock: p.stock,
      });
    renderCart();
  };

  const renderCart = () => {
    const itemsEl = document.getElementById('cartItems');
    if (!cart.length) {
      itemsEl.innerHTML = '<p class="empty">Cart is empty. Tap products to add.</p>';
    } else {
      itemsEl.innerHTML = cart
        .map(
          (item, idx) => `
        <div class="cart-item">
          <div class="cart-item-info">
            <strong>${App.escapeHtml(item.name)}</strong>
            <span class="muted">Buying ${App.money(item.costPrice)} • Profit ${App.money((item.sellingPrice - item.costPrice) * item.quantity)}</span>
          </div>
          <div class="cart-item-actions">
            <label class="sale-field-label">Items
            <input class="input input-sm sale-quantity" type="number" min="1" max="${item.stock}" value="${item.quantity}" data-field="quantity" data-idx="${idx}" aria-label="Number of items" />
            </label>
            <label class="sale-field-label">Sale price
            <input class="input input-sm sale-price" type="number" min="0" step="0.01" value="${item.sellingPrice}" data-field="sellingPrice" data-idx="${idx}" aria-label="Amount to sell" />
            </label>
            <button class="qty-btn danger" data-action="remove" data-idx="${idx}"><span data-icon="close" data-size="12"></span></button>
          </div>
        </div>`
        )
        .join('');
      Icons.render(itemsEl);
    }

    const subtotal = cart.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
    const cost = cart.reduce((s, i) => s + i.costPrice * i.quantity, 0);
    const profit = subtotal - cost - discount;
    const total = subtotal - discount + tax;

    document.getElementById('sumSubtotal').textContent = App.money(subtotal);
    document.getElementById('sumTotal').textContent = App.money(Math.max(total, 0));
    document.getElementById('sumProfit').textContent = App.money(profit);
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
  };

  const checkout = async () => {
    if (!cart.length) return;
    const btn = document.getElementById('checkoutBtn');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    try {
      const payload = {
        items: cart.map((i) => ({ product: i.product, quantity: i.quantity })),
        discount,
        tax,
        paymentMethod: document.getElementById('paymentMethod').value,
        paymentStatus: 'paid',
        customerName: document.getElementById('customerName').value.trim() || 'Walk-in Customer',
        customerPhone: document.getElementById('customerPhone').value.trim(),
        customerEmail: document.getElementById('customerEmail').value.trim(),
      };
      if (payload.paymentMethod === 'paystack') {
        const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
        const total = Math.max(subtotal - discount + tax, 0);
        const payment = await API.post('/payments/initialize', { amount: total });
        const paymentResult = await new Promise((resolve, reject) => {
          Paystack.pay({
            email: 'geoffreymuthoka200@gmail.com',
            amount: total,
            key: payment.publicKey,
            onSuccess: resolve,
            onCancel: reject,
          });
        });
        await API.get(`/payments/verify/${encodeURIComponent(paymentResult.reference)}`);
        payload.paymentReference = paymentResult.reference;
        payload.paymentStatus = 'paid';
        App.toast('Payment completed. Preparing receipt...');
      }
      const data = await API.post('/sales', payload);
      App.toast(`Sale completed - ${data.sale.receiptNumber}`);
      cart = [];
      discount = 0;
      tax = 0;
      await loadProducts();
      renderCart();
      setTimeout(() => {
        window.location.href = `/receipts.html?id=${data.sale._id}`;
      }, payload.paymentMethod === 'paystack' ? 900 : 0);
    } catch (err) {
      App.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Complete Sale';
    }
  };

  const loadProducts = async () => {
    const data = await API.get('/products');
    products = data.products;
  };

  const initStaffRequests = () => {
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="toolbar"><div class="toolbar-left"><select class="input" id="requestStatus"><option value="pending">Pending requests</option><option value="fulfilled">Fulfilled</option><option value="rejected">Declined</option><option value="">All requests</option></select></div></div>
      <div class="card"><div class="table-wrapper"><table class="data-table"><thead><tr><th>Request</th><th>Customer</th><th>Items</th><th class="text-right">Estimated total</th><th>Date</th><th>Status</th><th class="text-right">Actions</th></tr></thead><tbody id="requestsBody"><tr><td colspan="7" class="empty">Loading requests...</td></tr></tbody></table></div></div>
    `;
    document.getElementById('requestStatus').addEventListener('change', loadStaffRequests);
    document.getElementById('requestsBody').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const request = staffRequests.find((entry) => entry._id === button.dataset.id);
      if (!request) return;
      if (button.dataset.action === 'fulfill') openFulfillRequest(request);
      if (button.dataset.action === 'reject') rejectCustomerRequest(request._id);
    });
    loadStaffRequests();
  };

  let staffRequests = [];

  const loadStaffRequests = async () => {
    try {
      const status = document.getElementById('requestStatus').value;
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const data = await API.get('/requests' + query);
      staffRequests = data.requests;
      const body = document.getElementById('requestsBody');
      if (!body) return;
      body.innerHTML = staffRequests.length ? staffRequests.map((request) => {
        const itemCount = request.items.reduce((sum, item) => sum + item.quantity, 0);
        const estimated = request.items.reduce((sum, item) => sum + item.quantity * item.sellingPrice, 0);
        const actions = request.status === 'pending' ? `
          <button class="btn btn-primary btn-sm" data-action="fulfill" data-id="${request._id}">Process</button>
          <button class="btn btn-ghost btn-sm text-danger" data-action="reject" data-id="${request._id}" title="Decline request"><span data-icon="close" data-size="14"></span></button>` : '—';
        return `<tr><td><strong>${App.escapeHtml(request._id.slice(-8).toUpperCase())}</strong></td><td>${App.escapeHtml(request.customerName)}<br><span class="muted">${App.escapeHtml(request.customerEmail)}</span></td><td>${request.items.map((item) => `${App.escapeHtml(item.name)} x ${item.quantity}`).join('<br>')}<br><span class="muted">${itemCount} items</span></td><td class="text-right">${App.money(estimated)}</td><td>${App.fmtDate(request.createdAt)}</td><td><span class="badge">${App.escapeHtml(request.status)}</span></td><td class="text-right">${actions}</td></tr>`;
      }).join('') : '<tr><td colspan="7" class="empty">No requests to show</td></tr>';
      Icons.render(body);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const openFulfillRequest = (request) => {
    const subtotal = request.items.reduce((sum, item) => sum + item.quantity * item.sellingPrice, 0);
    App.modal.show(`
      <h3>Process Customer Request</h3>
      <p><strong>${App.escapeHtml(request.customerName)}</strong> - ${request.items.map((item) => `${App.escapeHtml(item.name)} x ${item.quantity}`).join(', ')}</p>
      <p class="muted">Estimated subtotal: ${App.money(subtotal)}. Selling prices are fixed by the admin.</p>
      <form id="fulfillRequestForm" class="form-grid">
        <div class="form-group"><label>Discount amount</label><input class="input" type="number" name="discount" min="0" max="${subtotal}" step="0.01" value="0" required /></div>
        <div class="form-group"><label>Payment method</label><select class="input" name="paymentMethod"><option value="cash">Cash</option><option value="bank">Bank</option></select></div>
      </form>
      <p class="muted">No tax will be added. Stock is checked again when you process the request.</p>
      <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="confirmFulfill">Complete Sale</button></div>
    `);
    document.getElementById('confirmFulfill').addEventListener('click', async () => {
      const form = document.getElementById('fulfillRequestForm');
      if (!form.reportValidity()) return;
      const fields = new FormData(form);
      try {
        const result = await API.post(`/requests/${request._id}/fulfill`, {
          discount: Number(fields.get('discount')),
          paymentMethod: fields.get('paymentMethod'),
        });
        App.modal.hide();
        App.toast(`Sale completed - ${result.sale.receiptNumber}`);
        loadStaffRequests();
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  };

  const rejectCustomerRequest = async (id) => {
    if (!App.confirmDialog('Decline this customer request?')) return;
    try {
      await API.post(`/requests/${id}/reject`, {});
      App.toast('Request declined');
      loadStaffRequests();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const init = async () => {
    if (Auth.user()?.role === 'staff') return initStaffRequests();
    render();
    try {
      await loadProducts();
      renderProductList();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  return { init };
})();
