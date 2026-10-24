'use client';

import { useState, useRef } from 'react';
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
  CheckCircle2,
  Globe,
  Copy,
  Check,
  FilePlus2,
  GraduationCap,
  Zap,
  Pill,
  Lightbulb,
  AlertTriangle,
  BookOpen,
  Activity,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { Patient, MedicalRecord, EvidenceNote } from '@/lib/types';
import { ConductDepth } from '@/lib/prompts/evidence-note';
import { formatDateTime } from '@/lib/helpers';

interface StepEvidenceProps {
  patient?: Patient;
  patientId: string;
  medicalRecord: MedicalRecord | null;
  evidenceNote: EvidenceNote | null;
  onDataChange: () => void;
}

const TOC_SECTIONS = [
  { id: '1', label: '1. Problema', keyword: 'representacao' },
  { id: '2', label: '2. Lista', keyword: 'lista-de-problemas' },
  { id: '3', label: '3. Fisiopatologia', keyword: 'fisiopatolog' },
  { id: '4', label: '4. Diferenciais', keyword: 'diferencia' },
  { id: '5', label: '5. Propedêutica', keyword: 'proped' },
  { id: '6', label: '6. Prescrição', keyword: 'prescric' },
  { id: '7', label: '7. Metas', keyword: 'metas' },
  { id: '8', label: '8. Pérolas', keyword: 'perolas' },
  { id: '9', label: '9. Red Flags', keyword: 'alarme' },
  { id: '10', label: '10. Diretrizes', keyword: 'diretrizes' },
];

function extractPrescriptionOnly(markdown: string): string {
  if (!markdown) return '';
  const match = markdown.match(
    /##\s*(?:6\.\s*)?Prescrição[^\n]*\n([\s\S]*?)(?=\n##\s*(?:7\.\s*)?Metas|\n##\s*\d|$)/i
  );
  if (match && match[1]) {
    return match[1].trim();
  }
  return markdown;
}

