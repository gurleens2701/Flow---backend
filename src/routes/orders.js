const express = require('express');
const router = express.Router();
const { calculateSingleWarehouseOptions, calculateBestSplit } = require('../services/optimizer');
const { supabase } = require('../config/supabase');

// POST /api/orders/optimize
router.post('/optimize', async (req, res) => {
  try {
    const { cartItems } = req.body;
    
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const productIds = cartItems.map(item => item.productId);

    const { data: prices, error } = await supabase
      .from('prices')
      .select('product_id, warehouse_id, price, warehouses(name)')
      .in('product_id', productIds)
      .eq('is_current', true);

    if (error) throw error;

    const formattedPrices = prices.map(p => ({
      productId: p.product_id,
      warehouseId: p.warehouse_id,
      warehouseName: p.warehouses.name,
      price: parseFloat(p.price)
    }));

    const warehouseOptions = calculateSingleWarehouseOptions(cartItems, formattedPrices);
    const splitRecommendation = calculateBestSplit(cartItems, formattedPrices);

    res.json({ 
      warehouseOptions,
      splitRecommendation
    });
  } catch (err) {
    console.error('Optimize error:', err);
    res.status(500).json({ error: 'Failed to optimize order' });
  }
});

module.exports = router;
