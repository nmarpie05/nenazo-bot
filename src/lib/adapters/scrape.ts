import * as cheerio from 'cheerio';
import { Source, NormalizedNews } from '../types.js';

export async function fetchScrape(source: Source): Promise<NormalizedNews[]> {
  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9'
      }
    });
    
    if (!response.ok) {
      console.warn(`[Scraper] HTTP Error ${response.status} al fetchear ${source.url}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const news: NormalizedNews[] = [];
    const seenUrls = new Set<string>();

    const baseUrl = new URL(source.url).origin;

    // Estrategia genérica robusta para diarios: 
    // Buscamos links dentro de etiquetas de título o dentro de <article>
    $('h1 a, h2 a, h3 a, article a, .title a, a.title').each((_, element) => {
      const $el = $(element);
      const title = $el.text().trim();
      let href = $el.attr('href');

      if (!title || !href) return;
      
      // Filtrar links basura (menús, botones) asegurando que el título parezca un titular
      if (title.split(' ').length < 4) return;

      // Resolver URLs relativas (ej: /boca-juniors/nota-123)
      if (href.startsWith('/')) {
        href = `${baseUrl}${href}`;
      }

      // Evitar guardar la misma noticia varias veces si aparece en distintas secciones
      if (!href.startsWith('http') || seenUrls.has(href)) return;
      
      seenUrls.add(href);
      news.push({
        title,
        url: href,
        published_at: new Date() // No podemos parsear la fecha fácilmente, usamos el momento del scrape
      });
    });

    console.log(`[Scraper] ${source.name}: Extraídos ${news.length} titulares de la portada.`);
    return news;

  } catch (error) {
    console.error(`[Scraper] Error escrapeando ${source.name}:`, error);
    return [];
  }
}
