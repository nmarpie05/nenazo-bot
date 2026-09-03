import { supabase } from './supabase.js';
import { Team } from './types.js';


const DEFAULT_TONE = 'Sos un periodista deportivo argentino, conciso y objetivo. Resumí las noticias del día sin copiar texto literal de los artículos.';

/**
 * Busca un equipo en la BD por nombre o alias (case-insensitive).
 * Primero intenta con el nombre exacto, luego busca en los aliases.
 */
export async function findTeamByName(query: string): Promise<Team | null> {
  const q = query.toLowerCase().trim();

  // Traemos todos los equipos y buscamos el match del lado de Node
  // (Postgres no tiene una forma nativa simple de buscar dentro de arrays con ilike)
  const { data, error } = await supabase.from('teams').select('*');
  if (error || !data) return null;

  const teams = data as Team[];

  // Buscamos primero coincidencia exacta por nombre o slug
  const exact = teams.find(
    t => t.slug === q || t.name.toLowerCase() === q || t.short_name?.toLowerCase() === q
  );
  if (exact) return exact;

  // Luego buscamos en los aliases
  const byAlias = teams.find(t =>
    t.aliases.some(alias => alias.toLowerCase() === q || alias.toLowerCase().includes(q))
  );

  return byAlias ?? null;
}

/**
 * Obtiene la lista completa de equipos registrados en la base de datos, ordenados alfabéticamente.
 */
export async function getAllTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').order('name', { ascending: true });
  if (error || !data) return [];
  return data as Team[];
}


/**
 * Trae los últimos N títulos de noticias de un equipo (para el día de hoy).
 * Busca en las últimas 24 horas, ordenado por fecha descendente.
 */
export async function getHeadlinesForTeam(
  teamId: string,
  limit = 10
): Promise<string[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Paso 1: Traemos los IDs de noticias vinculadas a este equipo (solo los últimos 50
  // para evitar que la URL de Supabase sea demasiado larga y falle con "fetch failed")
  const { data: relations, error: relError } = await supabase
    .from('news_teams')
    .select('news_id')
    .eq('team_id', teamId)
    .order('news_id', { ascending: false })
    .limit(50);

  if (relError || !relations || relations.length === 0) {
    console.log(`[queries] No hay relaciones news_teams para team ${teamId}`);
    return [];
  }

  const newsIds = relations.map(r => r.news_id);

  // Paso 2: Traemos las noticias recientes (últimas 24hs) de esos IDs
  const { data: news, error: newsError } = await supabase
    .from('news')
    .select('title, published_at')
    .in('id', newsIds)
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (newsError || !news) {
    console.error('[queries] Error trayendo headlines:', newsError?.message);
    return [];
  }

  console.log(`[queries] Team ${teamId}: ${relations.length} relaciones, ${news.length} noticias en últimas 24h`);
  return news.map(n => n.title).filter(Boolean);
}



/**
 * Obtiene el tono configurado para un servidor de Discord.
 * Si el servidor no tiene configuración, devuelve el tono por defecto.
 */
export async function getGuildTone(guildId: string): Promise<string> {
  const { data } = await supabase
    .from('guild_settings')
    .select('tone')
    .eq('guild_id', guildId)
    .single();

  return data?.tone ?? DEFAULT_TONE;
}

/**
 * Guarda o actualiza el tono de un servidor de Discord.
 * Usa UPSERT: si el servidor ya tiene configuración la actualiza, si no la crea.
 */
export async function setGuildTone(guildId: string, tone: string): Promise<void> {
  const { error } = await supabase
    .from('guild_settings')
    .upsert({ guild_id: guildId, tone }); // Sin .eq() — el upsert usa la PK automáticamente

  if (error) {
    console.error('[queries] Error guardando tono:', error.message);
    throw error;
  }
}

/**
 * Trae el resumen (bullets) pre-generado del equipo, si existe.
 * Retorna null si no hay ninguno todavía.
 */
export async function getTeamSummary(teamId: string): Promise<{ bullets: string; generated_at: string } | null> {
  const { data } = await supabase
    .from('team_summaries')
    .select('bullets, generated_at')
    .eq('team_id', teamId)
    .single();

  return data ?? null;
}

/**
 * Guarda o actualiza los bullets pre-generados para un equipo.
 * Usa UPSERT porque solo guardamos UN resumen por equipo (el más reciente).
 */
export async function saveTeamSummary(teamId: string, bullets: string): Promise<void> {
  const { error } = await supabase
    .from('team_summaries')
    .upsert({ team_id: teamId, bullets, generated_at: new Date().toISOString() });

  if (error) {
    console.error('[queries] Error guardando team summary:', error.message);
  }
}
