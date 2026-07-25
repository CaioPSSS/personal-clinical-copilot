'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PatientCard } from '@/components/patient-card';
import { NewPatientDialog } from '@/components/new-patient-dialog';
import { deletePatient } from './actions';
import { Patient } from '@/lib/types';
import { Search, Users, Building2, FilterX } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardClientProps {
  initialPatients: Patient[];
}

export function DashboardClient({ initialPatients }: DashboardClientProps) {
  const [search, setSearch] = useState('');
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const router = useRouter();

  // Lista única de instituições cadastradas
  const existingInstitutions = useMemo(() => {
    const set = new Set<string>();
    initialPatients.forEach((p) => {
      if (p.institution?.trim()) set.add(p.institution.trim());
    });
    return Array.from(set).sort();
  }, [initialPatients]);

  // Alternar filtro de instituição
  const toggleInstitution = (inst: string) => {
    setSelectedInstitutions((prev) =>
      prev.includes(inst) ? prev.filter((i) => i !== inst) : [...prev, inst]
    );
  };

  const filtered = initialPatients.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.institution && p.institution.toLowerCase().includes(search.toLowerCase())) ||
      (p.bed_number && p.bed_number.toLowerCase().includes(search.toLowerCase()));

    const matchesInst =
      selectedInstitutions.length === 0 ||
      (p.institution && selectedInstitutions.includes(p.institution));

    return matchesSearch && matchesInst;
  });

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
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Meus Pacientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {initialPatients.length} paciente{initialPatients.length !== 1 ? 's' : ''} registrado{initialPatients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NewPatientDialog
          existingInstitutions={existingInstitutions}
          onCreated={() => router.refresh()}
        />
      </div>

      {/* Search & Institution Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente, instituição ou leito..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        {/* Filtro Multi-Select por Instituição */}
        {existingInstitutions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              Instituição:
            </span>
            <Badge
              variant={selectedInstitutions.length === 0 ? 'default' : 'outline'}
              className="cursor-pointer transition-all hover:opacity-90"
              onClick={() => setSelectedInstitutions([])}
            >
              Todas ({initialPatients.length})
            </Badge>
            {existingInstitutions.map((inst) => {
              const count = initialPatients.filter((p) => p.institution === inst).length;
              const isSelected = selectedInstitutions.includes(inst);
              return (
                <Badge
                  key={inst}
                  variant={isSelected ? 'default' : 'secondary'}
                  className={`cursor-pointer transition-all hover:opacity-90 ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10'
                  }`}
                  onClick={() => toggleInstitution(inst)}
                >
                  {inst} ({count})
                </Badge>
              );
            })}
            {selectedInstitutions.length > 0 && (
              <button
                onClick={() => setSelectedInstitutions([])}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-1"
              >
                <FilterX className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-xl bg-card/40">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">
            {search || selectedInstitutions.length > 0
              ? 'Nenhum paciente encontrado para este filtro.'
              : 'Nenhum paciente registrado. Clique em "Novo Paciente" para começar.'}
          </p>
          {(search || selectedInstitutions.length > 0) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedInstitutions([]);
              }}
              className="mt-2 text-xs text-primary underline"
            >
              Limpar busca e filtros
            </button>
          )}
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
