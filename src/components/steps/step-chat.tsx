'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
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
} from 'lucide-react';
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
  const dbMessages = initialMessages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const [input, setInput] = useState('');

  const { messages, status, setMessages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { patientId },
    }),
    initialMessages: dbMessages,
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
                      {message.content}
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
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre o caso clínico..."
              rows={1}
              className="resize-none min-h-[44px] max-h-[120px]"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="shrink-0 gradient-primary text-white hover:opacity-90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
