import Groq from 'groq-sdk';
import { generateNewsSummary } from './gemini.js';

// Cliente Groq — ultra-rápido gracias al hardware especializado (LPU)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const GROQ_MODEL = 'openai/gpt-oss-20b';
const DISCORD_LIMIT = 1800;

/**
 * Genera un resumen estilizado aplicando el tono del servidor.
 * Usa Groq como primario (ultra-rápido) y cae a Gemini si Groq falla.
 *
 * @param teamName - Nombre del equipo
 * @param bullets  - Bullet points pre-generados por el cron (hechos sin tono)
 * @param tone     - System prompt con el personaje del servidor
 */
export async function generateStyledSummary(
  teamName: string,
  bullets: string | null,
  tone: string
): Promise<string> {
  const newsContext = bullets
    ? `Hechos clave sobre ${teamName}:\n${bullets}`
    : `No hay noticias disponibles sobre ${teamName} en las últimas horas.`;

  const userPrompt = bullets
    ? `Reescribí estos hechos como un resumen periodístico de 2-3 párrafos. No copies los bullets literalmente. Respondé directo, sin frases introductorias.\n\n${newsContext}`
    : `Informá creativamente que no hay noticias de ${teamName} por ahora. Respondé directo.`;

  // --- Intentamos con Groq primero ---
  if (process.env.GROQ_API_KEY) {
    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: tone },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      const text = completion.choices[0]?.message?.content ?? null;
      if (text) {
        return text.length > DISCORD_LIMIT ? text.slice(0, DISCORD_LIMIT) + '...' : text;
      }
    } catch (error) {
      console.warn('[Groq] Error, cayendo a Gemini como fallback:', error);
    }
  }

  // --- Fallback: Gemini ---
  console.log('[LLM] Usando Gemini como fallback...');
  return generateNewsSummary(teamName, bullets, tone);
}
