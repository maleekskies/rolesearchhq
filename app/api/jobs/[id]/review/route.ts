import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const REASONS = ['wrong seniority', 'wrong domain', 'too thin', 'needs a language I do not speak', 'on-site or hybrid'] as const;

// POST /api/jobs/:id/review   { action: 'save' | 'skip' | 'reject', reason?: string }
// One tap from the Today screen. Save puts the job in the pipeline, skip hides it,
// and reject also teaches the matcher (same rule as the job page: the rejection is
// recorded and similar roles are downranked for 14 days).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action: string = body?.action;
  const now = new Date().toISOString();

  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, company, user_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  if (action === 'save') {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'saved', reviewed_at: now, updated_at: now })
      .eq('id', job.id)
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'skip') {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'ignored', reviewed_at: now, updated_at: now })
      .eq('id', job.id)
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    const reason: string = REASONS.includes(body?.reason) ? body.reason : 'too thin';
    const term = reason === 'wrong domain' ? job.company : job.title;
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'rejected', reject_reason: reason, reviewed_at: now, updated_at: now })
      .eq('id', job.id)
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from('rejections').insert({ user_id: user.id, job_id: job.id, reason, term });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
