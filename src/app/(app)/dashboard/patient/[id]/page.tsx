import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { PatientWorkspace } from '@/components/patient-workspace';

export default async function PatientPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Buscar paciente
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!patient) notFound();

  // Buscar dados associados em paralelo
  const [recordRes, transcRes, evidenceRes, messagesRes, filesRes] =
    await Promise.all([
      supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', id)
        .order('version', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('transcriptions')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('evidence_notes')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('chat_messages')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('files')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false }),
    ]);

  return (
    <PatientWorkspace
      patient={patient}
      initialRecord={recordRes.data ?? null}
      initialTranscriptions={transcRes.data ?? []}
      initialEvidenceNote={evidenceRes.data ?? null}
      initialChatMessages={messagesRes.data ?? []}
      initialFiles={filesRes.data ?? []}
    />
  );
}
