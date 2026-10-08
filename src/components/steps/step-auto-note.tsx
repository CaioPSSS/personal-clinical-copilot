'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RoundModal } from '../round-modal';
import { createClient } from '@/lib/supabase/client';
import { Patient, RecordMode, MedicalRecord, Transcription, FileRecord } from '@/lib/types';
import {
  FileText,
  Sparkles,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Save,
  Maximize2,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { SECTION_LABELS } from '@/lib/constants';
import { formatRecordDataToText } from '@/lib/record-parser';

interface StepAutoNoteProps {
  patient?: Patient;
  patientId: string;
  medicalRecord: MedicalRecord | null;
  transcriptions: Transcription[];
  files: FileRecord[];
  onDataChange: () => void;
}

export function StepAutoNote({
  patient,
  patientId,
  medicalRecord,
  transcriptions,
  files,
  onDataChange,
}: StepAutoNoteProps) {
  const [activeMode, setActiveMode] = useState<RecordMode>(() => {
    return patient?.record_mode || medicalRecord?.record_mode || 'enfermaria';
  });

  useEffect(() => {
    if (patient?.record_mode) {
      setActiveMode(patient.record_mode);
    }
  }, [patient?.record_mode]);

  const [generated, setGenerated] = useState(false);
  const [editedNote, setEditedNote] = useState<string>('');
  const [noteWarnings, setNoteWarnings] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'text' | 'sections'>('text');

  const pendingTranscriptions = transcriptions.filter((t) => !t.processed);
  const pendingFiles = files?.filter((f) => !f.processed && f.file_type.startsWith('image')) || [];

  async function handleModeChange(newMode: RecordMode) {
    setActiveMode(newMode);
    try {
      const supabase = createClient();
      await supabase
        .from('patients')
        .update({ record_mode: newMode })
        .eq('id', patientId);
      toast.success(`Modo alterado para ${newMode === 'emergencia_uti' ? 'Emergência / UTI' : 'Enfermaria'}`);
      onDataChange();
    } catch {
      // Ignorar erro silencioso de atualização cadastral
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const pendingFileIds = pendingFiles.map((f) => f.id);

      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          text: editedNote,
          recordMode: activeMode,
          hasTranscriptions: pendingTranscriptions.length > 0 || pendingFiles.length > 0,
          fileIds: pendingFileIds,
        }),
      });

      if (!res.ok) throw new Error('Falha ao salvar');

      setGenerated(true);
      setEditedNote('');
      setNoteWarnings([]);
      onDataChange();
      toast.success('Prontuário salvo com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar o prontuário.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerate(overrideMode?: RecordMode) {
    const targetMode = overrideMode || activeMode;
    setGenerated(false);
    setIsGenerating(true);
    setNoteWarnings([]);

    try {
      const allPendingText = pendingTranscriptions
        .map((t) => t.transcript_text)
        .join('\n\n---\n\n');

      const pendingFileIds = pendingFiles.map((f) => f.id);
      const pendingImagePaths = pendingFiles.map((f) => f.storage_path);

      const res = await fetch('/api/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          transcriptText: allPendingText,
          mode: targetMode,
          fileIds: pendingFileIds.length > 0 ? pendingFileIds : undefined,
          imagePaths: pendingImagePaths.length > 0 ? pendingImagePaths : undefined,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const rawText = await res.text();
        throw new Error(`Resposta do servidor (${res.status}): ${rawText.slice(0, 80)}`);
      }

      const data = await res.json();

      if (!res.ok || !data.text || data.text.trim().length === 0) {
        throw new Error(data.error || 'Nenhum texto foi gerado pela IA. Por favor, tente novamente.');
      }

      setEditedNote(data.text);
      if (data.warnings && Array.isArray(data.warnings) && data.warnings.length > 0) {
        setNoteWarnings(data.warnings);
      }
      toast.success('Prontuário gerado! Por favor, revise o texto abaixo antes de salvar.');
    } catch (err: any) {
      toast.error('Erro ao gerar prontuário: ' + (err.message || 'Falha de comunicação com o servidor.'));
    } finally {
      setIsGenerating(false);
    }
  }

  const recordData = medicalRecord?.record_data;
  const currentFullText = medicalRecord?.record_text || (recordData ? formatRecordDataToText(recordData as Record<string, string>, activeMode) : '');
  const hasRecord = !!(currentFullText && currentFullText.trim().length > 0);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Prontuário copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  }

  const [roundOpen, setRoundOpen] = useState(false);
  const [patientData, setPatientData] = useState<Patient | null>(patient || null);

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
      {/* Barra de Ações e Seleção de Modo */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-base">Geração de Prontuário Clínico</h3>
            </div>

            {/* Alternador de Modo de Prontuário */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Modo:</span>
              <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => handleModeChange('enfermaria')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    activeMode === 'enfermaria'
                      ? 'bg-background text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🏥 Enfermaria
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('emergencia_uti')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    activeMode === 'emergencia_uti'
                      ? 'bg-background text-red-600 dark:text-red-400 font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🚨 Emergência / UTI
                </button>
              </div>

              {pendingTranscriptions.length > 0 && (
                <Badge variant="secondary" className="text-[11px] ml-2">
                  {pendingTranscriptions.length} áudio(s) pendente(s)
                </Badge>
              )}
              {pendingFiles.length > 0 && (
                <Badge variant="outline" className="text-[11px] border-primary/40 text-primary">
                  {pendingFiles.length} foto(s) pendente(s)
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={openRoundMode}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Modo Round
            </Button>

            <Button
              onClick={() => handleGenerate()}
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
              Processando fontes e gerando prontuário em modo {activeMode === 'emergencia_uti' ? 'EMERGÊNCIA/UTI' : 'Enfermaria'}...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center text-sm text-muted-foreground">
              A IA está analisando as transcrições, integrando fotos de plantões e exames, e organizando as seções. Aguarde alguns instantes...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card de Alertas / Pendências a Conferir */}
      {noteWarnings.length > 0 && !isGenerating && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              Pontos de Atenção Identificados pela IA (Apenas para Conferência)
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 pb-3 text-xs space-y-1 text-muted-foreground">
            {noteWarnings.map((warn, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{warn}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Revisão do Prontuário Gerado */}
      {!isGenerating && editedNote && !generated && (
        <Card className="border-yellow-500/40">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <FileText className="w-4 h-4" />
                Revisar Prontuário Gerado ({activeMode === 'emergencia_uti' ? 'EMERGÊNCIA / UTI' : 'Enfermaria'})
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Ajuste qualquer dado diretamente no editor antes de salvar.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(editedNote)}
              className="text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              Copiar Texto
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Textarea
              className="font-mono text-xs min-h-[460px] bg-muted/30 leading-relaxed"
              value={editedNote}
              onChange={(e) => setEditedNote(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditedNote('')}
                className="text-xs text-muted-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Descartar Rascunho
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Confirmar e Salvar Prontuário
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sucesso */}
      {generated && !isGenerating && !editedNote && (
        <Card className="border-green-500/30">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
              Prontuário atualizado e salvo com sucesso!
            </span>
          </CardContent>
        </Card>
      )}

      {/* Prontuário Atual Salvo */}
      {hasRecord && !isGenerating && !editedNote && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Prontuário Atual
                {medicalRecord?.version && (
                  <Badge variant="outline" className="text-[10px] ml-2">
                    v{medicalRecord.version}
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className={`text-[10px] ml-1 ${
                    medicalRecord?.record_mode === 'emergencia_uti'
                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                      : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                  }`}
                >
                  {medicalRecord?.record_mode === 'emergencia_uti' ? '🚨 Emergência/UTI' : '🏥 Enfermaria'}
                </Badge>
              </CardTitle>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'text' ? 'sections' : 'text')}
                className="text-xs"
              >
                {viewMode === 'text' ? 'Ver por Seções' : 'Ver Texto Puro'}
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => copyToClipboard(currentFullText)}
                className="bg-primary/90 text-primary-foreground text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                Copiar para o Prontuário
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {viewMode === 'text' ? (
              <ScrollArea className="h-[550px] w-full rounded-md border bg-muted/20 p-4">
                <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap selection:bg-primary/20">
                  {currentFullText}
                </pre>
              </ScrollArea>
            ) : (
              <ScrollArea className="h-[550px]">
                <div className="space-y-4">
                  {Object.entries(SECTION_LABELS).map(([key, label]) => {
                    const value = recordData?.[key];
                    if (!value || value === 'Não informado' || value === 'N/A') return null;
                    return (
                      <div key={key} className="border-b pb-3 last:border-b-0">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                          {label}
                        </h4>
                        <div className="prose-medical prose-sm text-xs text-foreground leading-relaxed dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!hasRecord && !isGenerating && !editedNote && (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">
            Nenhum prontuário gerado ainda. Faça upload de áudios ou fotos na aba anterior
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
