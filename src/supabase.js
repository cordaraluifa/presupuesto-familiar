import { createClient } from '@supabase/supabase-js';

// Valores públicos del proyecto de Supabase. No son secretos: la seguridad
// de los datos la dan las reglas (RLS) de supabase/schema.sql.
// Si en Vercel hay variables válidas, se usan esas; si no, estos.
const DEFAULT_URL = 'https://ecldbrggyisfjsmbozgf.supabase.co';
const DEFAULT_ANON_KEY = 'sb_publishable_enmJ2sZr_kiNoPky1xsl3w_5PvcaRRy';

const clean = (v) => (v || '').trim().replace(/^["']|["']$/g, '').trim();
const normUrl = (v) => clean(v).replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
const validUrl = (v) => /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(v);
const validKey = (v) => /^(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_publishable_[\w-]+)$/.test(v);

const envUrl = normUrl(import.meta.env.VITE_SUPABASE_URL);
const envKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

const url = validUrl(envUrl) ? envUrl : DEFAULT_URL;
const key = validKey(envKey) ? envKey : clean(DEFAULT_ANON_KEY);

let client = null;
let configError = null;

if (!validKey(key)) {
  configError = 'Falta la clave pública (anon / publishable) de Supabase.';
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
