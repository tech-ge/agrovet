const Products = (() => {
  let state = { products: [], search: '', category: '', lowStock: false, sort: 'asc', cart: [], requests: [] };

  const CATEGORIES = [
    'Seeds', 'Fertilizers', 'Pesticides', 'Herbicides',
    'Animal Feed', 'Veterinary', 'Equipment', 'Other',
  ];

  const render = () => {
    const content = document.getElementById('page-content');
    const role = Auth.user()?.role;
    if (role === 'user') return renderCustomer(content);
    const isAdmin = Auth.user()?.role === 'admin';
    content.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="input-wrap">
            <span data-icon="search" data-size="16"></span>
            <input type="search" id="searchInput" class="input" placeholder="Search by product name" value="${App.escapeHtml(state.search)}" />
          </div>
          <select id="categoryFilter" class="input">
            <option value="">All Categories</option>
            ${CATEGORIES.map((c) => `<option value="${c}" ${state.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <label class="checkbox-inline">
            <input type="checkbox" id="lowStockFilter" ${state.lowStock ? 'checked' : ''} />
            Low stock only
          </label>
          <select id="nameSort" class="input" aria-label="Sort products by name">
            <option value="asc" ${state.sort === 'asc' ? 'selected' : ''}>Name A-Z</option>
            <option value="desc" ${state.sort === 'desc' ? 'selected' : ''}>Name Z-A</option>
          </select>
        </div>
        ${isAdmin ? `<button class="btn btn-primary" id="addProductBtn"><span data-icon="plus" data-size="16"></span> Add Product</button>` : `<button class="btn btn-primary" id="stockPurchaseBtn"><span data-icon="plus" data-size="16"></span> Receive Stock</button>`}
      </div>

      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Size</th><th class="text-center">Qty</th><th>Unit of Measure</th><th>Category</th>
                ${isAdmin ? '<th class="text-right">Buying Price</th>' : ''}
                <th class="text-right">Selling Price</th>
                ${isAdmin ? '<th class="text-right">Profit/Unit</th>' : ''}
                <th class="text-right">${isAdmin ? 'Actions' : 'Receive'}</th>
              </tr>
            </thead>
            <tbody id="productsBody">
              ${state.products.length ? state.products.map(rowHtml).join('') : `<tr><td colspan="${isAdmin ? 9 : 7}" class="empty">No products found</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
    Icons.render(content);
    bindEvents();
  };

  const renderCustomer = (content) => {
    content.innerHTML = `
      <div class="customer-catalog-grid">
        <section class="card">
          <div class="toolbar"><div class="input-wrap"><span data-icon="search" data-size="16"></span><input type="search" id="customerProductSearch" class="input" placeholder="Search products" value="${App.escapeHtml(state.search)}" /></div></div>
          <div class="customer-product-list" id="customerProductList"></div>
        </section>
        <section class="card customer-cart">
          <div class="card-header"><h3>Your Request</h3><button class="btn btn-ghost btn-sm" id="clearRequestCart">Clear</button></div>
          <div class="customer-cart-items" id="customerCartItems"></div>
          <div class="summary-row total"><span>Estimated total</span><strong id="requestTotal">${App.money(0)}</strong></div>
          <div class="form-group"><label for="customerPhone">Phone number</label><input class="input" id="customerPhone" type="tel" placeholder="For staff to contact you" /></div>
          <button class="btn btn-primary btn-block" id="submitRequest" disabled>Send Request</button>
        </section>
      </div>
      <section class="card"><div class="card-header"><h3>My Requests</h3></div><div class="table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Items</th><th>Status</th><th>Receipt</th></tr></thead><tbody id="customerRequestsBody"></tbody></table></div></section>
    `;
    Icons.render(content);
    renderCustomerProducts();
    renderCustomerCart();
    document.getElementById('customerProductSearch').addEventListener('input', (event) => {
      state.search = event.target.value;
      renderCustomerProducts();
    });
    document.getElementById('customerProductList').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-add-product]');
      if (button) addCustomerProduct(button.dataset.addProduct);
    });
    document.getElementById('customerCartItems').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-cart-action]');
      if (!button) return;
      const item = state.cart.find((entry) => entry.product === button.dataset.product);
      if (!item) return;
      if (button.dataset.cartAction === 'remove') state.cart = state.cart.filter((entry) => entry !== item);
      if (button.dataset.cartAction === 'increase' && item.quantity < item.stock) item.quantity += 1;
      if (button.dataset.cartAction === 'decrease') item.quantity -= 1;
      if (item.quantity < 1) state.cart = state.cart.filter((entry) => entry !== item);
      renderCustomerCart();
    });
    document.getElementById('clearRequestCart').addEventListener('click', () => {
      state.cart = [];
      renderCustomerCart();
    });
    document.getElementById('submitRequest').addEventListener('click', submitCustomerRequest);
    renderCustomerRequests();
  };

  const renderCustomerProducts = () => {
    const term = state.search.trim().toLowerCase();
    const products = state.products.filter((product) => product.name.toLowerCase().includes(term));
    const list = document.getElementById('customerProductList');
    if (!list) return;
    list.innerHTML = products.length ? products.map((product) => `
      <article class="customer-product">
        <div><strong>${App.escapeHtml(product.name)}</strong><span class="muted">${App.escapeHtml(product.category)} - ${App.escapeHtml(product.unitOfMeasure || product.unit || 'pcs')}</span></div>
        <div class="customer-product-buy"><strong>${App.money(product.sellingPrice)}</strong><button class="btn btn-primary btn-sm" data-add-product="${product._id}">Add</button></div>
      </article>`).join('') : '<p class="empty">No products found</p>';
  };

  const addCustomerProduct = (id) => {
    const product = state.products.find((entry) => entry._id === id);
    if (!product) return;
    const item = state.cart.find((entry) => entry.product === id);
    if (item) {
      item.quantity += 1;
    } else {
      state.cart.push({ product: id, name: product.name, quantity: 1, sellingPrice: product.sellingPrice });
    }
    renderCustomerCart();
  };

  const renderCustomerCart = () => {
    const list = document.getElementById('customerCartItems');
    if (!list) return;
    list.innerHTML = state.cart.length ? state.cart.map((item) => `
      <div class="customer-cart-row">
        <div><strong>${App.escapeHtml(item.name)}</strong><span class="muted">${App.money(item.sellingPrice)} each</span></div>
        <div class="customer-cart-controls"><button class="qty-btn" data-cart-action="decrease" data-product="${item.product}" aria-label="Decrease quantity">-</button><span>${item.quantity}</span><button class="qty-btn" data-cart-action="increase" data-product="${item.product}" aria-label="Increase quantity">+</button><button class="qty-btn danger" data-cart-action="remove" data-product="${item.product}" aria-label="Remove item">x</button></div>
      </div>`).join('') : '<p class="empty">Choose products to start a request.</p>';
    const total = state.cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
    document.getElementById('requestTotal').textContent = App.money(total);
    document.getElementById('submitRequest').disabled = !state.cart.length;
  };

  const renderCustomerRequests = () => {
    const body = document.getElementById('customerRequestsBody');
    if (!body) return;
    body.innerHTML = state.requests.length ? state.requests.map((request) => `
      <tr><td>${App.fmtDate(request.createdAt)}</td><td>${request.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td><span class="badge">${App.escapeHtml(request.status)}</span></td><td>${request.sale ? `<a href="/receipts.html?id=${request.sale}">View receipt</a>` : '—'}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">No requests yet</td></tr>';
  };

  const submitCustomerRequest = async () => {
    if (!state.cart.length) return;
    const button = document.getElementById('submitRequest');
    button.disabled = true;
    try {
      await API.post('/requests', {
        items: state.cart.map(({ product, quantity }) => ({ product, quantity })),
        phone: document.getElementById('customerPhone').value.trim(),
      });
      state.cart = [];
      App.toast('Request sent to staff');
      await load();
    } catch (err) {
      App.toast(err.message, 'error');
      button.disabled = false;
    }
  };

  const rowHtml = (p) => {
    const low = p.stock <= p.lowStockThreshold;
    const isAdmin = Auth.user()?.role === 'admin';
    return `
      <tr>
        <td>
          <div class="cell-product">
            <strong>${App.escapeHtml(p.name)}</strong>
            <span class="muted">per ${App.escapeHtml(p.unitOfMeasure || p.unit || 'pcs')}</span>
          </div>
        </td>
        <td>${App.escapeHtml(p.size || '—')}</td>
        <td class="text-center"><span class="stock-pill ${low ? 'stock-low' : 'stock-ok'}">${p.stock}</span></td>
        <td>${App.escapeHtml(p.unitOfMeasure || p.unit || 'pcs')}</td>
        <td><span class="badge">${App.escapeHtml(p.category)}</span></td>
        ${isAdmin ? `<td class="text-right">${App.money(p.costPrice)}</td>` : ''}
        <td class="text-right">${App.money(p.sellingPrice)}</td>
        ${isAdmin ? `<td class="text-right text-success">${App.money(p.sellingPrice - p.costPrice)}</td>` : ''}
        ${isAdmin ? `<td class="text-right">
          <button class="btn btn-ghost btn-sm" data-action="adjust" data-id="${p._id}" title="Adjust stock"><span data-icon="refresh" data-size="14"></span></button>
          <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${p._id}" title="Edit"><span data-icon="edit" data-size="14"></span></button>
          <button class="btn btn-ghost btn-sm text-danger" data-action="delete" data-id="${p._id}" title="Delete"><span data-icon="trash" data-size="14"></span></button>
        </td>` : `<td class="text-right"><button class="btn btn-ghost btn-sm" data-action="receive" data-id="${p._id}" title="Receive this product"><span data-icon="plus" data-size="14"></span></button></td>`}
      </tr>`;
  };

  const bindEvents = () => {
    const search = document.getElementById('searchInput');
    search?.addEventListener('input', debounce((e) => {
      state.search = e.target.value;
      load();
    }, 300));

    document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
      state.category = e.target.value;
      load();
    });

    document.getElementById('lowStockFilter')?.addEventListener('change', (e) => {
      state.lowStock = e.target.checked;
      load();
    });

    document.getElementById('nameSort')?.addEventListener('change', (e) => {
      state.sort = e.target.value;
      sortProducts();
      render();
    });

    document.getElementById('addProductBtn')?.addEventListener('click', () => openForm());
    document.getElementById('stockPurchaseBtn')?.addEventListener('click', () => openStockPurchase());

    document.getElementById('productsBody')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'edit') openForm(state.products.find((p) => p._id === id));
      else if (action === 'delete') remove(id);
      else if (action === 'adjust') openStockAdjust(id);
      else if (action === 'receive') openStockPurchase(state.products.find((p) => p._id === id));
    });
  };

  const debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (state.search) params.append('search', state.search);
      if (state.category) params.append('category', state.category);
      if (state.lowStock) params.append('lowStock', 'true');
      const data = await API.get('/products?' + params.toString());
      state.products = data.products;
      if (Auth.user()?.role === 'user') {
        const requestData = await API.get('/requests');
        state.requests = requestData.requests;
      }
      sortProducts();
      render();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const sortProducts = () => {
    state.products.sort((left, right) => {
      const result = String(left.name || '').localeCompare(String(right.name || ''), undefined, { sensitivity: 'base' });
      return state.sort === 'asc' ? result : -result;
    });
  };

  const openForm = (product = null) => {
    const isEdit = !!product;
    const p = product || {
      name: '', size: '', category: 'Other', description: '',
      costPrice: 0, sellingPrice: 0, stock: 0, lowStockThreshold: 5, unit: 'pcs', unitOfMeasure: 'pcs', supplier: '',
    };

    App.modal.show(`
      <h3>${isEdit ? 'Edit Product' : 'Add Product'}</h3>
      <form id="productForm" class="form-grid">
        <div class="form-group span-2">
          <label>Name *</label>
          <input class="input" name="name" required value="${App.escapeHtml(p.name)}" />
        </div>
        <div class="form-group">
          <label>Size</label>
          <input class="input" name="size" value="${App.escapeHtml(p.size || '')}" placeholder="e.g. 1kg, 500ml" />
        </div>
        <div class="form-group">
          <label>Category</label>
          <select class="input" name="category">
            ${CATEGORIES.map((c) => `<option value="${c}" ${p.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Unit of Measure *</label>
          <input class="input" name="unitOfMeasure" required value="${App.escapeHtml(p.unitOfMeasure || p.unit || 'pcs')}" />
        </div>
        <div class="form-group">
          <label>Supplier</label>
          <input class="input" name="supplier" value="${App.escapeHtml(p.supplier || '')}" />
        </div>
        <div class="form-group">
          <label>Selling Price *</label>
          <input class="input" type="number" step="0.01" min="0" name="sellingPrice" required value="${p.sellingPrice}" />
        </div>
        <div class="form-group">
          <label>Low Stock Threshold</label>
          <input class="input" type="number" min="0" name="lowStockThreshold" value="${p.lowStockThreshold}" />
        </div>
        <div class="form-group span-2">
          <label>Description</label>
          <textarea class="input" name="description" rows="2">${App.escapeHtml(p.description || '')}</textarea>
        </div>
      </form>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="saveProductBtn">${isEdit ? 'Update' : 'Create'}</button>
      </div>
    `);

    document.getElementById('saveProductBtn').addEventListener('click', async () => {
      const fd = new FormData(document.getElementById('productForm'));
      const payload = {
        name: fd.get('name').trim(),
        size: fd.get('size').trim(),
        category: fd.get('category'),
        unit: fd.get('unitOfMeasure').trim(),
        unitOfMeasure: fd.get('unitOfMeasure').trim(),
        supplier: fd.get('supplier').trim(),
        sellingPrice: Number(fd.get('sellingPrice')),
        lowStockThreshold: Number(fd.get('lowStockThreshold')),
        description: fd.get('description').trim(),
      };

      if (!payload.name || payload.sellingPrice < 0) {
        return App.toast('Please fill all required fields', 'error');
      }

      try {
        if (isEdit) await API.put(`/products/${product._id}`, payload);
        else await API.post('/products', { ...payload, costPrice: 0, stock: 0 });
        App.modal.hide();
        App.toast(isEdit ? 'Product updated' : 'Product created');
        load();
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  };

  const openStockAdjust = (id) => {
    const p = state.products.find((x) => x._id === id);
    if (!p) return;

    App.modal.show(`
      <h3>Adjust Stock — ${App.escapeHtml(p.name)}</h3>
      <p class="muted">Current stock: <strong>${p.stock}</strong></p>
      <form id="stockForm" class="form-grid">
        <div class="form-group span-2">
          <label>Operation</label>
          <select class="input" name="operation">
            <option value="add">Add stock (+)</option>
            <option value="subtract">Remove stock (-)</option>
            <option value="set">Set exact stock</option>
          </select>
        </div>
        <div class="form-group span-2">
          <label>Quantity</label>
          <input class="input" type="number" min="0" name="quantity" required value="1" />
        </div>
      </form>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="adjustBtn">Apply</button>
      </div>
    `);

    document.getElementById('adjustBtn').addEventListener('click', async () => {
      const fd = new FormData(document.getElementById('stockForm'));
      try {
        await API.patch(`/products/${id}/stock`, {
          operation: fd.get('operation'),
          quantity: Number(fd.get('quantity')),
        });
        App.modal.hide();
        App.toast('Stock adjusted');
        load();
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  };

  const openStockPurchase = (selectedProduct = null) => {
    const options = state.products.map((product) => `<option value="${product._id}" ${selectedProduct?._id === product._id ? 'selected' : ''}>${App.escapeHtml(product.name)} - ${product.stock} in stock</option>`).join('');
    App.modal.show(`
      <h3>Receive Stock</h3>
      <form id="purchaseForm" class="form-grid">
        <div class="form-group span-2"><label>Product *</label><select class="input" name="product" required>${options}</select></div>
        <div class="form-group"><label>Quantity received *</label><input class="input" type="number" min="1" step="1" name="quantity" required /></div>
        <div class="form-group"><label>Total amount paid *</label><input class="input" type="number" min="0.01" step="0.01" name="totalCost" required /></div>
        <div class="form-group"><label>Supplier</label><input class="input" name="supplier" /></div>
        <div class="form-group"><label>Invoice / reference</label><input class="input" name="reference" /></div>
        <div class="form-group span-2"><label>Purchase notes</label><textarea class="input" name="notes" rows="2"></textarea></div>
      </form>
      <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="savePurchaseBtn">Record Purchase</button></div>
    `);
    document.getElementById('savePurchaseBtn').addEventListener('click', async () => {
      const form = document.getElementById('purchaseForm');
      if (!form.reportValidity()) return;
      const fields = new FormData(form);
      try {
        await API.post('/purchases', {
          product: fields.get('product'),
          quantity: Number(fields.get('quantity')),
          totalCost: Number(fields.get('totalCost')),
          supplier: fields.get('supplier').trim(),
          reference: fields.get('reference').trim(),
          notes: fields.get('notes').trim(),
        });
        App.modal.hide();
        App.toast('Stock purchase recorded');
        load();
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  };

  const remove = async (id) => {
    if (!App.confirmDialog('Delete this product? It will be hidden from inventory.')) return;
    try {
      await API.del(`/products/${id}`);
      App.toast('Product deleted');
      load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  };

  const init = () => load();

  return { init, reload: load };
})();
