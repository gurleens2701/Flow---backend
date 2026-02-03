const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Generate embedding for product name
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text
  });
  return response.data[0].embedding;
}

// Save products with embeddings
router.post('/save-with-embeddings', authenticateUser, async (req, res) => {
  try {
    const { warehouse, products } = req.body;
    const userId = req.user.id;

    if (!warehouse || !products || products.length === 0) {
      return res.status(400).json({ error: 'Warehouse and products are required' });
    }

    // Find or create warehouse
    let { data: warehouseData, error: whError } = await supabase
      .from('warehouses')
      .select('id')
      .eq('name', warehouse)
      .eq('user_id', userId)
      .single();

    if (!warehouseData) {
      const { data: newWarehouse, error: createWhError } = await supabase
        .from('warehouses')
        .insert({ name: warehouse, user_id: userId })
        .select('id')
        .single();
      
      if (createWhError) throw createWhError;
      warehouseData = newWarehouse;
    }

    const warehouseId = warehouseData.id;
    let savedCount = 0;

    for (const product of products) {
      // Generate embedding for product name
      const embedding = await generateEmbedding(product.name);

      // Check for existing similar product
      const { data: similarProducts } = await supabase.rpc('match_products', {
        query_embedding: embedding,
        query_user_id: userId,
        match_threshold: 0.9,
        match_count: 1
      });

      let productId;

      if (similarProducts && similarProducts.length > 0) {
        // Use existing product
        productId = similarProducts[0].id;
      } else {
        // Create new product
        const { data: newProduct, error: prodError } = await supabase
          .from('products')
          .insert({
            name: product.name,
            user_id: userId,
            embedding: embedding
          })
          .select('id')
          .single();

        if (prodError) throw prodError;
        productId = newProduct.id;
      }

      // Mark old prices as not current
      await supabase
        .from('prices')
        .update({ is_current: false })
        .eq('product_id', productId)
        .eq('warehouse_id', warehouseId)
        .eq('user_id', userId);

      // Insert new price
      const { error: priceError } = await supabase
        .from('prices')
        .insert({
          product_id: productId,
          warehouse_id: warehouseId,
          user_id: userId,
          price: parseFloat(product.price),
          is_current: true
        });

      if (priceError) throw priceError;
      savedCount++;
    }

    res.json({ message: `Saved ${savedCount} products successfully` });

  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save products' });
  }
});

// Search products
router.get('/search', authenticateUser, async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${q}%`)
      .limit(20);

    if (error) throw error;

    res.json({ results: data });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
