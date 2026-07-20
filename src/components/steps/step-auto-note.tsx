'use client';

import { useState } from 'react';
import { useCompletion } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Sparkles,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MedicalRecord, Transcription } from '@/lib/types';

interface StepAutoNoteProps {
  patientId: string;
  medicalRecord: MedicalRecord | null;
  transcriptions: Transcription[];
  onDataChange: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  queixa_principal: 'Queixa Principal (QP)',
  historia_doenca_atual: 'História da Moléstia Atual (HMA)',
  revisao_de_sistemas: 'Revisão de Sistemas',
  antecedentes_pessoais: 'Antecedentes Pessoais',
  antecedentes_familiares: 'Antecedentes Familiares',
  habitos_de_vida: 'Hábitos de Vida',
  medicacoes_em_uso: 'Medicações em Uso',
  alergias: 'Alergias',
  exame_fisico: 'Exame Físico',
  hipoteses_diagnosticas: 'Hipóteses Diagnósticas',
  plano_terapeutico: 'Plano Terapêutico',
};

export function StepAutoNote({
  patientId,
  medicalRecord,
  transcriptions,
  onDataChange,
}: StepAutoNoteProps) {
  const [generated, setGenerated] = useState(false);
  const [editedNote, setEditedNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const pendingTranscriptions = transcriptions.filter((t) => !t.processed);

  const { completion, isLoading, complete } = useCompletion({
    api: '/api/generate-note',
    body: { patientId },
    onFinish: (_, text) => {
      setEditedNote(text);
      toast.success('Prontuário gerado. Por favor, revise o texto abaixo antes de salvar.');
    },
    onError: (err) => {
      toast.error('Erro ao gerar prontuário: ' + err.message);
    },
  });

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          text: editedNote,
          hasTranscriptions: pendingTranscriptions.length > 0,
        }),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      
      setGenerated(true);
      setEditedNote('');
      onDataChange();
      toast.success('Prontuário salvo com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar o prontuário.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerate() {
    setGenerated(false);
    const allPendingText = pendingTranscriptions
      .map((t) => t.transcript_text)
      .join('\n\n---\n\n');

    await complete(allPendingText, {
      body: {
        patientId,
        transcriptionText: allPendingText || null,
      },
    });
  }

  const recordData = medicalRecord?.record_data;
  const hasRecord = recordData && Object.keys(recordData).length > 0;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Action bar */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Geração Automática de Prontuário
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              A IA funde transcrições pendentes com o prontuário existente.
            </p>
            {pendingTranscriptions.length > 0 && (
              <Badge variant="secondary" className="mt-2">
                {pendingTranscriptions.length} transcrição(ões) pendente(s)
              </Badge>
            )}
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="gradient-primary text-white hover:opacity-90"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : hasRecord ? (
              <RefreshCw className="w-4 h-4 mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {hasRecord ? 'Atualizar Prontuário' : 'Gerar Prontuário'}
          </Button>
        </CardContent>
      </Card>

      {/* Streaming output */}
      {isLoading && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Gerando prontuário...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="prose-medical text-sm whitespace-pre-wrap">
                {completion}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Review output */}
      {!isLoading && editedNote && !generated && (
        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-yellow-500">
              <FileText className="w-4 h-4" />
              Revisar Prontuário Gerado
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Faça as correções necessárias no texto Markdown abaixo antes de salvar.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Textarea
              className="font-mono text-xs min-h-[400px] bg-muted/50"
              value={editedNote}
              onChange={(e) => setEditedNote(e.target.value)}
            />
            <Button 
              className="w-full sm:w-auto self-end bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Confirmar e Salvar Prontuário
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generated success */}
      {generated && !isLoading && !editedNote && (
        <Card className="border-green-500/30">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm text-green-400">
              Prontuário atualizado e salvo com sucesso!
            </span>
          </CardContent>
        </Card>
      )}

      {/* Prontuário atual */}
      {hasRecord && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Prontuário Atual
              {medicalRecord?.version && (
                <Badge variant="outline" className="text-[10px] ml-2">
                  v{medicalRecord.version}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {Object.entries(SECTION_LABELS).map(([key, label]) => {
                  const value = recordData[key];
                  if (!value || value === 'Não informado') return null;
                  return (
                    <div key={key}>
                      <h3 className="text-sm font-semibold text-primary mb-1">
                        {label}
                      </h3>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!hasRecord && !isLoading && !completion && (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhum prontuário gerado ainda. Faça upload de áudios na aba anterior
            e clique em &quot;Gerar Prontuário&quot;.
          </p>
        </div>
      )}
    </div>
  );
}
