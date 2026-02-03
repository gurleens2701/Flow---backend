const vision = require('@google-cloud/vision');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Google Cloud Vision client
const visionClient = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}')
});

async function extractTextFromImage(imageUrl) {
  try {
    const [result] = await visionClient.textDetection(imageUrl);
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return '';
    }
    
    return detections[0].description;
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
}

async function parseInvoiceWithAI(ocrText) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an invoice parser. Extract product information from invoice text.
Return JSON in this exact format:
{
  "warehouse": "warehouse name",
  "confidence": 85,
  "products": [
    {"name": "Product Name", "price": 12.99},
    {"name": "Another Product", "price": 5.49}
  ]
}
- confidence is 0-100 based on how clear the invoice is
- price should be a number, not a string
- Extract ALL products you can find`
        },
        {
          role: 'user',
          content: `Parse this invoice text:\n\n${ocrText}`
        }
      ],
      temperature: 0.1
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('AI Parse Error:', error);
    throw error;
  }
}

module.exports = { extractTextFromImage, parseInvoiceWithAI };
