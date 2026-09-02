import cron from 'node-cron';
import { supabase } from './lib/supabase.js';
import { fetchNewsFromSource } from './lib/adapters/index.js';
import { Source, Team, NormalizedNews } from './lib/types.js';

// --- Funciones auxiliares ---

/**
 * Carga todos los equipos activos de la base de datos.
 * Los necesitamos para el team-matching al ingestar noticias.
 */
async function loadTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*');
  if (error) {
    console.error('[Cron] Error cargando equipos:', error.message);
    return [];
  }
  return data as Team[];
}

/**
 * Carga todas las fuentes activas de la base de datos.
 */
async function loadActiveSources(): Promise<Source[]> {
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('active', true); // Solo las activas
  if (error) {
    console.error('[Cron] Error cargando fuentes:', error.message);
    return [];
  }
  return data as Source[];
}

/**
 * Dado el título de una noticia y la lista de equipos,
 * retorna los IDs de los equipos que aparecen en el título.
 * Usamos la Opción A: includes simple, case-insensitive.
 */
function matchTeams(title: string, teams: Team[]): string[] {
  const titleLower = title.toLowerCase();
  const matched: string[] = [];

  for (const team of teams) {
    for (const alias of team.aliases) {
      if (titleLower.includes(alias.toLowerCase())) {
        matched.push(team.id);
        break; // Ya matcheamos este equipo, pasamos al siguiente
      }
    }
  }

  return matched;
}

/**
 * La función principal de ingesta.
 * Esta es la que corre el cron job cada 15 minutos.
 */
export async function runIngestion(): Promise<void> {
  console.log('[Cron] ▶ Iniciando ciclo de ingesta de noticias...');

  // 1. Cargamos datos de referencia (equipos y fuentes activas)
  const [teams, sources] = await Promise.all([loadTeams(), loadActiveSources()]);

  if (sources.length === 0) {
    console.log('[Cron] No hay fuentes activas. Agregá fuentes a la tabla sources.');
    return;
  }
  console.log(`[Cron] ${sources.length} fuentes activas, ${teams.length} equipos cargados.`);

  // 2. Iteramos cada fuente y buscamos noticias
  for (const source of sources) {
    const rawNews: NormalizedNews[] = await fetchNewsFromSource(source);

    if (rawNews.length === 0) continue;

    // 3. Insertamos en Supabase con dedupe automático.
    // upsert con ignoreDuplicates:true = si la URL ya existe, la ignora silenciosamente
    // y solo retorna las filas que SÍ se insertaron por primera vez.
    const { data: insertedNews, error: insertError } = await supabase
      .from('news')
      .upsert(
        rawNews.map(n => ({
          source_id: source.id,
          title: n.title,
          url: n.url,
          summary: n.summary ?? null,
          published_at: n.published_at?.toISOString() ?? null,
        })),
        { onConflict: 'url', ignoreDuplicates: true }
      )
      .select('id, title');

    if (insertError) {
      // En Supabase con .throwOnError() los conflictos de UNIQUE no tiran error,
      // los ignoran silenciosamente. Pero por las dudas logueamos cualquier error real.
      console.error(`[Cron] Error insertando noticias de ${source.name}:`, insertError.message);
      continue;
    }

    const newCount = insertedNews?.length ?? 0;
    console.log(`[Cron] ${source.name}: ${rawNews.length} encontradas, ${newCount} nuevas.`);

    // 4. Team-matching: solo procesamos las noticias que se insertaron por primera vez
    if (insertedNews && insertedNews.length > 0) {
      const newsTeamsRows: { news_id: string; team_id: string }[] = [];

      for (const news of insertedNews) {
        const matchedTeamIds = matchTeams(news.title, teams);
        for (const teamId of matchedTeamIds) {
          newsTeamsRows.push({ news_id: news.id, team_id: teamId });
        }
      }

      // Insertamos las relaciones en la tabla puente news_teams
      if (newsTeamsRows.length > 0) {
        const { error: ntError } = await supabase
          .from('news_teams')
          .insert(newsTeamsRows);

        if (ntError) {
          console.error('[Cron] Error insertando relaciones news_teams:', ntError.message);
        } else {
          console.log(`[Cron] 🔗 ${newsTeamsRows.length} relaciones noticia-equipo guardadas.`);
        }
      }
    }
  }

  console.log('[Cron] ✅ Ciclo de ingesta finalizado.');
}

/**
 * Registra el cron job para que corra automáticamente cada 15 minutos.
 * Llamar a esta función desde src/index.ts al iniciar el bot.
 */
export function startCronJob(): void {
  // Expresión cron: "*/15 * * * *" = cada 15 minutos
  cron.schedule('*/15 * * * *', async () => {
    await runIngestion();
  });

  console.log('[Cron] ⏰ Cron job registrado. Ingesta cada 15 minutos.');

  // Corremos una ingesta al arrancar para no esperar los primeros 15 minutos
  runIngestion();
}
