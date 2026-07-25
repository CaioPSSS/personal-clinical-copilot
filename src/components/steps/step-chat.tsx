'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
  Mic,
  Square,
  FileEdit,
  Globe,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { MedicalRecord, EvidenceNote, ChatMessage } from '@/lib/types';

interface StepChatProps {
  patientId: string;
  medicalRecord: MedicalRecord | null;
  evidenceNote: EvidenceNote | null;
  initialMessages: ChatMessage[];
}

export function StepChat({
  patientId,
  medicalRecord,
  evidenceNote,
  initialMessages,
}: StepChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Converter mensagens do DB para o formato do AI SDK
  const dbMessages: UIMessage[] = initialMessages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
    content: m.content,
  }));

  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const { messages, status, setMessages, sendMessage, addToolResult } = useChat({
    messages: dbMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { patientId },
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([audioBlob], 'chat-audio.webm', { type: 'audio/webm' });
        
        // Transcrever via API
        const formData = new FormData();
        formData.append('file', file);
        
        toast.info('Transcrevendo áudio...');
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
          const data = await res.json();
          if (res.ok && data.text) {
            setInput((prev) => (prev ? prev + ' ' + data.text : data.text));
          } else {
            toast.error('Erro na transcrição: ' + (data.error || 'Desconhecido'));
          }
        } catch (err) {
          toast.error('Erro de conexão na transcrição.');
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error('Não foi possível acessar o microfone.');
      console.error(err);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  const hasContext = medicalRecord || evidenceNote;

  return (
    <div className="animate-slide-up">
      <Card className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Chat Clínico
            </CardTitle>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                className="text-muted-foreground hover:text-destructive text-xs"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          {hasContext && (
            <p className="text-xs text-muted-foreground">
              ✓ Prontuário {medicalRecord ? 'e ' : ''}
              {evidenceNote ? 'conduta ' : ''}injetados no contexto da IA
            </p>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col overflow-hidden px-4 pb-4">
          {/* Messages */}
          <ScrollArea className="flex-1 pr-3" ref={scrollRef}>
            <div className="space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">
                    Faça perguntas sobre o caso do paciente.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A IA tem acesso ao prontuário completo e conduta gerada.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className={`prose-medical prose-sm leading-relaxed ${message.role === 'user' ? 'text-primary-foreground prose-invert' : 'dark:prose-invert'}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.parts
                          .map((p) => (p.type === 'text' ? p.text : ''))
                          .join('')}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-secondary text-xs">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {/* Renderização de Tool Invocations fora do fluxo normal se houver */}
              {messages.map((message) => 
                (message.parts || []).map((part) => {
                  if (part.type === 'tool-invocation') {
                    const toolInvocation = part as any;
                    const { toolName, toolCallId, state, args, result } = toolInvocation;
                    
                    if (toolName === 'searchMedicalInfo') {
                      const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
                      return (
                        <div key={toolCallId} className="flex justify-start ml-11 mb-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-full border border-border/50">
                            {state === 'result' ? (
                              <Globe className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <Search className="w-3.5 h-3.5 animate-pulse text-blue-500" />
                            )}
                            <span>
                              {state === 'result' ? 'A IA pesquisou no Perplexity por:' : 'Pesquisando na web por:'} <strong className="font-medium">"{parsedArgs.query}"</strong>
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (toolName === 'proposeRecordEdit') {
                      const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
                      return (
                        <div key={toolCallId} className="flex justify-start ml-11 mb-4">
                          <Card className="w-full max-w-[95%] border-blue-500/20 bg-blue-500/5 shadow-sm overflow-hidden">
                            <div className="bg-blue-500/10 px-4 py-2 border-b border-blue-500/20 flex items-center gap-2">
                              <FileEdit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                                Proposta de Atualização: {parsedArgs.section}
                              </h4>
                            </div>
                            <CardContent className="p-4">
                              <div className="mb-4">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                                  Justificativa da IA
                                </span>
                                <p className="text-sm text-foreground/80 leading-relaxed bg-background/50 p-2.5 rounded-md border border-border/50">
                                  {parsedArgs.reason}
                                </p>
                              </div>
                              
                              <div className="mb-4">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                                  Novo Conteúdo Proposto
                                </span>
                                <div className="bg-background p-3 rounded-md border border-border/50 text-sm font-mono text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">
                                  {parsedArgs.newContent}
                                </div>
                              </div>
                              
                              {state === 'result' ? (
                                <div className={`text-sm font-medium px-4 py-2.5 rounded-md flex items-center justify-center gap-2 ${
                                  (toolInvocation as any).result?.approved 
                                    ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                                    : 'bg-red-500/10 text-red-600 border border-red-500/20'
                                }`}>
                                  {(toolInvocation as any).result?.approved ? (
                                    <><CheckCircle2 className="w-4 h-4" /> Edição Aprovada e Aplicada</>
                                  ) : (
                                    <><Trash2 className="w-4 h-4" /> Edição Recusada</>
                                  )}
                                </div>
                              ) : (
                                <div className="flex gap-3">
                                  <Button
                                    size="sm"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                    onClick={async (e) => {
                                      const btn = e.currentTarget;
                                      btn.disabled = true;
                                      const originalText = btn.innerText;
                                      btn.innerHTML = '<span class="animate-pulse">Aplicando...</span>';
                                      toast.loading('Aplicando edição...', { id: 'edit-record' });
                                      try {
                                        const res = await fetch('/api/edit-record-section', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            patientId,
                                            section: parsedArgs.section,
                                            newContent: parsedArgs.newContent
                                          })
                                        });
                                        if (res.ok) {
                                          addToolResult({ toolCallId, result: { approved: true } } as any);
                                          toast.success('Prontuário atualizado!', { id: 'edit-record' });
                                        } else {
                                          throw new Error('Falha na API');
                                        }
                                      } catch (err) {
                                        toast.error('Erro ao atualizar o prontuário.', { id: 'edit-record' });
                                        btn.disabled = false;
                                        btn.innerText = originalText;
                                      }
                                    }}
                                  >
                                    Aprovar Atualização
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 bg-background hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors"
                                    onClick={() => addToolResult({ toolCallId, result: { approved: false } } as any)}
                                  >
                                    Recusar
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    }
                  }
                  return null;
                })
              )}

              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/50 rounded-xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chips de perguntas sugeridas rápidas */}
          <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto border-t bg-muted/20 no-scrollbar">
            {[
              '📍 Parede acometida / ECG',
              '💊 Medicações em uso',
              '🧪 Exames laboratoriais',
              '⚠️ Alergias do paciente',
              '📋 Resumir condutas',
            ].map((suggested) => (
              <Button
                key={suggested}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 shrink-0 rounded-full bg-card hover:bg-primary/10 hover:text-primary border-border/60 transition-colors"
                onClick={() => {
                  setInput(suggested);
                  sendMessage({ role: 'user', content: suggested } as any);
                }}
              >
                {suggested}
              </Button>
            ))}
          </div>

          {/* Footer com input */}
          <div className="p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 relative"
            >
              <div className="relative flex-1 group">
                <Textarea
                  placeholder="Ex: Como devo ajustar a dose do antibiótico?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[52px] w-full resize-none pr-12 rounded-xl border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/50 shadow-sm transition-all"
                  rows={1}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg transition-all ${
                    isRecording 
                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 animate-pulse' 
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                  }`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                >
                  {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-[52px] sm:w-14 rounded-xl shadow-sm transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
