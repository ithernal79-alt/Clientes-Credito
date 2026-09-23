import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client (server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Robust local fallback parser for offline or quick speech parsing
function localParseVoiceText(text: string) {
  const items: Array<{
    id: string;
    quantity: number;
    unit: string;
    product: string;
    unitPrice: number;
    totalPrice: number;
  }> = [];

  // Split by commas, "y luego", "y", newlines, or semicolons
  const parts = text.split(/[,;\n]|\by luego\b|\bademas\b|\bademás\b/i);

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    // Pattern 1: "4 libras de arroz a 27 = C$ 108" or "4 libras de arroz a 27"
    // Pattern 2: "2 litros de leche a 42"
    // Pattern 3: "5 huevos a 7 = 35"
    // Pattern 4: "3 jabones 15"
    const match = part.match(
      /^(\d+(?:[.,]\d+)?)\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)?(?:\s+de)?\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]+?)(?:\s+(?:a|en|c\/u|cada uno|por)?\s+(\d+(?:[.,]\d+)?))(?:\s*=\s*(?:[cC]\$|\$)?\s*(\d+(?:[.,]\d+)?))?$/i
    );

    if (match) {
      const qty = parseFloat(match[1].replace(',', '.'));
      let possibleUnit = match[2]?.trim() || '';
      let prod = match[3]?.trim() || '';
      const unitPrice = parseFloat(match[4].replace(',', '.'));

      // Clean up product and unit
      const commonUnits = ['libras', 'libra', 'lbs', 'lb', 'litros', 'litro', 'lts', 'lt', 'kilos', 'kilo', 'kg', 'bolsas', 'bolsa', 'unidades', 'unidad', 'huevos', 'huevo', 'paquetes', 'paquete', 'cajas', 'caja', 'onzas', 'onza', 'botellas', 'botella', 'latas', 'lata'];
      
      let unit = '';
      if (commonUnits.includes(possibleUnit.toLowerCase())) {
        unit = possibleUnit;
      } else if (possibleUnit) {
        // If not a unit, it's part of the product name
        prod = `${possibleUnit} ${prod}`.trim();
      }

      // If product name ended up in unit (e.g. "5 huevos a 7"), handle it
      if (possibleUnit.toLowerCase() === 'huevos' && (!prod || prod.length === 0)) {
        prod = 'Huevos';
        unit = 'unidades';
      }

      if (!prod) {
        prod = possibleUnit || 'Artículo';
      }

      // Capitalize first letter of product
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

// Endpoint: Parse voice or text into structured invoice items using Gemini 3.8 Flash
app.post('/api/parse-voice', async (req, res) => {
  try {
    const { voiceText } = req.body;

    if (!voiceText || typeof voiceText !== 'string' || !voiceText.trim()) {
      return res.status(400).json({ error: 'voiceText is required' });
    }

    const trimmed = voiceText.trim();

    // Call Gemini 3.8 Flash
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analiza esta transcripción de voz de una venta en una tienda o comercio:
"${trimmed}"

Extrae minuciosamente cada artículo vendido con su cantidad, unidad de medida (libras, litros, huevos, unidades, kg, bolsas, etc.), nombre del producto, precio unitario y precio total calculado.
Ejemplo: "4 libras de arroz a 27= C$ 108 , 2 litros de leche a 42 = C$84 , 5 huevos a 7 = C$ 35"
Debe dar:
- 4 libras de Arroz, precio unitario 27, total 108
- 2 litros de Leche, precio unitario 42, total 84
- 5 unidades de Huevos, precio unitario 7, total 35
Si el total explícito viene dicho en la frase, verifícalo o calcula cantidad * precio unitario.
Si se menciona un nombre de cliente (ej. "a Don Pedro" o "para Maria"), extráelo.
Si se menciona un abono (ej. "abonó 50 córdobas"), extráelo.`,
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
                    unit: { type: Type.STRING, description: 'Unidad de medida (ej. libras, litros, unidades, bolsas)' },
                    product: { type: Type.STRING, description: 'Nombre descriptivo del producto en mayúscula inicial' },
                    unitPrice: { type: Type.NUMBER, description: 'Precio unitario' },
                    totalPrice: { type: Type.NUMBER, description: 'Precio total del renglón' },
                  },
                  required: ['quantity', 'product', 'unitPrice', 'totalPrice'],
                },
              },
              detectedCustomerName: {
                type: Type.STRING,
                description: 'Nombre del cliente mencionado o cadena vacía',
              },
              detectedPaymentOrDeposit: {
                type: Type.NUMBER,
                description: 'Monto que abonó en el momento o 0',
              },
              notes: {
                type: Type.STRING,
                description: 'Cualquier detalle adicional o resumen de la venta',
              },
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

      return res.json({
        items: itemsWithIds,
        detectedCustomerName: parsedJson.detectedCustomerName || '',
        detectedPaymentOrDeposit: Number(parsedJson.detectedPaymentOrDeposit) || 0,
        notes: parsedJson.notes || '',
        source: 'gemini',
      });
    } catch (geminiError: any) {
      console.warn('Gemini parsing failed or unavailable, using local smart parser fallback:', geminiError?.message);
      const fallbackItems = localParseVoiceText(trimmed);
      return res.json({
        items: fallbackItems,
        detectedCustomerName: '',
        detectedPaymentOrDeposit: 0,
        notes: '',
        source: 'local_fallback',
      });
    }
  } catch (error: any) {
    console.error('Error in /api/parse-voice:', error);
    res.status(500).json({ error: error?.message || 'Error processing speech text' });
  }
});

// Endpoint: Generate friendly WhatsApp reminder message using Gemini
app.post('/api/generate-reminder', async (req, res) => {
  try {
    const { customerName, balance, businessName, dueDate, currency = 'C$' } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Escribe un mensaje muy cordial, educado y respetuoso para enviar por WhatsApp al cliente "${customerName}".
Negocio: "${businessName || 'Mi Negocio'}"
Saldo pendiente actual: ${currency} ${balance}
Fecha acordada de pago o vencimiento: ${dueDate || 'Próximamente'}
El mensaje debe ser corto, amigable, claro, con emojis pertinentes (ej. 🏪, 🧾, 🙏) y sin sonar agresivo, recordándole su estado de cuenta y agradeciendo su lealtad.`,
      config: {
        systemInstruction: 'Eres un redactor comercial empático y servicial para dueños de negocios locales.',
      },
    });

    res.json({ message: response.text?.trim() });
  } catch (err: any) {
    console.error('Error generating reminder with Gemini:', err);
    // Fallback template
    const { customerName, balance, businessName, currency = 'C$' } = req.body;
    const fallback = `¡Hola, estimado(a) ${customerName}! 🏪 Le saludamos de *${businessName || 'nuestro negocio'}*. Le enviamos este cordial recordatorio sobre su saldo pendiente de *${currency} ${balance}*. ¡Agradecemos mucho su preferencia y confianza! Si ya realizó su abono, por favor omita este mensaje. ¡Feliz día! ✨`;
    res.json({ message: fallback });
  }
});

// Setup Vite in Dev or serve static in Prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
