// Representación de una fuente en nuestra base de datos (tabla sources)
export interface Source {
  id: string;
  name: string;
  type: 'rss' | 'scrape';
  url: string;
  active: boolean;
}

// El formato estandarizado al que tienen que llegar TODAS las noticias
// sin importar si vienen de RSS o de Scraping.
export interface NormalizedNews {
  title: string;
  url: string; // Usaremos esto para no guardar noticias repetidas (ON CONFLICT DO NOTHING)
  summary?: string;
  published_at?: Date;
}

// Configuración por servidor de Discord (tabla guild_settings)
export interface GuildSettings {
  guild_id: string;
  tone: string;
}

// Representación de un equipo en nuestra base de datos (tabla teams)
export interface Team {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  aliases: string[];
}

