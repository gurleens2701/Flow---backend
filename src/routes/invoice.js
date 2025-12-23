const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { processInvoice } = require('../services/ocr');

/**
 * POST /api/invoices/process
 * Process an uploaded invoice image
 */
router.post('/process', async (req, res) => {
  try {
    // TODO 1: Get image_url from request body
    const image_url = req.body.image_url;
    
    // Validate image_url exists
    if (!image_url) {
      return res.status(400).json({ error: 'image_url is required' });
    }
    
    // TODO 2: Call processInvoice with the image URL
    const structuredData = await processInvoice(image_url)
    
    // TODO 3: Return the structured data
    res.json(structuredData);
    
  } catch (error) {
    console.error('Invoice processing error:', error);
    res.status(500).json({ error: 'Failed to process invoice' });
  }
});

module.exports = router;