-- Script para cargar todos los equipos de la Liga Profesional de Fútbol Argentina (28 clubes)
-- Usamos ON CONFLICT (slug) DO UPDATE para mantener la idempotencia.

INSERT INTO teams (id, slug, name, short_name, aliases)
VALUES
  (gen_random_uuid(), 'boca', 'Boca Juniors', 'Boca', ARRAY['boca', 'xeneize', 'boca juniors']),
  (gen_random_uuid(), 'river', 'River Plate', 'River', ARRAY['river', 'millonario', 'river plate', 'millo']),
  (gen_random_uuid(), 'racing', 'Racing Club', 'Racing', ARRAY['racing', 'la academia', 'racing club']),
  (gen_random_uuid(), 'independiente', 'Independiente', 'Rojo', ARRAY['independiente', 'el rojo', 'rey de copas']),
  (gen_random_uuid(), 'san-lorenzo', 'San Lorenzo', 'San Lorenzo', ARRAY['san lorenzo', 'cuervo', 'ciclón', 'san lorenzo de almagro']),
  (gen_random_uuid(), 'velez', 'Vélez Sarsfield', 'Vélez', ARRAY['velez', 'vélez', 'fortín', 'fortin', 'velez sarsfield']),
  (gen_random_uuid(), 'estudiantes', 'Estudiantes de La Plata', 'Estudiantes', ARRAY['estudiantes', 'pincha', 'pincharrata', 'estudiantes de la plata']),
  (gen_random_uuid(), 'gimnasia', 'Gimnasia y Esgrima La Plata', 'Gimnasia', ARRAY['gimnasia', 'lobo', 'tripero', 'gimnasia la plata', 'gelp']),
  (gen_random_uuid(), 'rosario-central', 'Rosario Central', 'Central', ARRAY['rosario central', 'canalla', 'central']),
  (gen_random_uuid(), 'newells', 'Newell''s Old Boys', 'Newell''s', ARRAY['newell', 'newells', 'lepra', 'leproso', 'nob']),
  (gen_random_uuid(), 'talleres', 'Talleres de Córdoba', 'Talleres', ARRAY['talleres', 'matador', 'talleres de cordoba']),
  (gen_random_uuid(), 'belgrano', 'Belgrano de Córdoba', 'Belgrano', ARRAY['belgrano', 'pirata', 'belgrano de cordoba']),
  (gen_random_uuid(), 'huracan', 'Huracán', 'Huracán', ARRAY['huracan', 'huracán', 'globo', 'globito']),
  (gen_random_uuid(), 'lanus', 'Lanús', 'Lanús', ARRAY['lanus', 'lanús', 'granate']),
  (gen_random_uuid(), 'banfield', 'Banfield', 'Banfield', ARRAY['banfield', 'taladro']),
  (gen_random_uuid(), 'argentinos', 'Argentinos Juniors', 'Argentinos', ARRAY['argentinos', 'bicho', 'argentinos juniors']),
  (gen_random_uuid(), 'defensa', 'Defensa y Justicia', 'Defensa', ARRAY['defensa y justicia', 'halcon', 'halcón']),
  (gen_random_uuid(), 'tigre', 'Tigre', 'Tigre', ARRAY['tigre', 'matador de victoria']),
  (gen_random_uuid(), 'platense', 'Platense', 'Platense', ARRAY['platense', 'calamar']),
  (gen_random_uuid(), 'central-cordoba', 'Central Córdoba', 'Central Cba', ARRAY['central cordoba', 'ferroviario']),
  (gen_random_uuid(), 'union', 'Unión de Santa Fe', 'Unión', ARRAY['union', 'unión', 'tatengue', 'union de santa fe']),
  (gen_random_uuid(), 'instituto', 'Instituto de Córdoba', 'Instituto', ARRAY['instituto', 'gloria', 'instituto de cordoba']),
  (gen_random_uuid(), 'godoy-cruz', 'Godoy Cruz', 'Godoy Cruz', ARRAY['godoy cruz', 'tomba']),
  (gen_random_uuid(), 'sarmiento', 'Sarmiento de Junín', 'Sarmiento', ARRAY['sarmiento', 'verde', 'sarmiento de junin']),
  (gen_random_uuid(), 'barracas', 'Barracas Central', 'Barracas', ARRAY['barracas central', 'guapo', 'barracas']),
  (gen_random_uuid(), 'riestra', 'Deportivo Riestra', 'Riestra', ARRAY['riestra', 'malevo', 'deportivo riestra']),
  (gen_random_uuid(), 'atletico-tucuman', 'Atlético Tucumán', 'Atlético Tucumán', ARRAY['atletico tucuman', 'atlético tucumán', 'decano']),
  (gen_random_uuid(), 'independiente-rivadavia', 'Independiente Rivadavia', 'Ind. Rivadavia', ARRAY['independiente rivadavia', 'lepra mendozina'])
ON CONFLICT (slug) 
DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  aliases = EXCLUDED.aliases;
