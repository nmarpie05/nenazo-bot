import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan variables de entorno: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Usamos el SERVICE_ROLE_KEY en vez del ANON_KEY porque nuestro bot
// es un proceso de backend seguro que necesita saltarse las políticas de RLS
// para poder insertar noticias y manejar la base de datos libremente.
export const supabase = createClient(supabaseUrl, supabaseKey);
