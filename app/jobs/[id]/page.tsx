import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/user';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import JobDetail from '@/components/JobDetail';

export const metadata: Metadata = { title: 'Job' };
export const dynamic = 'force-dynamic';

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const userId = await getUserId(supabase);
  if (!userId) redirect('/login');

  // The kit lookup doesn't depend on the job lookup (row-level security
  // already limits kits to your own jobs), so both run at once.
  const [{ data: job }, { data: kit }] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', params.id).eq('user_id', userId).single(),
    supabase
      .from('kits')
      .select('*')
      .eq('job_id', params.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!job) notFound();

  return <JobDetail job={job} kit={kit} />;
}
