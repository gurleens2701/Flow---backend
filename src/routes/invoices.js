const express = require('express');
const router = express.Router();
const { extractTextFromImage, parseInvoiceWithAI } = require('../services/ocr');
const { authenticateUser } = require('../middleware/auth');

router.post('/process', authenticateUser, async (req, res) => {
  try {
    const { image_url } = req.body;
    
    if (!image_url) {
      return res.status(400).json({ error: 'image_url is required' });
    }

    console.log('Processing invoice:', image_url);

    // Step 1: Extract text using OCR
    const ocrText = await extractTextFromImage(image_url);
    console.log('OCR Text:', ocrText.substring(0, 200) + '...');

    // Step 2: Parse with AI
    const parsed = await parseInvoiceWithAI(ocrText);
    console.log('Parsed result:', parsed);

    res.json({
      warehouse: parsed.warehouse,
      confidence: parsed.confidence,
      products: parsed.products
    });

  } catch (error) {
    console.error('Invoice processing error:', error);
    res.status(500).json({ error: 'Failed to process invoice' });
  }
});

module.exports = router;
