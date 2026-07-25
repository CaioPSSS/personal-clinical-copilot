'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WeeklyReport } from '@/lib/types';
import { formatDate } from '@/lib/helpers';
import { toast } from 'sonner';
import {
  GraduationCap,
  Sparkles,
  Loader2,
  Calendar,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Hourglass,
} from 'lucide-react';

interface ReportsClientProps {
  initialReports: WeeklyReport[];
  accumulatedCount: number;
}

export function ReportsClient({
  initialReports,
  accumulatedCount,
}: ReportsClientProps) {
  const [reports, setReports] = useState<WeeklyReport[]>(initialReports);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(
    initialReports[0] || null
  );
  const [generating, setGenerating] = useState(false);
  const [currentCount, setCurrentCount] = useState(accumulatedCount);

  async function handleGenerateReport(force: boolean = false) {
    setGenerating(true);
    try {
      const res = await fetch(`/api/cron/weekly-report${force ? '?force=true' : ''}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.info(data.message || data.error || 'Não foi possível gerar a aula.');
      } else {
        toast.success('Nova Aula Clínica gerada com sucesso!');
        setReports([data.report, ...reports]);
        setSelectedReport(data.report);
        setCurrentCount(0);
      }
    } catch (err) {
      toast.error('Erro de conexão ao gerar a aula.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary" />
            Aulas & Relatórios Semanais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revisão didática aprofundada dos casos presenciais acumulados na semana.
          </p>
        </div>
        <Button
          onClick={() => handleGenerateReport(false)}
          disabled={generating}
          className="gradient-primary text-white hover:opacity-90 shrink-0"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Gerar Aula Agora
        </Button>
      </div>

      {/* Progress card for accumulated cases */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary text-white flex items-center justify-center font-bold">
              {currentCount}
            </div>
            <div>
              <p className="font-medium text-sm text-foreground flex items-center gap-2">
                Status de Acúmulo de Casos
                {currentCount >= 3 ? (
                  <Badge variant="default" className="bg-green-600 text-white text-[10px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Pronto para gerar
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    <Hourglass className="w-3 h-3 mr-1 text-muted-foreground" />
                    {3 - currentCount} caso(s) faltante(s)
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentCount >= 3
                  ? 'Você já acumula 3 ou mais casos/atualizações não relatados. Clique para criar uma nova aula.'
                  : `São necessários no mínimo 3 casos. Os casos da semana atual são acumulados automaticamente para a próxima semana.`}
              </p>
            </div>
          </div>
          {currentCount < 3 && currentCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs shrink-0"
              onClick={() => handleGenerateReport(true)}
              disabled={generating}
            >
              Forçar Geração ({currentCount} caso{currentCount > 1 ? 's' : ''})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Main Content Layout (Sidebar of reports + Full Report Reader) */}
      {reports.length === 0 ? (
        <Card className="border-dashed py-16 text-center">
          <CardContent className="space-y-3">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="font-semibold text-foreground">Nenhuma aula gerada ainda</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Assim que você cadastrar ou atualizar pelo menos 3 pacientes, a aula semanal será acumulada e gerada automaticamente com o DeepSeek.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* History Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Histórico de Aulas ({reports.length})
            </h3>
            <ScrollArea className="h-[600px] pr-2">
              <div className="space-y-2">
                {reports.map((report) => {
                  const isSelected = selectedReport?.id === report.id;
                  return (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'bg-card/60 hover:bg-card hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-sm line-clamp-1 text-foreground group-hover:text-primary transition-colors">
                            {report.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(report.created_at)}
                            </span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {report.case_count} casos
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isSelected ? 'text-primary translate-x-1' : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Report Content Reader */}
          <div className="lg:col-span-8">
            {selectedReport ? (
              <Card className="border-border shadow-sm">
                <CardHeader className="border-b py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {selectedReport.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>Gerado em {formatDate(selectedReport.created_at)}</span>
                        <span>•</span>
                        <span>{selectedReport.case_count} casos integrados</span>
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ScrollArea className="h-[550px] pr-4">
                    <div className="prose-medical text-sm dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedReport.content}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] border border-dashed rounded-xl text-muted-foreground">
                Selecione uma aula à esquerda para ler.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
