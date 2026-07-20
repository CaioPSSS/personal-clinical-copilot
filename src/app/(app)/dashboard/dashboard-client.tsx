'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { PatientCard } from '@/components/patient-card';
import { NewPatientDialog } from '@/components/new-patient-dialog';
import { deletePatient } from './actions';
import { Patient } from '@/lib/types';
import { Search, Users } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardClientProps {
  initialPatients: Patient[];
}

export function DashboardClient({ initialPatients }: DashboardClientProps) {
  const [search, setSearch] = useState('');
  const router = useRouter();

  const filtered = initialPatients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este paciente? Todos os dados serão perdidos.')) return;
    const result = await deletePatient(id);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Paciente excluído.');
      router.refresh();
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Meus Pacientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {initialPatients.length} paciente{initialPatients.length !== 1 ? 's' : ''} registrado{initialPatients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NewPatientDialog onCreated={() => router.refresh()} />
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {search
              ? 'Nenhum paciente encontrado para essa busca.'
              : 'Nenhum paciente registrado. Clique em "Novo Paciente" para começar.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((patient, i) => (
            <div
              key={patient.id}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
            >
              <PatientCard patient={patient} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
