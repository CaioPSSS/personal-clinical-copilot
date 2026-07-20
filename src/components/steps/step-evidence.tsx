'use client';

import { useState } from 'react';
import { useCompletion } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  FlaskConical,
  Sparkles,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { MedicalRecord, EvidenceNote } from '@/lib/types';
import { formatDateTime } from '@/lib/helpers';

interface StepEvidenceProps {
  patientId: string;
  medicalRecord: MedicalRecord | null;
  evidenceNote: EvidenceNote | null;
  onDataChange: () => void;
}

export function StepEvidence({
  patientId,
  medicalRecord,
  evidenceNote,
  onDataChange,
}: StepEvidenceProps) {
  const [generated, setGenerated] = useState(false);

  const { completion, isLoading, complete } = useCompletion({
    api: '/api/generate-conduct',
    body: { patientId },
    onFinish: () => {
      setGenerated(true);
      onDataChange();
      toast.success('Conduta gerada com sucesso!');
    },
    onError: (err) => {
      toast.error('Erro ao gerar conduta: ' + err.message);
    },
  });

  async function handleGenerate() {
    if (!medicalRecord) {
      toast.error('Gere o prontuário primeiro (aba Prontuário).');
      return;
    }
    setGenerated(false);
    await complete('', { body: { patientId } });
  }

  const displayContent = isLoading && completion ? completion : evidenceNote?.content;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Action bar */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              Conduta Baseada em Evidências
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              A IA analisa o prontuário, busca diretrizes médicas e gera a conduta.
            </p>
            {!medicalRecord && (
              <Badge variant="destructive" className="mt-2 text-[10px]">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Prontuário necessário
              </Badge>
            )}
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isLoading || !medicalRecord}
            className="gradient-primary text-white hover:opacity-90"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : evidenceNote ? (
              <RefreshCw className="w-4 h-4 mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {evidenceNote ? 'Regenerar Conduta' : 'Gerar Conduta'}
          </Button>
        </CardContent>
      </Card>

      {/* Generated success */}
      {generated && !isLoading && (
        <Card className="border-green-500/30">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm text-green-400">
              Conduta gerada e salva com sucesso!
            </span>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {displayContent ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              {isLoading ? 'Gerando conduta...' : 'Conduta Clínica'}
              {isLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
              {evidenceNote && !isLoading && (
                <span className="text-xs text-muted-foreground ml-auto font-normal">
                  {formatDateTime(evidenceNote.created_at)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="prose-medical text-sm whitespace-pre-wrap">
                {displayContent}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        !isLoading && (
          <div className="text-center py-16">
            <FlaskConical className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhuma conduta gerada ainda. Clique em &quot;Gerar Conduta&quot; para
              obter recomendações baseadas em evidências.
            </p>
          </div>
        )
      )}
    </div>
  );
}
