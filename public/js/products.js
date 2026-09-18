const Products = (() => {
  let state = { products: [], search: '', category: '', lowStock: false, sort: 'asc' };

  const CATEGORIES = [
    'Seeds', 'Fertilizers', 'Pesticides', 'Herbicides',
    'Animal Feed', 'Veterinary', 'Equipment', 'Other',
  ];

  const render = () => {
    const content = document.getElementById('page-content');
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
        ${isAdmin ? `<button class="btn btn-primary" id="addProductBtn">
          <span data-icon="plus" data-size="16"></span> Add Product
        </button>` : ''}
      </div>

      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th class="text-center">Qty</th>
                <th>Unit of Measure</th>
                <th>Category</th>
                <th class="text-right">Buying Price</th>
                <th class="text-right">Selling Price</th>
                <th class="text-right">Profit Amount</th>
                ${isAdmin ? '<th class="text-right">Actions</th>' : ''}
              </tr>
            </thead>
            <tbody id="productsBody">
              ${state.products.length ? state.products.map(rowHtml).join('') : `<tr><td colspan="${isAdmin ? 9 : 8}" class="empty">No products found</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
    Icons.render(content);
    bindEvents();
  };

  const rowHtml = (p) => {
    const low = p.stock <= p.lowStockThreshold;
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
        <td class="text-right">${App.money(p.costPrice)}</td>
        <td class="text-right">${App.money(p.sellingPrice)}</td>
        <td class="text-right ${p.profitAmount >= 0 ? 'text-success' : 'text-danger'}">${App.money(p.profitAmount)}</td>
        ${Auth.user()?.role === 'admin' ? `<td class="text-right">
          <button class="btn btn-ghost btn-sm" data-action="adjust" data-id="${p._id}" title="Adjust stock"><span data-icon="refresh" data-size="14"></span></button>
          <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${p._id}" title="Edit"><span data-icon="edit" data-size="14"></span></button>
          <button class="btn btn-ghost btn-sm text-danger" data-action="delete" data-id="${p._id}" title="Delete"><span data-icon="trash" data-size="14"></span></button>
        </td>` : ''}
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

    document.getElementById('productsBody')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'edit') openForm(state.products.find((p) => p._id === id));
      else if (action === 'delete') remove(id);
      else if (action === 'adjust') openStockAdjust(id);
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
          <label>Buying Price *</label>
          <input class="input" type="number" step="0.01" min="0" name="costPrice" required value="${p.costPrice}" />
        </div>
        <div class="form-group">
          <label>Selling Price *</label>
          <input class="input" type="number" step="0.01" min="0" name="sellingPrice" required value="${p.sellingPrice}" />
        </div>
        <div class="form-group">
          <label>Quantity *</label>
          <input class="input" type="number" min="0" name="stock" required value="${p.stock}" />
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
        costPrice: Number(fd.get('costPrice')),
        sellingPrice: Number(fd.get('sellingPrice')),
        stock: Number(fd.get('stock')),
        lowStockThreshold: Number(fd.get('lowStockThreshold')),
        description: fd.get('description').trim(),
      };

      if (!payload.name || payload.costPrice < 0 || payload.sellingPrice < 0) {
        return App.toast('Please fill all required fields', 'error');
      }

      try {
        if (isEdit) await API.put(`/products/${product._id}`, payload);
        else await API.post('/products', payload);
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
