const calculateSaleTotals = (items, { discount = 0, tax = 0 } = {}) => {
  let subtotal = 0;
  let totalCost = 0;
  let totalProfit = 0;

  const enrichedItems = items.map((item) => {
    const quantity = Number(item.quantity);
    const costPrice = Number(item.costPrice);
    const sellingPrice = Number(item.sellingPrice);

    if (quantity <= 0) throw new Error('Quantity must be greater than 0');
    if (costPrice < 0 || sellingPrice < 0) throw new Error('Prices cannot be negative');

    const lineSubtotal = sellingPrice * quantity;
    const lineCost = costPrice * quantity;
    const lineProfit = lineSubtotal - lineCost;

    subtotal += lineSubtotal;
    totalCost += lineCost;
    totalProfit += lineProfit;

    return {
      ...item,
      quantity,
      costPrice,
      sellingPrice,
      subtotal: lineSubtotal,
      profit: lineProfit,
    };
  });

  const total = subtotal - Number(discount || 0) + Number(tax || 0);
  const finalProfit = totalProfit - Number(discount || 0);

  return {
    items: enrichedItems,
    subtotal,
    totalCost,
    totalProfit: finalProfit,
    total,
  };
};

module.exports = { calculateSaleTotals };