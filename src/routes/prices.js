const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// PUT /api/prices/batch - Update multiple prices
router.put('/batch', async (req, res) => {
  try {
    const { updates, deletes } = req.body;

    // Handle deletions first
    if (deletes && deletes.length > 0) {
      const { error: deleteError } = await supabase
        .from('prices')
        .delete()
        .in('id', deletes);

      if (deleteError) throw deleteError;
    }

    // Handle updates
    if (updates && updates.length > 0) {
      for (const item of updates) {
        const { id, price, productName, warehouseName } = item;

        const { error: priceError } = await supabase
          .from('prices')
          .update({ price: price })
          .eq('id', id);

        if (priceError) throw priceError;

        const { data: priceData, error: fetchError } = await supabase
          .from('prices')
          .select('product_id, warehouse_id')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        const { error: productError } = await supabase
          .from('products')
          .update({ name: productName })
          .eq('id', priceData.product_id);

        if (productError) throw productError;

        const { error: warehouseError } = await supabase
          .from('warehouses')
          .update({ name: warehouseName })
          .eq('id', priceData.warehouse_id);

        if (warehouseError) throw warehouseError;
      }
    }

    res.json({ message: 'Updates saved successfully' });
  } catch (err) {
    console.error('Batch update error:', err);
    res.status(500).json({ error: 'Failed to save updates' });
  }
});

// DELETE /api/prices/:id - Delete a price
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('prices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Price deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

module.exports = router;
