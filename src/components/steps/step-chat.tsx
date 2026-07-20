'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
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
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { patientId },
    }),
    messages: dbMessages,
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
                    <div className="prose-medical whitespace-pre-wrap leading-relaxed">
                      {message.parts
                        .map((p) => (p.type === 'text' ? p.text : ''))
                        .join('')}
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
                    const { toolName, toolCallId, state, args } = toolInvocation;
                    if (toolName === 'proposeRecordEdit') {
                      const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
                      return (
                        <div key={toolCallId} className="flex justify-start ml-11 mb-4">
                          <Card className="w-full max-w-[90%] border-yellow-500/30 bg-yellow-500/5">
                            <CardContent className="p-4">
                              <h4 className="text-sm font-semibold text-yellow-600 mb-2 flex items-center gap-1.5">
                                <FileEdit className="w-4 h-4" /> Proposta de Edição: {parsedArgs.section}
                              </h4>
                              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                                {parsedArgs.reason}
                              </p>
                              <div className="bg-background/80 p-3 rounded-md border border-border/50 text-xs font-mono mb-4 max-h-48 overflow-y-auto whitespace-pre-wrap">
                                {parsedArgs.newContent}
                              </div>
                              
                              {state === 'result' ? (
                                <div className={`text-xs font-medium px-3 py-2 rounded-md ${
                                  (toolInvocation as any).result?.approved 
                                    ? 'bg-green-500/10 text-green-600' 
                                    : 'bg-red-500/10 text-red-600'
                                }`}>
                                  {(toolInvocation as any).result?.approved ? '✅ Edição Aprovada e Aplicada' : '❌ Edição Recusada'}
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                                    onClick={async () => {
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
                                      }
                                    }}
                                  >
                                    Aprovar e Aplicar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs bg-background"
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

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t border-border/50">
            <div className="flex flex-col flex-1 relative">
              {isRecording && (
                <div className="absolute -top-8 left-0 right-0 text-center text-xs text-red-500 font-medium animate-pulse flex items-center justify-center gap-1">
                  <Mic className="w-3 h-3" /> Gravando áudio (Solte o botão do microfone para enviar)
                </div>
              )}
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte ou peça para editar o prontuário..."
                rows={1}
                className="resize-none min-h-[44px] max-h-[120px]"
                disabled={isRecording}
              />
            </div>
            
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                type="button"
                size="icon"
                variant={isRecording ? "destructive" : "secondary"}
                onClick={isRecording ? stopRecording : startRecording}
                className="shrink-0"
              >
                {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim() || isRecording}
                className="shrink-0 gradient-primary text-white hover:opacity-90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
