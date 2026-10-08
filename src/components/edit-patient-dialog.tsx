'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Building2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { updatePatient } from '@/app/(app)/dashboard/actions';
import { Patient, RecordMode } from '@/lib/types';

interface EditPatientDialogProps {
  patient: Patient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
  existingInstitutions?: string[];
}

export function EditPatientDialog({
  patient,
  open,
  onOpenChange,
  onUpdated,
  existingInstitutions = [],
}: EditPatientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [recordMode, setRecordMode] = useState<RecordMode>(patient.record_mode || 'enfermaria');
  const [selectedInst, setSelectedInst] = useState<string>(patient.institution || '');
  const [customInst, setCustomInst] = useState<string>('');
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);

  useEffect(() => {
    setRecordMode(patient.record_mode || 'enfermaria');
    setSelectedInst(patient.institution || '');
    setIsAddingCustom(false);
    setCustomInst('');
  }, [patient]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const finalInst = isAddingCustom || selectedInst === '__new__' ? customInst.trim() : selectedInst;
    formData.set('institution', finalInst);

    const result = await updatePatient(patient.id, formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Dados do paciente atualizados com sucesso!');
      onOpenChange(false);
      onUpdated?.();
    }
    setLoading(false);
  }

  // Lista combinada de instituições existentes + a própria instituição do paciente
  const allInstitutions = Array.from(
    new Set([...existingInstitutions, patient.institution].filter(Boolean))
  ) as string[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Editar Paciente
          </DialogTitle>
          <DialogDescription>
            Atualize as informações cadastrais do paciente abaixo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_full_name">Nome Completo *</Label>
            <Input
              id="edit_full_name"
              name="full_name"
              required
              defaultValue={patient.full_name}
              placeholder="Nome do paciente"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_institution" className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Instituição / Hospital
            </Label>
            {!isAddingCustom ? (
              <div className="flex gap-2">
                <select
                  id="edit_institution-select"
                  value={selectedInst}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setIsAddingCustom(true);
                    } else {
                      setSelectedInst(e.target.value);
                    }
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Nenhuma / Não especificada</option>
                  {allInstitutions.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                  <option value="__new__">+ Cadastrar Nova Instituição...</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da nova instituição..."
                  value={customInst}
                  onChange={(e) => setCustomInst(e.target.value)}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingCustom(false);
                    setCustomInst('');
                  }}
                >
                  Voltar
                </Button>
              </div>
            )}
          </div>

          {/* Seletor de Modo Clínico */}
          <div className="space-y-2">
            <Label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Modo de Prontuário *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm font-medium transition-all ${
                  recordMode === 'enfermaria'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                    : 'border-border hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <input
                  type="radio"
                  name="record_mode"
                  value="enfermaria"
                  checked={recordMode === 'enfermaria'}
                  onChange={() => setRecordMode('enfermaria')}
                  className="sr-only"
                />
                🏥 Modo Enfermaria
              </label>

              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm font-medium transition-all ${
                  recordMode === 'emergencia_uti'
                    ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-semibold shadow-sm'
                    : 'border-border hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <input
                  type="radio"
                  name="record_mode"
                  value="emergencia_uti"
                  checked={recordMode === 'emergencia_uti'}
                  onChange={() => setRecordMode('emergencia_uti')}
                  className="sr-only"
                />
                🚨 Emergência / UTI
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status / Triagem</Label>
              <select
                id="edit_status"
                name="status"
                defaultValue={patient.status || 'estavel'}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="estavel">🟢 Estável</option>
                <option value="atencao">🟡 Em Atenção / Investigação</option>
                <option value="critico">🔴 Crítico / UTI</option>
                <option value="alta">🔵 Alta Prevista</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_gender">Gênero</Label>
              <select
                id="edit_gender"
                name="gender"
                defaultValue={patient.gender || ''}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Selecione</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
                <option value="Não informado">Não informado</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_admission_date">Data/Hora de Admissão</Label>
            <Input
              id="edit_admission_date"
              name="admission_date"
              type="datetime-local"
              defaultValue={
                patient.admission_date
                  ? new Date(patient.admission_date).toISOString().slice(0, 16)
                  : ''
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_bed_number">Leito</Label>
              <Input
                id="edit_bed_number"
                name="bed_number"
                defaultValue={patient.bed_number || ''}
                placeholder="Ex: 12A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_room_number">Quarto</Label>
              <Input
                id="edit_room_number"
                name="room_number"
                defaultValue={patient.room_number || ''}
                placeholder="Ex: 301"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_date_of_birth">Data de Nascimento</Label>
              <Input
                id="edit_date_of_birth"
                name="date_of_birth"
                type="date"
                defaultValue={patient.date_of_birth || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_contact_phone">Telefone</Label>
              <Input
                id="edit_contact_phone"
                name="contact_phone"
                defaultValue={patient.contact_phone || ''}
                placeholder="(71) 99999-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_notes">Observações</Label>
            <Textarea
              id="edit_notes"
              name="notes"
              rows={2}
              defaultValue={patient.notes || ''}
              placeholder="Observações adicionais..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="gradient-primary text-white" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
