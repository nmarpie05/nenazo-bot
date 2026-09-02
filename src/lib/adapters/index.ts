import { Source, NormalizedNews } from '../types.js';
import { fetchRss } from './rss.js';
import { fetchScrape } from './scrape.js';

// Esta es la función orquestadora (el Enfoque Funcional que elegimos)
export async function fetchNewsFromSource(source: Source): Promise<NormalizedNews[]> {
  // Si la fuente está desactivada en la base de datos, no hacemos nada
  if (!source.active) {
    return [];
  }

  console.log(`[Adapter] Buscando noticias en: ${source.name} (tipo: ${source.type})`);

  switch (source.type) {
    case 'rss':
      return await fetchRss(source.url);
      
    case 'scrape':
      return await fetchScrape(source);
      

    default:
      console.warn(`[Adapter] Tipo de fuente desconocido: ${source.type}`);
      return [];
  }
}
