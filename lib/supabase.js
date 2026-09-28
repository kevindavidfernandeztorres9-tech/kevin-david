import { createClient } from '@supabase/supabase-js';

let client;

// Cliente con la clave service_role: solo se usa en el servidor (rutas /api).
export function supabaseAdmin() {
  if (!client) {
    // Acepta las variables puestas a mano o las que crea la integracion
    // Supabase de Vercel (con prefijo STORAGE).
    const env = process.env;
    const url = env.SUPABASE_URL || env.STORAGE_URL || env.STORAGE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.STORAGE_SERVICE_ROLE_KEY || env.STORAGE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
