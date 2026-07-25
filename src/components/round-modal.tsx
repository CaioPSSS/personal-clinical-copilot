'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Patient, MedicalRecord } from '@/lib/types';
import { calculateAge, formatDate } from '@/lib/helpers';
import { Maximize2, Stethoscope, Building2, Printer, X } from 'lucide-react';

interface RoundModalProps {
  patient: Patient;
  record: MedicalRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoundModal({
  patient,
  record,
  open,
  onOpenChange,
}: RoundModalProps) {
  const age = patient.date_of_birth ? calculateAge(patient.date_of_birth) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[92vh] max-h-[92vh] flex flex-col p-6 glass border-primary/30">
        <DialogHeader className="border-b pb-4 flex flex-row items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary text-white flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  {patient.full_name}
                  {patient.status === 'critico' && (
                    <Badge variant="destructive" className="bg-red-600 text-xs">
                      🔴 Crítico / UTI
                    </Badge>
                  )}
                  {patient.status === 'atencao' && (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 border border-yellow-500/30 text-xs">
                      🟡 Em Atenção
                    </Badge>
                  )}
                  {patient.status === 'alta' && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border border-blue-500/30 text-xs">
                      🔵 Alta Prevista
                    </Badge>
                  )}
                  {(!patient.status || patient.status === 'estavel') && (
                    <Badge variant="outline" className="border-green-500/30 text-green-600 text-xs">
                      🟢 Estável
                    </Badge>
                  )}
                </DialogTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  {age !== null && <span>{age} anos</span>}
                  {patient.gender && <span>• {patient.gender}</span>}
                  {patient.institution && (
                    <span className="flex items-center gap-1 text-primary">
                      <Building2 className="w-3.5 h-3.5" />
                      {patient.institution}
                    </span>
                  )}
                  {patient.bed_number && <span>• Leito {patient.bed_number}</span>}
                  {patient.room_number && <span>• Quarto {patient.room_number}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Imprimir
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Limpo, tipografia médica ampliada para leitura confortável no Round */}
        <ScrollArea className="flex-1 pr-4 py-4">
          {!record || !record.record_data ? (
            <div className="text-center py-20 text-muted-foreground">
              Nenhum prontuário registrado para este paciente ainda.
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto py-2">
              <div className="bg-muted/30 p-4 rounded-xl border flex items-center justify-between text-xs text-muted-foreground">
                <span>Versão do Prontuário: v{record.version}</span>
                <span>Última Atualização: {formatDate(record.updated_at)}</span>
              </div>

              {Object.entries(record.record_data)
                .filter(([, val]) => val && val !== 'Não informado' && val !== 'Não avaliado')
                .map(([key, val]) => (
                  <div key={key} className="space-y-2 border-b pb-4 last:border-b-0">
                    <h3 className="text-base font-bold text-primary capitalize flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                      {key.replace(/_/g, ' ')}
                    </h3>
                    <div className="prose-medical text-base text-foreground leading-relaxed pl-4">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {val}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
