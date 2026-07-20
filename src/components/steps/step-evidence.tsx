'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  Globe,
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
      {/* Action Header */}
      {(isLoading || generated) ? null : (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-primary flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Segunda Opinião e Conduta
              </h3>
              <p className="text-sm text-muted-foreground">
                Com base no prontuário consolidado, irei gerar hipóteses
                diagnósticas, pesquisar diretrizes atualizadas e propor um plano
                terapêutico seguro.
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleGenerate}
              className="w-full sm:w-auto shadow-md"
              disabled={isLoading || !medicalRecord}
            >
              {evidenceNote ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Gerar Nova Conduta
                </>
              ) : (
                'Gerar Conduta'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generated Success Message */}
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
              <div className="prose-medical prose-sm text-sm whitespace-pre-wrap dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
              </div>
            </ScrollArea>
            
            {/* Referências de Busca */}
            {evidenceNote?.search_references && evidenceNote.search_references.length > 0 && !isLoading && (
              <div className="mt-6 pt-4 border-t border-border/50">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  Fontes Consultadas Pela IA
                </h4>
                <div className="flex flex-col gap-2">
                  {evidenceNote.search_references.map((ref, idx) => (
                    <a
                      key={idx}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary/80 hover:text-primary hover:underline truncate bg-primary/5 px-3 py-2 rounded-md transition-colors"
                      title={ref.title}
                    >
                      {ref.title || ref.url}
                    </a>
                  ))}
                </div>
              </div>
            )}
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
