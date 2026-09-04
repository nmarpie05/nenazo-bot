import Groq from 'groq-sdk';
import { generateNewsSummary, generateBullets as geminiBullets, isQuotaError } from './gemini.js';

// Cliente Groq — ultra-rápido gracias al hardware especializado (LPU)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const GROQ_MODEL = 'openai/gpt-oss-20b';
const DISCORD_LIMIT = 1800;

/**
 * Genera bullets (hechos clave sin tono) a partir de titulares.
 * Usa Groq como primario, Gemini como fallback.
 */
export async function generateBullets(
  teamName: string,
  headlines: string[]
): Promise<string | null> {
  if (headlines.length === 0) return null;

  const prompt = `Sos un editor de noticias. Resumí las siguientes noticias de ${teamName} en exactamente 5 bullet points.
Cada bullet debe ser una oración corta con UN hecho concreto.
Usá lenguaje neutro y objetivo — sin opiniones ni adornos.
Solo devolvé los bullets, uno por línea, empezando con "•".

Titulares:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;

  if (process.env.GROQ_API_KEY) {
    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
      });
      return completion.choices[0]?.message?.content ?? null;
    } catch (error: any) {
      if (isQuotaError(error)) {
        console.warn(`[Groq] Límite de cuota alcanzado (429) para ${teamName}, cayendo a Gemini...`);
      } else {
        console.warn('[Groq] Error generando bullets, cayendo a Gemini:', error?.message || error);
      }
    }
  }
  
  // Fallback a Gemini
  console.log('[LLM] Generando bullets con Gemini (fallback)...');
  return geminiBullets(teamName, headlines);
}

/**
 * Genera un resumen estilizado aplicando el tono del servidor.
 * Acepta bullets pre-generados O headlines crudos como fallback.
 * Usa Groq como primario y cae a Gemini si Groq falla.
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
    } catch (error: any) {
      if (isQuotaError(error)) {
        console.warn('[Groq] Límite de cuota alcanzado (429), cayendo a Gemini...');
      } else {
        console.warn('[Groq] Error, cayendo a Gemini como fallback:', error?.message || error);
      }
    }
  }

  // --- Fallback: Gemini ---
  console.log('[LLM] Usando Gemini como fallback...');
  return generateNewsSummary(teamName, bullets, tone);
}
