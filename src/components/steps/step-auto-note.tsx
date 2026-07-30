'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RoundModal } from '../round-modal';
import { createClient } from '@/lib/supabase/client';
import { Patient } from '@/lib/types';
import {
  FileText,
  Sparkles,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Save,
  Maximize2,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MedicalRecord, Transcription, FileRecord } from '@/lib/types';

interface StepAutoNoteProps {
  patientId: string;
  medicalRecord: MedicalRecord | null;
  transcriptions: Transcription[];
  files: FileRecord[];
  onDataChange: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  identificacao: 'Identificação',
  queixa_principal: 'Queixa Principal',
  historia_doenca_atual: 'História da Moléstia Atual',
  antecedentes_pessoais: 'Antecedentes Pessoais',
  alergias: 'Alergias',
  medicacoes_uso_continuo: 'Medicação de Uso Contínuo',
  antecedentes_familiares: 'Antecedentes Familiares',
  habitos_de_vida: 'Hábitos de Vida',
  exame_fisico: 'Exame Físico',
  evolucao_do_dia: 'Evolução do Dia',
  exames_laboratoriais: 'Exames Laboratoriais',
  exames_imagem: 'Exames de Imagem',
  condutas: 'Condutas Feitas/Planejadas',
};

export function StepAutoNote({
  patientId,
  medicalRecord,
  transcriptions,
  files,
  onDataChange,
}: StepAutoNoteProps) {
  const [generated, setGenerated] = useState(false);
  const [editedNote, setEditedNote] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const pendingTranscriptions = transcriptions.filter((t) => !t.processed);
  const pendingFiles = files?.filter((f) => !f.processed && f.file_type.startsWith('image')) || [];

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          text: editedNote,
          hasTranscriptions: pendingTranscriptions.length > 0 || pendingFiles.length > 0,
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
    setIsGenerating(true);

    try {
      const allPendingText = pendingTranscriptions
        .map((t) => t.transcript_text)
        .join('\n\n---\n\n');

      const imagePaths = pendingFiles.map((f) => f.storage_path);

      const res = await fetch('/api/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          transcriptText: allPendingText,
          imagePaths: imagePaths.length > 0 ? imagePaths : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.text || data.text.trim().length === 0) {
        throw new Error(data.error || 'Nenhum texto foi gerado pela IA. Por favor, tente novamente.');
      }

      setEditedNote(data.text);
      toast.success('Prontuário gerado. Por favor, revise o texto abaixo antes de salvar.');
    } catch (err: any) {
      toast.error('Erro ao gerar prontuário: ' + (err.message || 'Falha de comunicação com o servidor.'));
    } finally {
      setIsGenerating(false);
    }
  }

  const recordData = medicalRecord?.record_data;
  const hasRecord = recordData && Object.keys(recordData).length > 0;

  const [roundOpen, setRoundOpen] = useState(false);
  const [patientData, setPatientData] = useState<Patient | null>(null);

  async function openRoundMode() {
    if (!patientData) {
      const supabase = createClient();
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      if (data) setPatientData(data as Patient);
    }
    setRoundOpen(true);
  }

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openRoundMode}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Modo Round (Tela Cheia)
            </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gradient-primary text-white hover:opacity-90"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : hasRecord ? (
              <RefreshCw className="w-4 h-4 mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {hasRecord ? 'Atualizar Prontuário' : 'Gerar Prontuário'}
          </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading output */}
      {isGenerating && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Gerando prontuário...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center text-sm text-muted-foreground">
              A IA está analisando as transcrições e gerando o prontuário. Por favor, aguarde alguns segundos...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review output */}
      {!isGenerating && editedNote && !generated && (
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
      {generated && !isGenerating && !editedNote && (
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
      {hasRecord && !isGenerating && (
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
                      <div className="prose-medical prose-sm text-sm text-foreground/80 leading-relaxed dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!hasRecord && !isGenerating && !editedNote && (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhum prontuário gerado ainda. Faça upload de áudios na aba anterior
            e clique em &quot;Gerar Prontuário&quot;.
          </p>
        </div>
      )}
      {patientData && (
        <RoundModal
          patient={patientData}
          record={medicalRecord}
          open={roundOpen}
          onOpenChange={setRoundOpen}
        />
      )}
    </div>
  );
}
