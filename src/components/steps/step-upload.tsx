'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  ImagePlus,
  Loader2,
  FileAudio,
  FileImage,
  Check,
  Square,
  Keyboard,
  Send,
  Trash2,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Transcription, FileRecord } from '@/lib/types';
import { formatRelativeTime } from '@/lib/helpers';

interface StepUploadProps {
  patientId: string;
  transcriptions: Transcription[];
  files: FileRecord[];
  onDataChange: () => void;
}

export function StepUpload({
  patientId,
  transcriptions,
  files,
  onDataChange,
}: StepUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const audioRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const uploadFile = useCallback(
    async (file: File, category: 'audio' | 'image') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', patientId);
      formData.append('category', category);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    [patientId]
  );

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        // 1. Upload para Storage
        await uploadFile(file, 'audio');

        // 2. Transcrever via Groq
        setTranscribing(file.name);
        const transcribeForm = new FormData();
        transcribeForm.append('file', file);

        const transcribeRes = await fetch('/api/transcribe', {
          method: 'POST',
          body: transcribeForm,
        });
        const transcribeData = await transcribeRes.json();

        if (!transcribeRes.ok) {
          toast.error(`Erro ao transcrever ${file.name}: ${transcribeData.error}`);
          continue;
        }

        // 3. Salvar transcrição no banco (via API simples)
        const saveRes = await fetch('/api/save-transcription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            transcriptText: transcribeData.text,
            audioFilePath: file.name,
          }),
        });

        if (saveRes.ok) {
          toast.success(`"${file.name}" transcrito com sucesso!`);
        }
      }
      onDataChange();
    } catch (err) {
      toast.error('Erro no upload/transcrição.');
      console.error(err);
    } finally {
      setUploading(false);
      setTranscribing(null);
      if (audioRef.current) audioRef.current.value = '';
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        await uploadFile(file, 'image');
        toast.success(`"${file.name}" enviado com sucesso!`);
      }
      onDataChange();
    } catch (err) {
      toast.error('Erro no upload da imagem.');
      console.error(err);
    } finally {
      setUploading(false);
      if (imageRef.current) imageRef.current.value = '';
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
        const file = new File([audioBlob], `Gravacao_${new Date().getTime()}.webm`, { type: 'audio/webm' });
        
        // Simular evento de input para reaproveitar a lógica
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        handleAudioUpload({ target: { files: dataTransfer.files } } as any);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } catch (err) {
      toast.error('Não foi possível acessar o microfone.');
      console.error(err);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  async function handleManualTextSubmit() {
    if (!manualText.trim()) return;

    setUploading(true);
    try {
      const saveRes = await fetch('/api/save-transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          transcriptText: manualText.trim(),
          audioFilePath: 'Texto Digitado Manualmente',
        }),
      });

      if (saveRes.ok) {
        toast.success('Texto adicionado ao prontuário!');
        setManualText('');
        onDataChange();
      } else {
        toast.error('Erro ao salvar texto.');
      }
    } catch (err) {
      toast.error('Erro de conexão.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(fileId: string, storagePath: string) {
    if (!confirm('Deseja realmente remover este arquivo?')) return;
    try {
      const res = await fetch('/api/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, storagePath }),
      });
      if (res.ok) {
        toast.success('Arquivo removido com sucesso!');
        onDataChange();
      } else {
        toast.error('Erro ao remover arquivo.');
      }
    } catch (err) {
      toast.error('Erro de conexão.');
    }
  }

  async function deleteTranscription(transcriptionId: string) {
    if (!confirm('Deseja realmente remover esta anotação?')) return;
    try {
      const res = await fetch('/api/delete-transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptionId }),
      });
      if (res.ok) {
        toast.success('Anotação removida com sucesso!');
        onDataChange();
      } else {
        toast.error('Erro ao remover anotação.');
      }
    } catch (err) {
      toast.error('Erro de conexão.');
    }
  }

  const pendingTranscriptions = transcriptions.filter((t) => !t.processed);
  const processedTranscriptions = transcriptions.filter((t) => t.processed);
  const pendingFiles = files.filter((f) => !f.processed);
  const processedFiles = files.filter((f) => f.processed);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Upload areas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gravar Áudio (Navegador) */}
        <Card
          className={`border-dashed border-2 transition-colors cursor-pointer group ${
            isRecording ? 'border-red-500/50 bg-red-500/5' : 'hover:border-primary/50'
          }`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          <CardContent className="flex flex-col items-center justify-center py-10 text-center h-full relative">
            {isRecording ? (
              <>
                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4 animate-pulse">
                  <Square className="w-6 h-6 text-red-500 fill-red-500" />
                </div>
                <p className="font-medium text-red-600">Gravando... {recordingTime}s</p>
                <p className="text-xs text-red-500/70 mt-1">Clique para parar e enviar</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Mic className="w-7 h-7 text-red-500" />
                </div>
                <p className="font-medium text-foreground">Gravar Áudio</p>
                <p className="text-xs text-muted-foreground mt-1">Usar microfone agora</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Upload de Áudio */}
        <Card
          className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={() => audioRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-10 text-center h-full">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileAudio className="w-7 h-7 text-primary" />
            </div>
            <p className="font-medium text-foreground">Upload de Arquivo</p>
            <p className="text-xs text-muted-foreground mt-1">Áudios ou imagens de exames</p>
            <p className="text-[10px] text-muted-foreground mt-2 px-4">
              Arquivos de áudio serão transcritos. Imagens serão enviadas como anexo.
            </p>
            <input
              ref={audioRef}
              type="file"
              className="hidden"
              accept="audio/*,image/*"
              multiple
              onChange={(e) => {
                // Separar os arquivos em áudio e imagem e chamar as funções adequadas
                const files = e.target.files;
                if (!files) return;
                const audioFiles = Array.from(files).filter(f => f.type.startsWith('audio'));
                const imageFiles = Array.from(files).filter(f => f.type.startsWith('image'));
                
                if (audioFiles.length > 0) {
                  const dataTransfer = new DataTransfer();
                  audioFiles.forEach(f => dataTransfer.items.add(f));
                  handleAudioUpload({ target: { files: dataTransfer.files } } as any);
                }
                if (imageFiles.length > 0) {
                  const dataTransfer = new DataTransfer();
                  imageFiles.forEach(f => dataTransfer.items.add(f));
                  handleImageUpload({ target: { files: dataTransfer.files } } as any);
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Digitar Manualmente */}
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors flex flex-col">
          <CardContent className="flex flex-col flex-1 p-4 gap-2">
            <div className="flex items-center gap-2 mb-2 text-foreground">
              <Keyboard className="w-5 h-5 text-primary" />
              <span className="font-medium text-sm">Digitar Observação</span>
            </div>
            <Textarea
              placeholder="Digite anotações ou evoluções..."
              className="flex-1 resize-none text-xs min-h-[80px]"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
            <Button 
              size="sm" 
              className="w-full mt-auto" 
              disabled={!manualText.trim() || uploading}
              onClick={handleManualTextSubmit}
            >
              <Send className="w-3 h-3 mr-2" /> Adicionar Texto
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Anexos */}
      {(transcriptions.length > 0 || files.length > 0) && (
        <Card className="border-border">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Anexos e Anotações da Consulta</CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border bg-card text-sm group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {f.file_type.startsWith('image') ? (
                      <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <FileAudio className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <span className="truncate">{f.file_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={f.processed ? 'secondary' : 'default'} className="text-[10px]">
                      {f.processed ? 'Incluído' : 'Pendente'}
                    </Badge>
                    {!f.processed && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteFile(f.id, f.storage_path)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {transcriptions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-card text-sm group">
                  <div className="flex flex-col overflow-hidden max-w-[70%]">
                    <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                      {t.audio_file_path?.includes('Texto Digitado') ? (
                        <Keyboard className="w-3 h-3" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      <span className="truncate">{t.audio_file_path}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(new Date(t.created_at))}</span>
                    </div>
                    <span className="text-xs truncate">{t.transcript_text}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={t.processed ? 'secondary' : 'default'} className="text-[10px]">
                      {t.processed ? 'Incluído' : 'Pendente'}
                    </Badge>
                    {!t.processed && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteTranscription(t.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploading Overlay */}
      {(uploading || transcribing) && (
        <Card className="border-primary/30">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">
              {transcribing
                ? `Transcrevendo "${transcribing}"...`
                : 'Enviando arquivo...'}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Transcrições */}
      {transcriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-primary" />
              Transcrições
              {pendingTranscriptions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingTranscriptions.length} pendente{pendingTranscriptions.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transcriptions.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-lg bg-muted/50 text-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(t.created_at)}
                  </span>
                  <Badge variant={t.processed ? 'default' : 'secondary'} className="text-[10px]">
                    {t.processed ? (
                      <><Check className="w-3 h-3 mr-1" /> Processado</>
                    ) : (
                      'Pendente'
                    )}
                  </Badge>
                </div>
                <p className="text-foreground/90 leading-relaxed">
                  {t.transcript_text.length > 300
                    ? t.transcript_text.slice(0, 300) + '...'
                    : t.transcript_text}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Imagens enviadas */}
      {files.filter((f) => f.category === 'image').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileImage className="w-4 h-4 text-blue-400" />
              Imagens de Exames
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {files
                .filter((f) => f.category === 'image')
                .map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-lg bg-muted/50 text-center"
                  >
                    <FileImage className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs truncate">{f.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(f.created_at)}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
