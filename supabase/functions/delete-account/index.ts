import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin, getSupabaseUser } from '../_shared/supabaseAdmin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userClient = getSupabaseUser(req);
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const admin = getSupabaseAdmin();
    const userId = user.id;

    await Promise.allSettled([
      admin.from('subscriptions').delete().eq('user_id', userId),
      admin.from('spin_purchases').delete().eq('user_id', userId),
      admin.from('swipe_purchases').delete().eq('user_id', userId),
      admin.from('profiles').delete().eq('id', userId),
    ]);

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return jsonResponse({ error: delErr.message }, 500);

    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Delete failed';
    return jsonResponse({ error: msg }, 500);
  }
});
