const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { authenticateUser } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/products/save-with-embeddings
 * Efficiently generates embeddings in bulk and saves to Supabase
 */
router.post('/save-with-embeddings', authenticateUser, async (req, res) => {
  try {
    const { warehouse, products } = req.body;
    const userId = req.user.id;

    // 1. Validation
    if (!warehouse || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Invalid input: Need warehouse name and product array.' });
    }

    console.log(`Processing ${products.length} products for user ${userId}`);

    // 2. Batch Embedding Generation
    // 2. Batch Embedding Generation - use GPT's standardized names
    const productNames = products.map(p => {
        console.log(`Original: "${p.name}" → Standardized: "${p.standardized_name}"`);
        return p.standardized_name || p.name;  // fallback to name if standardized_name missing
    });
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: productNames,
    });

    // 3. Reconstruct Product Objects with their Vectors
    const productsWithEmbeddings = products.map((product, index) => ({
      name: product.name,
      price: product.price,
      embedding: embeddingResponse.data[index].embedding,
    }));

    // 4. Save to Database via Supabase RPC
    const { data, error } = await supabase.rpc('save_products_with_embeddings', {
      p_warehouse_name: warehouse,
      p_products: productsWithEmbeddings,
      p_user_id: userId,
    });

    if (error) {
      console.error('Supabase RPC Error:', error);
      return res.status(500).json({ error: `Database save failed: ${error.message}` });
    }

    // 5. Success Response
    res.json({
      success: true,
      message: `Successfully embedded and saved ${products.length} products to ${warehouse}.`,
      count: products.length
    });

  } catch (error) {
    console.error('Critical Server Error:', error);
    
    if (error.status === 401) {
      return res.status(500).json({ error: 'OpenAI Authentication failed. Check API Key.' });
    }
    
    res.status(500).json({ error: 'An unexpected error occurred during processing.' });
  }
});

module.exports = router;