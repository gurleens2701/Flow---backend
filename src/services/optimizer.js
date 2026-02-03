function calculateSingleWarehouseOptions(cartItems, prices) {
  const uniqueWarehouses = [...new Map(
    prices.map(p => [p.warehouseId, { warehouseId: p.warehouseId, warehouseName: p.warehouseName }])
  ).values()];

  const results = uniqueWarehouses.map(warehouse => {
    let total = 0;
    const itemsFound = [];
    const itemsMissing = [];

    cartItems.forEach(item => {
      const priceEntry = prices.find(p => p.warehouseId === warehouse.warehouseId && p.productId === item.productId);
      if (priceEntry) {
        total += item.quantity * priceEntry.price;
        itemsFound.push({
          productId: item.productId,
          quantity: item.quantity,
          price: priceEntry.price
        });
      } else {
        itemsMissing.push({
          productId: item.productId,
          quantity: item.quantity
        });
      }
    });

    return { 
      warehouseId: warehouse.warehouseId, 
      warehouseName: warehouse.warehouseName, 
      total,
      itemsFound: itemsFound.length,
      itemsMissing,
      isComplete: itemsMissing.length === 0
    };
  });

  results.sort((a, b) => a.total - b.total);

  return results;
}

function calculateBestSplit(cartItems, prices) {
  const itemAssignments = [];
  let splitTotal = 0;

  cartItems.forEach(item => {
    const productPrices = prices.filter(p => p.productId === item.productId);
    
    if (productPrices.length === 0) return;

    const cheapest = productPrices.reduce((min, p) => 
      p.price < min.price ? p : min
    );

    const itemCost = item.quantity * cheapest.price;
    splitTotal += itemCost;

    itemAssignments.push({
      productId: item.productId,
      warehouseId: cheapest.warehouseId,
      warehouseName: cheapest.warehouseName,
      quantity: item.quantity,
      unitPrice: cheapest.price,
      itemTotal: itemCost
    });
  });

  const warehouseSummary = {};
  itemAssignments.forEach(item => {
    if (!warehouseSummary[item.warehouseId]) {
      warehouseSummary[item.warehouseId] = {
        warehouseId: item.warehouseId,
        warehouseName: item.warehouseName,
        items: [],
        subtotal: 0
      };
    }
    warehouseSummary[item.warehouseId].items.push(item);
    warehouseSummary[item.warehouseId].subtotal += item.itemTotal;
  });

  return {
    splitTotal,
    warehouses: Object.values(warehouseSummary),
    itemAssignments
  };
}

module.exports = { calculateSingleWarehouseOptions, calculateBestSplit };
