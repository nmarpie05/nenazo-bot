import { GoogleGenAI } from '@google/genai';

// Inicializamos el cliente de Gemini con la API key del .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// El modelo que vamos a usar. gemini-3.6-flash es la versión vigente, rápida y económica.
const MODEL = 'gemini-3.6-flash';

/**
 * Genera un resumen de las noticias del día para un equipo dado,
 * usando el tono configurado por el servidor de Discord.
 *
 * @param teamName   - Nombre del equipo (ej: "Racing Club")
 * @param headlines  - Lista de títulos de noticias (NUNCA texto copiado del artículo)
 * @param tone       - El system prompt con el "personaje" del bot para este servidor
 * @returns          - El resumen generado por Gemini
 */
export async function generateNewsSummary(
  teamName: string,
  headlines: string[],
  tone: string
): Promise<string> {

  // Armamos el prompt. Si no hay titulares, le decimos a Gemini que lo comunique en su tono.
  const newsContext = headlines.length > 0
    ? `Titulares disponibles:\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
    : `No hay titulares disponibles sobre ${teamName} en las últimas horas.`;

  const userPrompt = `
Tenés que informar sobre las últimas noticias de ${teamName}.

${newsContext}

${headlines.length > 0
    ? 'Escribí un resumen cohesivo de no más de 3 párrafos cortos. No copies los titulares literalmente, sintetizalos con tus propias palabras.'
    : 'Comunicá de forma creativa que no hay noticias disponibles en este momento.'
  }
Respondé directamente, sin frases introductorias como "Aquí te presento...".
  `.trim();

  // Reintento automático en caso de error 503 (sobrecarga temporal de la API)
  const MAX_RETRIES = 2;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: tone,
          // Limitamos la respuesta a ~400 tokens ≈ ~300 palabras para resúmenes concisos
          maxOutputTokens: 400,
        },
      });

      const text = response.text ?? 'No pude generar un resumen en este momento.';

      // Seguridad extra: Discord permite máximo 2000 caracteres por mensaje.
      // Reservamos espacio para el encabezado (## 🏎️ Noticias de...) que agrega el comando.
      const DISCORD_LIMIT = 1800;
      return text.length > DISCORD_LIMIT
        ? text.slice(0, DISCORD_LIMIT) + '...'
        : text;

    } catch (error: any) {
      const is503 = error?.status === 503 || error?.message?.includes('503');

      if (is503 && attempt < MAX_RETRIES) {
        console.warn(`[Gemini] Error 503, reintentando en 3s (intento ${attempt}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }

      console.error('[Gemini] Error generando resumen:', error);
      return 'Hubo un error al conectarme con la IA. Intentá de nuevo en un momento.';
    }
  }

  return 'No pude generar un resumen en este momento.';
}
