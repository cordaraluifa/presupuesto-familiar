import { createClient } from '@supabase/supabase-js';

// Limpia espacios o comillas que se cuelan al copiar y pegar.
const clean = (v) => (v || '').trim().replace(/^["']|["']$/g, '').trim();
const url = clean(import.meta.env.VITE_SUPABASE_URL).replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
const key = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

let client = null;
let configError = null;

if (!url || !key) {
  configError = `Falta ${!url ? 'VITE_SUPABASE_URL' : ''}${!url && !key ? ' y ' : ''}${!key ? 'VITE_SUPABASE_ANON_KEY' : ''}.`;
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
  configError = `VITE_SUPABASE_URL no tiene el formato esperado (https://xxxx.supabase.co). Valor actual: "${url.slice(0, 60)}"`;
} else {
  try {
    client = createClient(url, key);
  } catch (e) {
    configError = `No se pudo conectar con Supabase: ${e.message}`;
  }
}

export const configured = Boolean(client);
export const supabase = client;
export { configError };
