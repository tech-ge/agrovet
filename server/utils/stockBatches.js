const ensureStockBatches = (product) => {
  if (!Array.isArray(product.stockBatches)) product.stockBatches = [];

  const trackedQuantity = product.stockBatches.reduce((sum, batch) => sum + batch.quantity, 0);
  const difference = product.stock - trackedQuantity;
  if (difference > 0) {
    product.stockBatches.unshift({
      quantity: difference,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      receivedAt: product.createdAt || new Date(0),
    });
  } else if (difference < 0) {
    let excess = -difference;
    for (const batch of [...product.stockBatches].reverse()) {
      const removed = Math.min(batch.quantity, excess);
      batch.quantity -= removed;
      excess -= removed;
      if (!excess) break;
    }
  }
};

const syncActivePrice = (product) => {
  const activeBatch = product.stockBatches.find((batch) => batch.quantity > 0);
  if (activeBatch) {
    product.costPrice = activeBatch.costPrice;
    product.sellingPrice = activeBatch.sellingPrice;
  }
};

const addStockBatch = (product, { quantity, costPrice, sellingPrice }) => {
  ensureStockBatches(product);
  product.stockBatches.push({ quantity, costPrice, sellingPrice, receivedAt: new Date() });
  product.stock += quantity;
  syncActivePrice(product);
};

const allocateStock = (product, requestedQuantity) => {
  ensureStockBatches(product);
  const quantity = Number(requestedQuantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) {
    throw Object.assign(new Error(`Insufficient stock for ${product.name} (available: ${product.stock})`), { statusCode: 400 });
  }

  let remaining = quantity;
  const allocations = [];
  for (const batch of product.stockBatches) {
    if (remaining === 0) break;
    if (batch.quantity <= 0) continue;
    const allocatedQuantity = Math.min(batch.quantity, remaining);
    batch.quantity -= allocatedQuantity;
    remaining -= allocatedQuantity;
    allocations.push({
      stockBatchId: batch._id,
      quantity: allocatedQuantity,
      costPrice: batch.costPrice,
      sellingPrice: batch.sellingPrice,
    });
  }

  if (remaining > 0) {
    throw Object.assign(new Error(`Stock batches are out of sync for ${product.name}`), { statusCode: 409 });
  }
  product.stock -= quantity;
  syncActivePrice(product);
  return allocations;
};

const restoreStock = (product, item, receivedAt = new Date()) => {
  ensureStockBatches(product);
  let batch = item.stockBatchId
    ? product.stockBatches.id(item.stockBatchId)
    : null;
  if (!batch) {
    batch = product.stockBatches.create({
      quantity: 0,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      receivedAt,
    });
    product.stockBatches.unshift(batch);
  }
  batch.quantity += item.quantity;
  product.stock += item.quantity;
  syncActivePrice(product);
};

module.exports = { ensureStockBatches, addStockBatch, allocateStock, restoreStock, syncActivePrice };