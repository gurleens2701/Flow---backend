const OpenAI = require('openai');

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_CLOUD_API_KEY;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function processInvoice(imageUrl) {
  try {
    const ocrText = await extractTextFromImage(imageUrl);
    const structuredData = await parseInvoiceText(ocrText);
    return structuredData;
  } catch (error) {
    console.error('Error processing invoice:', error);
    throw error;
  }
}

async function extractTextFromImage(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'TEXT_DETECTION' }]
        }]
      })
    });

    const data = await visionResponse.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.responses || !data.responses[0].textAnnotations || data.responses[0].textAnnotations.length === 0) {
      throw new Error('No text detected in image');
    }

    return data.responses[0].textAnnotations[0].description;

  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
}

async function parseInvoiceText(ocrText) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an invoice parser for convenience store wholesale products. Extract warehouse name, products, and prices from OCR text.

Rules:
- Extract ONLY products with clear prices (ignore subtotals, taxes, totals)
- Confidence score (0-100): How certain you are about each extraction
- Overall confidence: Average of all product confidences
- If warehouse name unclear, use "Unknown" with low confidence

CRITICAL - Standardized Names:
Create a "standardized_name" that normalizes product names so the same product from different warehouses can match.

CIGARETTES (Marlboro, Camel, Newport, Basic, 24/7, Crowns, LD, Winston, etc.):
- BX or BOX → "Box" (pack type - KEEP!)
- SP or SOFT → "Soft Pack"  
- KS → "King Size"
- 100 or 100S → "100s"
- REMOVE: FSC, CT, CRT (compliance codes)
- Format: Brand + Variant + Size + Pack Type
- Examples:
  "24/7 RED BX KS FSC 1 CT" → "24/7 Red King Size Box"
  "MARLBORO GOLD BX 100 FSC" → "Marlboro Gold 100s Box"

CIGARS/TOBACCO (White Owl, Swisher, Lil Leaf, Black & Mild, etc.):
- Keep flavor/variant
- PK → "Pack"
- REMOVE: Price info (2/1.19, 3/$2.99), CT counts
- Format: Brand + Variant + Pack Size
- Examples:
  "WHITE OWL-RED, WHITE & BERRY - 2/1.19 - 2PK/30 CT" → "White Owl Red White & Berry 2 Pack"
  "LIL LEAF-RUSSIAN CREAM-3/$2.99-10-3PK" → "Lil Leaf Russian Cream 3 Pack"

CANDY/SNACKS:
- Keep size/count if it identifies the product
- REMOVE: CT when it's case quantity
- Format: Brand + Flavor + Size
- Examples:
  "Brach's Peppermint Candy Canes Jar 260 CT" → "Brach's Peppermint Candy Canes Jar"
  "Laffy Taffy Rope - Mystery Swirl 24 CT" → "Laffy Taffy Rope Mystery Swirl"
  "SNICKERS 1.86OZ 48CT" → "Snickers 1.86oz"

BEVERAGES:
- Keep size and pack count
- Format: Brand + Flavor + Size + Pack
- Examples:
  "COCA COLA 12OZ 24PK" → "Coca Cola 12oz 24 Pack"
  "RED BULL 8.4OZ 12CT" → "Red Bull 8.4oz 12 Pack"

ALWAYS REMOVE from all categories:
- Price info ($, /, cents)
- Case quantities at the end
- Compliance codes (FSC)

Return ONLY valid JSON in this format:
{
  "warehouse": "string",
  "confidence": number,
  "products": [
    {
      "name": "string",
      "standardized_name": "string",
      "price": number,
      "confidence": number
    }
  ]
}`
        },
        {
          role: "user",
          content: `Extract products from this invoice:\n\n${ocrText}`
        }
      ],
      temperature: 0.3,
    });

    const jsonResponse = JSON.parse(response.choices[0].message.content);
    return jsonResponse;

  } catch (error) {
    console.error('GPT-4 Parsing Error:', error);
    throw error;
  }
}

module.exports = { processInvoice };
