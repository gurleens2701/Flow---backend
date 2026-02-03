const express = require('express');
const router = express.Router();
const { processInvoice } = require('../services/ocr');
const { authenticateUser } = require('../middleware/auth');

router.post('/process', authenticateUser, async (req, res) => {
  try {
    const { image_url } = req.body;
    
    if (!image_url) {
      return res.status(400).json({ error: 'image_url is required' });
    }

    console.log('Processing invoice:', image_url);

    const result = await processInvoice(image_url);
    console.log('Parsed result:', result);

    res.json({
      warehouse: result.warehouse,
      confidence: result.confidence,
      products: result.products
    });

  } catch (error) {
    console.error('Invoice processing error:', error);
    res.status(500).json({ error: 'Failed to process invoice' });
  }
});

module.exports = router;
