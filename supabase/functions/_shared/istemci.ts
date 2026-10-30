import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

/** Tüm yetkilere sahip sunucu istemcisi. Anahtar yalnız sunucuda, Supabase "secrets" içinde durur. */
export function yoneticiIstemci() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

export function yanit(govde: unknown, durum = 200) {
  return new Response(JSON.stringify(govde), { status: durum, headers: { 'Content-Type': 'application/json' } });
}
