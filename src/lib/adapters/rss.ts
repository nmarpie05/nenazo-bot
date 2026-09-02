import Parser from 'rss-parser';
import { NormalizedNews } from '../types.js';

// Inicializamos el parser de RSS
const parser = new Parser();

export async function fetchRss(url: string): Promise<NormalizedNews[]> {
  try {
    const feed = await parser.parseURL(url);
    
    // Mapeamos los datos en crudo del RSS a nuestro formato normalizado
    return feed.items.map(item => ({
      title: item.title || 'Sin título',
      url: item.link || '', 
      // OJO ACÁ: Por tu regla de negocio, NUNCA copiamos el resumen del sitio 
      // por riesgo de copyright. Así que lo dejamos en undefined o vacío.
      summary: undefined, 
      published_at: item.isoDate ? new Date(item.isoDate) : undefined,
    })).filter(news => news.url !== ''); // Filtramos noticias inválidas sin URL
    
  } catch (error) {
    console.error(`Error leyendo el RSS desde ${url}:`, error);
    return [];
  }
}
