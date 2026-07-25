'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createPatient(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Não autenticado.' };

  const { error } = await supabase.from('patients').insert({
    user_id: user.id,
    full_name: formData.get('full_name') as string,
    institution: (formData.get('institution') as string) || null,
    date_of_birth: (formData.get('date_of_birth') as string) || null,
    gender: (formData.get('gender') as string) || null,
    contact_phone: (formData.get('contact_phone') as string) || null,
    notes: (formData.get('notes') as string) || null,
    bed_number: (formData.get('bed_number') as string) || null,
    room_number: (formData.get('room_number') as string) || null,
  });

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
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
