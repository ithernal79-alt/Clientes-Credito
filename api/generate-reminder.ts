import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
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
    const { customerName, balance, businessName, dueDate, currency = 'C$' } = body;

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
          contents: `Escribe un mensaje muy cordial, educado y respetuoso para enviar por WhatsApp al cliente "${customerName}".
Negocio: "${businessName || 'Mi Negocio'}"
Saldo pendiente actual: ${currency} ${balance}
Fecha acordada de pago o vencimiento: ${dueDate || 'Próximamente'}
El mensaje debe ser corto, amigable, claro, con emojis pertinentes (ej. 🏪, 🧾, 🙏) y sin sonar agresivo, recordándole su estado de cuenta y agradeciendo su lealtad.`,
          config: {
            systemInstruction: 'Eres un redactor comercial empático y servicial para dueños de negocios locales.',
          },
        });

        return res.status(200).json({ message: response.text?.trim() });
      } catch (geminiError) {
        console.warn('Gemini reminder error:', geminiError);
      }
    }

    // Fallback template
    const fallback = `¡Hola, estimado(a) ${customerName}! 🏪 Le saludamos de *${businessName || 'nuestro negocio'}*. Le enviamos este cordial recordatorio sobre su saldo pendiente de *${currency} ${balance}*. ¡Agradecemos mucho su preferencia y confianza! Si ya realizó su abono, por favor omita este mensaje. ¡Feliz día! ✨`;
    return res.status(200).json({ message: fallback });
  } catch (error: any) {
    console.error('Error generating reminder:', error);
    return res.status(500).json({ error: error?.message || 'Error generating reminder' });
  }
}
