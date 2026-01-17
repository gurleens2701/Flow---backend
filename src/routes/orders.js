const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

/**
 * POST /api/orders/optimize
 * Calculate price comparison across warehouses
 */
router.post('/optimize', authenticateUser, async (req, res) => {
  try {
    const { items } = req.body;
    const userId = req.user.id;

    console.log('Received items:', items);
    console.log('User ID:', userId);

    // Step 1: Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    // Step 2: Fetch all prices
    const { data: prices, error } = await supabase
      .from('prices')
      .select('product_id, warehouse_id, price')
      .eq('is_current', true);

    console.log('Prices count:', prices?.length);

    if (error) throw error;

    // Fetch products separately
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name');

    if (prodError) throw prodError;

    // Fetch warehouses separately
    const { data: warehouses, error: whError } = await supabase
      .from('warehouses')
      .select('id, name');

    if (whError) throw whError;

    // Create lookup maps
    const productLookup = {};
    products.forEach(p => productLookup[p.id] = p.name);

    const warehouseLookup = {};
    warehouses.forEach(w => warehouseLookup[w.id] = w.name);

    // Add names to prices
    const pricesWithNames = prices.map(p => ({
      ...p,
      productName: productLookup[p.product_id] || 'Unknown',
      warehouseName: warehouseLookup[p.warehouse_id] || 'Unknown'
    }));

    // Filter by cart items
    const productIds = items.map(item => item.productId);
    const filteredPrices = pricesWithNames.filter(p => productIds.includes(p.product_id));

    console.log('Filtered prices count:', filteredPrices.length);

    // Step 3: Calculate totals for each warehouse (Section 1)
    const warehouseMap = {};

    filteredPrices.forEach(price => {
      const wId = price.warehouse_id;
      if (!warehouseMap[wId]) {
        warehouseMap[wId] = {
          warehouseId: wId,
          warehouseName: price.warehouseName,
          items: []
        };
      }
      warehouseMap[wId].items.push(price);
    });

    const warehouseTotals = [];

    Object.values(warehouseMap).forEach(warehouse => {
      let total = 0;
      let itemCount = 0;
      const missingItems = [];

      items.forEach(cartItem => {
        const priceData = warehouse.items.find(p => p.product_id === cartItem.productId);
        
        if (priceData) {
          total += priceData.price * cartItem.quantity;
          itemCount++;
        } else {
          const productInfo = filteredPrices.find(p => p.product_id === cartItem.productId);
          missingItems.push({
            productId: cartItem.productId,
            name: productInfo ? productInfo.productName : 'Unknown',
            quantity: cartItem.quantity
          });
        }
      });

      warehouseTotals.push({
        warehouseId: warehouse.warehouseId,
        warehouseName: warehouse.warehouseName,
        total: total,
        itemCount: itemCount,
        hasAllItems: missingItems.length === 0,
        missingItems: missingItems
      });
    });

    warehouseTotals.sort((a, b) => a.total - b.total);

    // Step 4: Build shopping lists - cheapest warehouse per item (Section 3)
    const shoppingListMap = {};
    let bestTotal = 0;

    items.forEach(cartItem => {
      const productPrices = filteredPrices.filter(p => p.product_id === cartItem.productId);
      
      if (productPrices.length === 0) return;
      
      const cheapest = productPrices.reduce((min, p) => 
        p.price < min.price ? p : min
      );
      
      const wId = cheapest.warehouse_id;
      const subtotal = cheapest.price * cartItem.quantity;
      bestTotal += subtotal;
      
      if (!shoppingListMap[wId]) {
        shoppingListMap[wId] = {
          warehouseId: wId,
          warehouseName: cheapest.warehouseName,
          items: [],
          total: 0
        };
      }
      
      shoppingListMap[wId].items.push({
        productId: cartItem.productId,
        name: cheapest.productName,
        quantity: cartItem.quantity,
        price: cheapest.price,
        subtotal: subtotal
      });
      
      shoppingListMap[wId].total += subtotal;
    });

    const shoppingLists = Object.values(shoppingListMap);

    // Step 5: Return results
    const worstTotal = warehouseTotals.length > 0 
      ? Math.max(...warehouseTotals.filter(w => w.hasAllItems).map(w => w.total))
      : 0;

    res.json({
      warehouseTotals,
      shoppingLists,
      bestTotal,
      worstTotal,
      savings: worstTotal - bestTotal
    });

  } catch (error) {
    console.error('Optimize error:', error);
    res.status(500).json({ error: 'Failed to optimize order' });
  }
});

module.exports = router;