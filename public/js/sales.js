const Sales = (() => {
  let cart = [];
  let products = [];
  let discount = 0;
  let tax = 0;

  const render = () => {
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
            <div class="summary-row"><span>Subtotal</span><span id="sumSubtotal">NGN 0.00</span></div>
            <div class="summary-row">
              <span>Discount</span>
              <input class="input input-sm" type="number" min="0" step="0.01" id="discountInput" value="0" />
            </div>
            <div class="summary-row">
              <span>Tax</span>
              <input class="input input-sm" type="number" min="0" step="0.01" id="taxInput" value="0" />
            </div>
            <div class="summary-row total"><span>Total</span><span id="sumTotal">NGN 0.00</span></div>
            <div class="summary-row profit"><span>Profit</span><span id="sumProfit">NGN 0.00</span></div>
          </div>

          <div class="cart-customer">
            <input class="input" id="customerName" placeholder="Customer name (optional)" />
            <input class="input" id="customerPhone" placeholder="Phone (optional)" />
            <select class="input" id="paymentMethod">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Bank Transfer</option>
              <option value="paystack">Paystack</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          <button class="btn btn-primary btn-block" id="checkoutBtn" disabled>Complete Sale</button>
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
    document.getElementById('checkoutBtn').addEventListener('click', checkout);
    document.getElementById('cartItems').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const idx = Number(btn.dataset.idx);
      const action = btn.dataset.action;
      if (action === 'inc') cart[idx].quantity += 1;
      else if (action === 'dec') {
        cart[idx].quantity -= 1;
        if (cart[idx].quantity <= 0) cart.splice(idx, 1);
      } else if (action === 'remove') cart.splice(idx, 1);
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
            <span class="muted">${App.money(item.sellingPrice)} x ${item.quantity}</span>
          </div>
          <div class="cart-item-actions">
            <button class="qty-btn" data-action="dec" data-idx="${idx}"><span data-icon="minus" data-size="12"></span></button>
            <span class="qty">${item.quantity}</span>
            <button class="qty-btn" data-action="inc" data-idx="${idx}"><span data-icon="plus" data-size="12"></span></button>
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
    document.getElementById('checkoutBtn').disabled = cart.length === 0;
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
      };
      const data = await API.post('/sales', payload);
      App.toast(`Sale completed - ${data.sale.receiptNumber}`);
      cart = [];
      discount = 0;
      tax = 0;
      await loadProducts();
      renderCart();
      window.open(`/receipts.html?id=${data.sale._id}`, '_blank');
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

  const init = async () => {
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