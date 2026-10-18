import type { SupabaseClient } from '@supabase/supabase-js';

// Who is signed in, for server pages.
//
// The middleware has ALREADY verified this request with Supabase Auth (one
// network call). Calling getUser() again inside every page costs a second
// round trip to the auth server before any data can load. Here the id is read
// from the session cookie's token instead, with no network call. That is safe
// for reading data: every query still runs with the person's own token, so the
// database rejects anything that isn't theirs (row-level security).
//
// Writes in API routes keep using getUser(). If the cookie is missing or
// unreadable this falls back to getUser() so nobody is wrongly signed out.
export async function getUserId(supabase: SupabaseClient): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      if (typeof payload.sub === 'string') return payload.sub;
    }
  } catch {
    /* fall through to the verified call below */
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
