const vision = require('@google-cloud/vision');
const OpenAI = require('openai');



// Initialize Google Cloud Vision client
const visionClient = new vision.ImageAnnotatorClient({
    apiKey: process.env.GOOGLE_VISION_API_KEY,
  });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Main function: Process invoice image
 */
async function processInvoice(imageUrl) {
  try {
    // Step 1: Extract text using Google Cloud Vision
    const ocrText = await extractTextFromImage(imageUrl);
    
    // Step 2: Parse text using GPT-4
    const structuredData = await parseInvoiceText(ocrText);
    
    return structuredData;
    
  } catch (error) {
    console.error('Error processing invoice:', error);
    throw error;
  }
}

/**
 * Extract text from image using Google Cloud Vision
 */
async function extractTextFromImage(imageUrl) {
    try {
      // Step 1: Fetch the image from the URL (already provided!)
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      // Step 2: Convert to base64
      const arrayBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString('base64');
      
      // Step 3: Call Google Cloud Vision
      const [result] = await visionClient.textDetection({
        image: { content: base64Image }
      });
      
      // Step 4: Extract and return the text
      if (!result.textAnnotations || result.textAnnotations.length === 0) {
        throw new Error('No text detected in image');
      }
      
      const extractedText = result.textAnnotations[0].description;
      return extractedText;
      
    } catch (error) {
      console.error('OCR Error:', error);
      throw error;
    }
  }

    



/**
 * Parse OCR text using GPT-4
 */
async function parseInvoiceText(ocrText) {
    try {
      const response = await openai.chat.completions.create({
        // YOUR CODE HERE
        model: 'gpt-4o',
        response_format: { type: "json_object" },
        messages: [
          {
            role:"system",
            content: `You are an invoice parser for convenience store wholesale products. Extract warehouse name, products, and prices from OCR text.

            Rules:
            - Extract ONLY products with clear prices (ignore subtotals, taxes, totals)
            - Confidence score (0-100): How certain you are about each extraction
            - Overall confidence: Average of all product confidences
            - If warehouse name unclear, use "Unknown" with low confidence

            CRITICAL - Standardized Names:
            For each product, provide a "standardized_name" following these EXACT rules:

            ALWAYS KEEP (normalize spelling):
            - BX or BOX → "Box" (this is the pack type - important!)
            - SP or SOFT → "Soft Pack"
            - KS → "King Size"
            - 100 or 100S → "100s"
            - Brand name
            - Variant (Gold, Red, Blue, Menthol, Silver, etc.)

            ALWAYS REMOVE (compliance/packaging codes):
            - FSC (Fire Safe Cigarette)
            - CT, CRT (count)
            - Numbers like "1 CT", "3 CT"
            - Price info

            FORMAT: Brand + Variant + Size + Pack Type
            Examples:
            - "24/7 RED BX KS FSC 1 CT" → "24/7 Red King Size Box"
            - "24/7 BOX KING RED" → "24/7 Red King Size Box"
            - "BASIC GOLD BX KS FSC" → "Basic Gold King Size Box"
            - "BASIC GOLD BX 100 FSC 3 CT" → "Basic Gold 100s Box"
            - "MARLBORO GOLD SP KS" → "Marlboro Gold King Size Soft Pack"
            - "LD 100 RED" → "LD Red 100s Box"
            - "COCA COLA 12OZ 24PK" → "Coca Cola 12oz 24 Pack"

            IMPORTANT: If original has BX or BOX, the standardized name MUST end with "Box".

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

  module.exports = {
    processInvoice,
  };