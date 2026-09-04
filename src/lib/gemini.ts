import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = 'gemini-3.6-flash';

export const QUOTA_EXHAUSTED_MESSAGE =
  '⚠️ Se acabaron los tokens de la IA por el momento (Límite de cuota alcanzado). Intentá más tarde cuando se renueve el cupo.';

/**
 * Determina si un error devuelto por la API es por límite de cuota/rate limit (429).
 */
export function isQuotaError(error: any): boolean {
  if (!error) return false;
  const status = error?.status || error?.error?.code || error?.response?.status;
  if (status === 429) return true;
  const str = (error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error))).toLowerCase();
  return (
    str.includes('429') ||
    str.includes('quota') ||
    str.includes('resource_exhausted') ||
    str.includes('rate_limit') ||
    str.includes('rate limit') ||
    str.includes('tpd')
  );
}

/**
 * Genera 5-6 bullet points con los hechos clave de las noticias.
 * SIN tono — son datos puros para guardar en caché.
 * Esta función corre en el cron job (background), no on-demand.
 */
export async function generateBullets(
  teamName: string,
  headlines: string[]
): Promise<string | null> {
  if (headlines.length === 0) return null;

  const prompt = `
Sos un editor de noticias. Resumí las siguientes noticias de ${teamName} en exactamente 5 bullet points.
Cada bullet debe ser una oración corta con UN hecho concreto.
Usá lenguaje neutro y objetivo — sin opiniones ni adornos.
Solo devolvé los bullets, uno por línea, empezando con "•".

Titulares:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { maxOutputTokens: 300 },
    });
    return response.text ?? null;
  } catch (error: any) {
    if (isQuotaError(error)) {
      console.warn(`[Gemini] Límite de cuota alcanzado (429) al generar bullets para ${teamName}.`);
    } else {
      console.error('[Gemini] Error generando bullets:', error);
    }
    return null;
  }
}

/**
 * Aplica un tono a los bullets pre-generados.
 * Fallback usado si Groq no está disponible.
 *
 * @param teamName  - Nombre del equipo
 * @param bullets   - Los bullet points pre-generados (hechos sin tono)
 * @param tone      - El system prompt con el personaje del bot
 */
export async function generateNewsSummary(
  teamName: string,
  bullets: string | null, // Los bullet points pre-generados por el cron
  tone: string
): Promise<string> {

  // Armamos el prompt con los bullets pre-generados
  const newsContext = bullets
    ? `Hechos clave:\n${bullets}`
    : `No hay noticias disponibles sobre ${teamName} en las últimas horas.`;

  const userPrompt = `
Tenés que informar sobre las últimas noticias de ${teamName}.

${newsContext}

${bullets
    ? 'Reescribí estos hechos como un resumen cohesivo de 2-3 párrafos cortos. No copies los bullets literalmente.'
    : 'Comunicá de forma creativa que no hay noticias disponibles en este momento.'
  }
Respondé directamente, sin frases introductorias.
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
      if (isQuotaError(error)) {
        console.warn('[Gemini] Límite de cuota alcanzado (429) generando resumen.');
        return QUOTA_EXHAUSTED_MESSAGE;
      }

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
