const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { processInvoice } = require('../services/ocr');

router.post('/process', authenticateUser, async (req, res) => {
  try {
    const image_url = req.body.image_url;
    
    if (!image_url) {
      return res.status(400).json({ error: 'image_url is required' });
    }
    
    const structuredData = await processInvoice(image_url);
    res.json(structuredData);
    
  } catch (error) {
    console.error('Invoice processing error:', error);
    res.status(500).json({ error: 'Failed to process invoice' });
  }
});

module.exports = router;
