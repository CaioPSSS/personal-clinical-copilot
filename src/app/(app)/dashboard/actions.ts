'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { RecordMode } from '@/lib/types';

export async function createPatient(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Não autenticado.' };

  const recordMode = (formData.get('record_mode') as RecordMode) || 'enfermaria';
  const admissionDate = (formData.get('admission_date') as string) || null;

  const basePayload: Record<string, any> = {
    user_id: user.id,
    full_name: formData.get('full_name') as string,
    institution: (formData.get('institution') as string) || null,
    status: (formData.get('status') as string) || 'estavel',
    date_of_birth: (formData.get('date_of_birth') as string) || null,
    gender: (formData.get('gender') as string) || null,
    contact_phone: (formData.get('contact_phone') as string) || null,
    notes: (formData.get('notes') as string) || null,
    bed_number: (formData.get('bed_number') as string) || null,
    room_number: (formData.get('room_number') as string) || null,
  };

  let { error } = await supabase.from('patients').insert({
    ...basePayload,
    record_mode: recordMode,
    admission_date: admissionDate,
  });

  // Fallback suave se o Supabase ainda não tiver executado a migração das novas colunas
  if (error && error.message?.includes('schema cache')) {
    const retry = await supabase.from('patients').insert(basePayload);
    error = retry.error;
  }

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return {};
}

export async function updatePatient(patientId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Não autenticado.' };

  const recordMode = formData.get('record_mode') as RecordMode | null;
  const admissionDate = formData.get('admission_date') as string | null;

  const updateData: Record<string, any> = {
    full_name: formData.get('full_name') as string,
    institution: (formData.get('institution') as string) || null,
    status: (formData.get('status') as string) || 'estavel',
    date_of_birth: (formData.get('date_of_birth') as string) || null,
    gender: (formData.get('gender') as string) || null,
    contact_phone: (formData.get('contact_phone') as string) || null,
    notes: (formData.get('notes') as string) || null,
    bed_number: (formData.get('bed_number') as string) || null,
    room_number: (formData.get('room_number') as string) || null,
    updated_at: new Date().toISOString(),
  };

  if (recordMode) updateData.record_mode = recordMode;
  if (admissionDate !== undefined) updateData.admission_date = admissionDate || null;

  let { error } = await supabase
    .from('patients')
    .update(updateData)
    .eq('id', patientId)
    .eq('user_id', user.id);

  if (error && error.message?.includes('schema cache')) {
    delete updateData.record_mode;
    delete updateData.admission_date;
    const retry = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', patientId)
      .eq('user_id', user.id);
    error = retry.error;
  }

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/patient/${patientId}`);
  return {};
}

export async function deletePatient(patientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Não autenticado.' };

  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', patientId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return {};
}
