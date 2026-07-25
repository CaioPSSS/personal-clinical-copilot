import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReportsClient } from './reports-client';
import { WeeklyReport } from '@/lib/types';

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Buscar todos os relatórios semanais do usuário
  const { data: reports } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Buscar contagem de casos acumulados desde a última aula
  const lastReportDate = reports && reports.length > 0
    ? new Date(reports[0].created_at).toISOString()
    : new Date(0).toISOString();

  const { data: updatedRecords } = await supabase
    .from('medical_records')
    .select('patient_id')
    .eq('user_id', user.id)
    .gt('updated_at', lastReportDate);

  const accumulatedCount = updatedRecords
    ? new Set(updatedRecords.map((r) => r.patient_id)).size
    : 0;

  return (
    <ReportsClient
      initialReports={(reports as WeeklyReport[]) || []}
      accumulatedCount={accumulatedCount}
    />
  );
}