export function StepEvidence({
  patient,
  patientId,
  medicalRecord,
  evidenceNote,
  onDataChange,
}: StepEvidenceProps) {
  const [depth, setDepth] = useState<ConductDepth>('grand_rounds');
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedRx, setCopiedRx] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isOutpatient =
    patient?.record_mode === 'ambulatorio' || medicalRecord?.record_mode === 'ambulatorio';
  const specialtyName = patient?.specialty?.trim() || 'Clínica Médica';

  const { completion, isLoading, complete } = useCompletion({
    api: '/api/generate-conduct',
    body: { patientId, depth },
    onFinish: () => {
      setGenerated(true);
      onDataChange();
      toast.success(
        depth === 'grand_rounds'
          ? 'Aula Clínica Aprofundada (Grand Rounds) gerada com sucesso!'
          : 'Conduta clínica objetiva gerada com sucesso!'
      );
    },
    onError: (err) => {
      toast.error('Erro ao gerar conduta: ' + err.message);
    },
  });

  async function handleGenerate(overrideDepth?: ConductDepth) {
    if (!medicalRecord) {
      toast.error('Gere a anamnese do paciente primeiro na aba Prontuário.');
      return;
    }
    const targetDepth = overrideDepth || depth;
    setGenerated(false);
    await complete('', { body: { patientId, depth: targetDepth } });
  }

  const displayContent = isLoading && completion ? completion : evidenceNote?.content;

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Conteúdo copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  }

  function copyPrescriptionOnly() {
    if (!displayContent) return;
    const rx = extractPrescriptionOnly(displayContent);
    navigator.clipboard.writeText(rx);
    setCopiedRx(true);
    toast.success('Receituário e prescrição copiados com sucesso!');
    setTimeout(() => setCopiedRx(false), 2000);
  }

  async function handleInsertIntoRecord() {
    if (!displayContent || !medicalRecord) return;
    setIsInserting(true);
    try {
      const currentText = medicalRecord.record_text || '';
      const sectionTitle =
        depth === 'grand_rounds'
          ? `Aula Clínica & Conduta Especializada (${specialtyName})`
          : `Lista de Problemas e Condutas (${specialtyName})`;

      const combinedText = `${currentText.trim()}\n\n---\n\n#${sectionTitle}:\n${displayContent.trim()}`;

      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          text: combinedText,
          recordMode: medicalRecord.record_mode || patient?.record_mode || 'ambulatorio',
          specialty: patient?.specialty,
          hasTranscriptions: false,
        }),
      });

      if (!res.ok) throw new Error('Falha ao integrar com o prontuário.');

      onDataChange();
      toast.success('Conduta inserida com sucesso no Prontuário!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao integrar com o prontuário.');
    } finally {
      setIsInserting(false);
    }
  }

  function scrollToSection(keyword: string) {
    if (!scrollAreaRef.current) return;
    const container = scrollAreaRef.current;
    const elements = container.querySelectorAll('h2');
    for (const el of Array.from(elements)) {
      const text = el.textContent?.toLowerCase() || '';
      if (text.includes(keyword)) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-primary');
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 1800);
        break;
      }
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Seletor de Modo Pedagógico e Ações de Disparo */}
      <Card
        className={`border-primary/20 ${
          isOutpatient ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-primary/5'
        }`}
      >
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles
                className={`w-5 h-5 ${
                  isOutpatient ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'
                }`}
              />
              <h3 className="font-semibold text-base">
                {isOutpatient
                  ? `Aula Clínica & Conduta • Ambulatório de ${specialtyName}`
                  : 'Segunda Opinião & Conduta Clínica Baseada em Evidências'}
              </h3>
              <Badge
                variant="outline"
                className={`text-[11px] ${
                  depth === 'grand_rounds'
                    ? 'border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10'
                    : 'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {depth === 'grand_rounds' ? '🎓 Grand Rounds' : '⚡ Fast Clinical'}
              </Badge>
            </div>

            {/* Alternador de Profundidade */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground font-medium">Formato:</span>
              <div className="inline-flex rounded-lg border bg-background/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setDepth('grand_rounds')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                    depth === 'grand_rounds'
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  Aula Aprofundada (Grand Rounds)
                </button>
                <button
                  type="button"
                  onClick={() => setDepth('quick')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                    depth === 'quick'
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Conduta Direta
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              {depth === 'grand_rounds'
                ? `Discussão acadêmica completa: síntese bayesiana, mergulho fisiopatológico, trials seminais (Classes I/II, Nível A/B), receita médica formatada, pérolas clínicas e armadilhas para ${specialtyName}.`
                : 'Conduta objetiva focada na lista de problemas, receita medicamentosa com dosagens e metas clínicas imediatas.'}
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => handleGenerate()}
            className={`w-full sm:w-auto shadow-md shrink-0 ${
              depth === 'grand_rounds'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : isOutpatient
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : ''
            }`}
            disabled={isLoading || !medicalRecord}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Raciocinando & Consultando Diretrizes...
              </>
            ) : evidenceNote ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {depth === 'grand_rounds' ? 'Atualizar Aula Clínica' : 'Atualizar Conduta'}
              </>
            ) : (
              <>
                <GraduationCap className="w-4 h-4 mr-2" />
                {depth === 'grand_rounds' ? 'Ministrar Aula Clínica' : 'Gerar Conduta'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Success Message */}
      {generated && !isLoading && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="flex items-center justify-between py-3.5 px-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                {depth === 'grand_rounds'
                  ? `Aula Clínica Completa de ${specialtyName} gerada e pronta para estudo e conduta!`
                  : 'Conduta clínica gerada com sucesso!'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={copyPrescriptionOnly}
                className="text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
              >
                {copiedRx ? <Check className="w-3.5 h-3.5 mr-1 text-green-600" /> : <Pill className="w-3.5 h-3.5 mr-1" />}
                Copiar Receita
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(displayContent || '')}
                className="text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                Copiar Tudo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exibição da Aula Clínica / Conduta */}
      {displayContent ? (
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-col gap-3 border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  {isLoading
                    ? 'Preceptor Sênior raciocinando e pesquisando ensaios clínicos...'
                    : depth === 'grand_rounds'
                    ? `Aula Clínica Prática (Grand Rounds) • ${specialtyName}`
                    : `Conduta Clínica • ${specialtyName}`}
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary ml-1" />}
                </CardTitle>
                {evidenceNote && !isLoading && (
                  <p className="text-xs text-muted-foreground">
                    Elaborado com IA clínica especialista em {formatDateTime(evidenceNote.created_at)}
                  </p>
                )}
              </div>

              {!isLoading && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyPrescriptionOnly}
                    className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    title="Copia apenas o bloco de receituário e prescrição"
                  >
                    {copiedRx ? <Check className="w-3.5 h-3.5 mr-1" /> : <Pill className="w-3.5 h-3.5 mr-1" />}
                    Copiar Receita
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInsertIntoRecord}
                    disabled={isInserting || !medicalRecord}
                    className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                    title="Anexa esta aula/conduta ao texto do prontuário para impressão no Modo Round"
                  >
                    {isInserting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <FilePlus2 className="w-3.5 h-3.5 mr-1" />
                    )}
                    Inserir no Prontuário
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="text-xs text-muted-foreground hover:text-foreground"
                    title="Imprimir ou salvar em PDF de estudo"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    Imprimir
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => copyToClipboard(displayContent)}
                    className="text-xs bg-primary text-primary-foreground"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 mr-1 text-green-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    Copiar Aula
                  </Button>
                </div>
              )}
            </div>

            {/* Sumário Navegável Rápido (Table of Contents Chips) */}
            {!isLoading && (
              <div className="pt-2 border-t flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
                  <Activity className="w-3 h-3 text-primary" />
                  Ir para:
                </span>
                {TOC_SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.keyword)}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-border/60 bg-muted/30 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all shrink-0 font-medium"
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-6">
            <ScrollArea className="h-[700px] pr-4">
              <div ref={scrollAreaRef} className="prose-medical prose-sm max-w-none text-foreground dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ node, ...props }) => {
                      const text = String(props.children);
                      let icon = null;
                      let badgeClass = 'text-primary border-primary/20 bg-primary/5';

                      if (text.toLowerCase().includes('fisiopatol')) {
                        badgeClass =
                          'text-indigo-600 dark:text-indigo-300 border-indigo-500/30 bg-indigo-500/10 font-bold';
                        icon = <Activity className="w-4 h-4 mr-1.5 text-indigo-500" />;
                      } else if (text.toLowerCase().includes('pérola') || text.toLowerCase().includes('perola')) {
                        badgeClass =
                          'text-amber-700 dark:text-amber-300 border-amber-500/40 bg-amber-500/15 font-bold shadow-sm';
                        icon = <Lightbulb className="w-4 h-4 mr-1.5 text-amber-500" />;
                      } else if (text.toLowerCase().includes('prescrição') || text.toLowerCase().includes('prescricao')) {
                        badgeClass =
                          'text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/15 font-bold shadow-sm';
                        icon = <Pill className="w-4 h-4 mr-1.5 text-emerald-500" />;
                      } else if (text.toLowerCase().includes('alarme') || text.toLowerCase().includes('red flag')) {
                        badgeClass =
                          'text-red-700 dark:text-red-300 border-red-500/40 bg-red-500/15 font-bold';
                        icon = <AlertTriangle className="w-4 h-4 mr-1.5 text-red-500" />;
                      } else if (text.toLowerCase().includes('diretrizes') || text.toLowerCase().includes('ensaios')) {
                        badgeClass =
                          'text-blue-700 dark:text-blue-300 border-blue-500/30 bg-blue-500/10';
                        icon = <BookOpen className="w-4 h-4 mr-1.5 text-blue-500" />;
                      } else if (text.toLowerCase().includes('representação') || text.toLowerCase().includes('problema')) {
                        badgeClass =
                          'text-purple-700 dark:text-purple-300 border-purple-500/30 bg-purple-500/10';
                        icon = <GraduationCap className="w-4 h-4 mr-1.5 text-purple-500" />;
                      }

                      return (
                        <div className="pt-6 pb-2 first:pt-0">
                          <h2
                            className={`text-sm md:text-base font-bold flex items-center p-2.5 rounded-lg border transition-all ${badgeClass}`}
                            {...props}
                          >
                            {icon}
                            <span>{props.children}</span>
                          </h2>
                        </div>
                      );
                    },
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-indigo-500 bg-indigo-500/5 p-3.5 my-3 rounded-r-lg text-xs leading-relaxed text-foreground not-italic shadow-xs"
                        {...props}
                      />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-4 border rounded-lg shadow-xs">
                        <table className="w-full text-xs text-left border-collapse" {...props} />
                      </div>
                    ),
                    th: ({ node, ...props }) => (
                      <th className="bg-muted p-2.5 font-bold border-b text-foreground" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="p-2.5 border-b border-border/30 text-foreground/90 font-mono text-[11px]" {...props} />
                    ),
                  }}
                >
                  {displayContent}
                </ReactMarkdown>
              </div>
            </ScrollArea>

            {/* Referências de Busca */}
            {evidenceNote?.search_references &&
              evidenceNote.search_references.length > 0 &&
              !isLoading && (
                <div className="mt-6 pt-4 border-t border-border/50">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
                    <Globe className="w-4 h-4 text-primary" />
                    Diretrizes e Ensaios Clínicos Consultados pela IA em Tempo Real
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {evidenceNote.search_references.map((ref, idx) => (
                      <a
                        key={idx}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary/90 hover:text-primary hover:underline truncate bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                        title={ref.title}
                      >
                        <BookOpen className="w-3.5 h-3.5 shrink-0 text-primary" />
                        <span className="truncate">{ref.title || ref.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      ) : (
        !isLoading && (
          <div className="text-center py-20 border border-dashed rounded-xl bg-card/40">
            <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h4 className="text-base font-semibold mb-1 text-foreground">
              {depth === 'grand_rounds'
                ? `Pronto para ministrar a Aula Clínica de ${specialtyName}`
                : 'Pronto para formular a Conduta Clínica'}
            </h4>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Clique no botão &quot;{depth === 'grand_rounds' ? 'Ministrar Aula Clínica' : 'Gerar Conduta'}&quot; acima
              para sintetizar a fisiopatologia, conduta e prescrição baseada em evidências.
            </p>
          </div>
        )
      )}
    </div>
  );
}
