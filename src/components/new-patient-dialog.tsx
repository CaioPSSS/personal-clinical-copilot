'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPatient } from '@/app/(app)/dashboard/actions';

interface NewPatientDialogProps {
  onCreated: () => void;
  existingInstitutions?: string[];
}

export function NewPatientDialog({ onCreated, existingInstitutions = [] }: NewPatientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedInst, setSelectedInst] = useState<string>('');
  const [customInst, setCustomInst] = useState<string>('');
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const finalInst = isAddingCustom || selectedInst === '__new__' ? customInst.trim() : selectedInst;
    formData.set('institution', finalInst);

    const result = await createPatient(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Paciente criado com sucesso!');
      setOpen(false);
      setSelectedInst('');
      setCustomInst('');
      setIsAddingCustom(false);
      onCreated();
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gradient-primary text-white hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Novo Paciente
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Paciente</DialogTitle>
          <DialogDescription>
            Preencha os dados do paciente. Campos com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input id="full_name" name="full_name" required placeholder="Nome do paciente" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution" className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Instituição / Hospital
            </Label>
            {!isAddingCustom ? (
              <div className="flex gap-2">
                <select
                  id="institution-select"
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
                  {existingInstitutions.map((inst) => (
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status / Triagem</Label>
              <select
                id="status"
                name="status"
                defaultValue="estavel"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="estavel">🟢 Estável</option>
                <option value="atencao">🟡 Em Atenção / Investigação</option>
                <option value="critico">🔴 Crítico / UTI</option>
                <option value="alta">🔵 Alta Prevista</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gênero</Label>
              <select
                id="gender"
                name="gender"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bed_number">Leito</Label>
              <Input id="bed_number" name="bed_number" placeholder="Ex: 12A" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room_number">Quarto</Label>
              <Input id="room_number" name="room_number" placeholder="Ex: 301" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Data de Nascimento</Label>
              <Input id="date_of_birth" name="date_of_birth" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Telefone</Label>
              <Input id="contact_phone" name="contact_phone" placeholder="(71) 99999-0000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Observações adicionais..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="gradient-primary text-white" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar Paciente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
