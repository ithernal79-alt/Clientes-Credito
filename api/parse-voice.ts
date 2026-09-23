import { GoogleGenAI, Type } from '@google/genai';

function localParseVoiceText(text: string) {
  const items: Array<{
    id: string;
    quantity: number;
    unit: string;
    product: string;
    unitPrice: number;
    totalPrice: number;
  }> = [];

  const parts = text.split(/[,;\n]|\by luego\b|\bademas\b|\bademás\b/i);

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    const match = part.match(
      /^(\d+(?:[.,]\d+)?)\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)?(?:\s+de)?\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]+?)(?:\s+(?:a|en|c\/u|cada uno|por)?\s+(\d+(?:[.,]\d+)?))(?:\s*=\s*(?:[cC]\$|\$)?\s*(\d+(?:[.,]\d+)?))?$/i
    );

    if (match) {
      const qty = parseFloat(match[1].replace(',', '.'));
      let possibleUnit = match[2]?.trim() || '';
      let prod = match[3]?.trim() || '';
      const unitPrice = parseFloat(match[4].replace(',', '.'));

      const commonUnits = [
        'libras', 'libra', 'lbs', 'lb', 'litros', 'litro', 'lts', 'lt',
        'kilos', 'kilo', 'kg', 'bolsas', 'bolsa', 'unidades', 'unidad',
        'huevos', 'huevo', 'paquetes', 'paquete', 'cajas', 'caja',
        'onzas', 'onza', 'botellas', 'botella', 'latas', 'lata',
      ];

      let unit = '';
      if (commonUnits.includes(possibleUnit.toLowerCase())) {
        unit = possibleUnit;
      } else if (possibleUnit) {
        prod = `${possibleUnit} ${prod}`.trim();
      }

      if (possibleUnit.toLowerCase() === 'huevos' && (!prod || prod.length === 0)) {
        prod = 'Huevos';
        unit = 'unidades';
      }

      if (!prod) {
        prod = possibleUnit || 'Artículo';
      }

      prod = prod.charAt(0).toUpperCase() + prod.slice(1);
      const calculatedTotal = qty * unitPrice;
      const explicitTotal = match[5] ? parseFloat(match[5].replace(',', '.')) : calculatedTotal;

      items.push({
        id: 'item_' + Math.random().toString(36).substring(2, 9),
        quantity: qty,
        unit: unit || 'und',
        product: prod,
        unitPrice: unitPrice,
        totalPrice: explicitTotal || calculatedTotal,
      });
    }
  }

  return items;
}

export default async function handler(req: any, res: any) {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { voiceText } = body;

    if (!voiceText || typeof voiceText !== 'string' || !voiceText.trim()) {
      return res.status(400).json({ error: 'voiceText is required' });
    }

    const trimmed = voiceText.trim();

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Analiza esta transcripción de voz de una venta en una tienda o comercio:
"${trimmed}"

Extrae minuciosamente cada artículo vendido con su cantidad, unidad de medida, nombre del producto, precio unitario y precio total calculado.
Ejemplo: "4 libras de arroz a 27= C$ 108 , 2 litros de leche a 42 = C$84 , 5 huevos a 7 = C$ 35"
Debe dar:
- 4 libras de Arroz, precio unitario 27, total 108
- 2 litros de Leche, precio unitario 42, total 84
- 5 unidades de Huevos, precio unitario 7, total 35`,
          config: {
            systemInstruction:
              'Eres un asistente contable y de facturación experto en pequeños negocios, pulperías y tiendas de abarrotes de Latinoamérica. Extraes productos, cantidades, precios y cálculos con exactitud matemática.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      quantity: { type: Type.NUMBER, description: 'Cantidad numérica del producto' },
                      unit: { type: Type.STRING, description: 'Unidad de medida' },
                      product: { type: Type.STRING, description: 'Nombre descriptivo del producto' },
                      unitPrice: { type: Type.NUMBER, description: 'Precio unitario' },
                      totalPrice: { type: Type.NUMBER, description: 'Precio total del renglón' },
                    },
                    required: ['quantity', 'product', 'unitPrice', 'totalPrice'],
                  },
                },
                detectedCustomerName: { type: Type.STRING },
                detectedPaymentOrDeposit: { type: Type.NUMBER },
                notes: { type: Type.STRING },
              },
              required: ['items'],
            },
          },
        });

        const parsedJson = JSON.parse(response.text || '{}');
        const itemsWithIds = (parsedJson.items || []).map((it: any) => ({
          id: 'item_' + Math.random().toString(36).substring(2, 9),
          quantity: Number(it.quantity) || 1,
          unit: it.unit || 'und',
          product: it.product || 'Artículo',
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: Number(it.totalPrice) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
        }));

        return res.status(200).json({
          items: itemsWithIds,
          detectedCustomerName: parsedJson.detectedCustomerName || '',
          detectedPaymentOrDeposit: Number(parsedJson.detectedPaymentOrDeposit) || 0,
          notes: parsedJson.notes || '',
          source: 'gemini',
        });
      } catch (geminiError) {
        console.warn('Gemini in serverless failed, using fallback:', geminiError);
      }
    }

    // Fallback to local parser
    const fallbackItems = localParseVoiceText(trimmed);
    return res.status(200).json({
      items: fallbackItems,
      detectedCustomerName: '',
      detectedPaymentOrDeposit: 0,
      notes: '',
      source: 'local_fallback',
    });
  } catch (error: any) {
    console.error('Error in Vercel api/parse-voice:', error);
    return res.status(500).json({ error: error?.message || 'Error processing speech text' });
  }
}
