'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AudioWaveform } from '../upload/audio-waveform';
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
  Pencil,
  X,
  Bookmark,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Transcription, FileRecord, SourceDocumentType } from '@/lib/types';
import { formatRelativeTime } from '@/lib/helpers';
import { createClient } from '@/lib/supabase/client';
import { compressAudioToMp3 } from '@/lib/audio-compressor';

const SOURCE_TYPE_OPTIONS: { value: SourceDocumentType; label: string }[] = [
  { value: 'auto', label: 'Detectar Automático' },
  { value: 'evolucao_anterior', label: '📋 Evolução de Ontem / Plantão Anterior' },
  { value: 'internamento_previo', label: '🗂️ Outro Internamento Antigo' },
  { value: 'laboratorio', label: '🧪 Exames / Gasometria' },
  { value: 'imagem_laudo', label: '🩻 Laudo de Imagem / ECG' },
  { value: 'prescricao', label: '💊 Prescrição / Controles' },
  { value: 'outro', label: '📎 Outro' },
];

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
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState<string | null>(null);
  const [compressing, setCompressing] = useState<string | null>(null);
  const [analyzingImageId, setAnalyzingImageId] = useState<string | null>(null);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const audioRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const uploadFile = useCallback(
    async (file: File, category: 'audio' | 'image') => {
      // 1. Obter a URL de upload assinada do backend (evita erros de RLS e limitações CORS)
      const urlRes = await fetch('/api/get-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          patientId,
        }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error || 'Falha ao autorizar upload.');

      const { token, storagePath } = urlData;

      // 2. Fazer o upload usando o token gerado diretamente para o Storage
      const { error: uploadError } = await supabase.storage
        .from('medical-files')
        .uploadToSignedUrl(storagePath, token, file);

      if (uploadError) throw new Error(`Falha no upload para o storage: ${uploadError.message}`);

      // 3. Salvar metadados no banco de dados chamando a API com payload JSON leve
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          category,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          storagePath,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao registrar arquivo no prontuário.');
      return data;
    },
    [patientId, supabase]
  );

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    setUploading(true);
    const filesArray = Array.from(fileList);
    
    try {
      for (const file of filesArray) {
        try {
          // Compactar áudio (com fallback para o arquivo original em caso de erro na decodificação)
          let fileToUpload = file;
          try {
            setCompressing(file.name);
            fileToUpload = await compressAudioToMp3(file);
          } catch (compressErr) {
            console.warn('Erro ao compactar áudio, enviando arquivo original:', compressErr);
            toast.info(`"${file.name}": Enviando sem compressão (formato alternativo).`);
          } finally {
            setCompressing(null);
          }

          // 1. Upload para Storage
          const uploadResult = await uploadFile(fileToUpload, 'audio');

          // 2. Transcrever via Groq passando apenas o storagePath (evita payload grande)
          setTranscribing(file.name);
          const transcribeRes = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storagePath: uploadResult.storagePath,
              fileName: file.name,
            }),
          });
          const transcribeData = await transcribeRes.json();

          if (!transcribeRes.ok) {
            throw new Error(transcribeData.error || 'Falha na transcrição.');
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

          if (!saveRes.ok) {
            throw new Error('Falha ao salvar a transcrição no prontuário.');
          }

          toast.success(`"${file.name}" transcrito com sucesso!`);
        } catch (err: any) {
          const errMsg = err?.message || 'Erro no processamento.';
          toast.error(`"${file.name}": ${errMsg}`);
          console.error(`Erro no arquivo ${file.name}:`, err);
          
          // Log para o console do Vercel
          await fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Erro no arquivo ${file.name}: ${errMsg}`,
              details: err?.stack || String(err),
              fileInfo: { name: file.name, size: file.size, type: file.type }
            })
          }).catch(console.error);
        }
      }
      onDataChange();
    } catch (outerErr: any) {
      toast.error('Erro inesperado no upload.');
      console.error(outerErr);
    } finally {
      setUploading(false);
      setTranscribing(null);
      if (audioRef.current) audioRef.current.value = '';
    }
  }

  async function handleSourceTypeChange(fileId: string, sourceType: SourceDocumentType) {
    try {
      const res = await fetch('/api/update-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, sourceType }),
      });
      if (res.ok) {
        toast.success('Classificação do documento atualizada!');
        onDataChange();
      } else {
        toast.error('Falha ao atualizar classificação.');
      }
    } catch {
      toast.error('Erro de conexão ao atualizar documento.');
    }
  }

  async function extractImageText(fileId: string, storagePath: string) {
    setAnalyzingImageId(fileId);
    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, storagePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na leitura da imagem.');
      toast.success('Conteúdo da imagem lido e extraído com sucesso!');
      onDataChange();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao analisar imagem.');
    } finally {
      setAnalyzingImageId(null);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        try {
          const uploadRes = await uploadFile(file, 'image');
          toast.success(`"${file.name}" enviado com sucesso!`);

          // Disparar leitura/transcrição da imagem em segundo plano
          if (uploadRes?.file?.id && uploadRes?.storagePath) {
            extractImageText(uploadRes.file.id, uploadRes.storagePath);
          }
        } catch (err: any) {
          const errMsg = err?.message || 'Erro no upload da imagem.';
          toast.error(`"${file.name}": ${errMsg}`);
          console.error(err);

          // Log para o console do Vercel
          await fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Erro na imagem ${file.name}: ${errMsg}`,
              details: err?.stack || String(err),
              fileInfo: { name: file.name, size: file.size, type: file.type }
            })
          }).catch(console.error);
        }
      }
      onDataChange();
    } catch (outerErr: any) {
      toast.error('Erro inesperado no upload.');
      console.error(outerErr);
    } finally {
      setUploading(false);
      if (imageRef.current) imageRef.current.value = '';
    }
  }

  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [markers, setMarkers] = useState<string[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setMarkers([]);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([audioBlob], `Gravacao_${new Date().getTime()}.webm`, { type: 'audio/webm' });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        handleAudioUpload({ target: { files: dataTransfer.files } } as any);
        
        stream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
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

  function addMarker() {
    const mins = Math.floor(recordingTime / 60).toString().padStart(2, '0');
    const secs = (recordingTime % 60).toString().padStart(2, '0');
    const markerText = `[Marcador em ${mins}:${secs}]`;
    setMarkers((prev) => [...prev, markerText]);
    toast.info(`Marcador adicionado em ${mins}:${secs}`);
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

  async function deleteFile(fileId: string, storagePath: string, processed: boolean) {
    const confirmMsg = processed
      ? 'Este arquivo já foi incorporado ao prontuário. Removê-lo fará com que ele suma dos anexos da consulta, mas não altera o prontuário atual. Deseja continuar?'
      : 'Deseja realmente remover este arquivo?';
    if (!confirm(confirmMsg)) return;
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

  async function deleteTranscription(transcriptionId: string, processed: boolean) {
    const confirmMsg = processed
      ? 'Esta anotação já foi incorporada ao prontuário. Removê-la fará com que ela suma das anotações da consulta, mas não altera o prontuário atual. Deseja continuar?'
      : 'Deseja realmente remover esta anotação?';
    if (!confirm(confirmMsg)) return;
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

  async function saveEdit(transcriptionId: string) {
    if (!editValue.trim()) return;
    try {
      const res = await fetch('/api/edit-transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptionId, newText: editValue }),
      });
      if (res.ok) {
        toast.success('Anotação atualizada!');
        setEditingId(null);
        onDataChange();
      } else {
        toast.error('Erro ao atualizar anotação.');
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
        {/* Gravar Áudio (Navegador com Waveform) */}
        <Card
          className={`border-dashed border-2 transition-colors group ${
            isRecording ? 'border-red-500/50 bg-red-500/5' : 'hover:border-primary/50 cursor-pointer'
          }`}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 text-center h-full relative space-y-3">
            {isRecording ? (
              <>
                <AudioWaveform stream={audioStream} isRecording={isRecording} />
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <p className="font-semibold text-red-600 text-sm">
                    Gravando ({Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')})
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs border-red-200 text-red-600 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      addMarker();
                    }}
                  >
                    <Bookmark className="w-3 h-3 mr-1" />
                    Marcador ({markers.length})
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    onClick={stopRecording}
                  >
                    <Square className="w-3 h-3 mr-1 fill-white" />
                    Parar e Enviar
                  </Button>
                </div>
              </>
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                onClick={startRecording}
              >
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Mic className="w-7 h-7 text-red-500" />
                </div>
                <p className="font-medium text-foreground">Gravar Áudio</p>
                <p className="text-xs text-muted-foreground mt-1">Com visualizador de frequência e marcadores</p>
              </div>
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
              accept="audio/*,image/*,.m4a"
              multiple
              onChange={(e) => {
                // Separar os arquivos em áudio e imagem e chamar as funções adequadas
                const files = e.target.files;
                if (!files) return;
                const audioFiles = Array.from(files)
                  .filter(f => f.type.startsWith('audio/') || f.name.toLowerCase().endsWith('.m4a') || f.type === 'video/mp4')
                  .map(f => {
                    // Normaliza tipo MIME de .m4a para audio/mp4 caso venha vazio ou incorreto
                    if (f.name.toLowerCase().endsWith('.m4a') && !f.type.startsWith('audio/')) {
                      return new File([f], f.name, { type: 'audio/mp4' });
                    }
                    return f;
                  });
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
              {files.map((f) => {
                const isImage = f.file_type.startsWith('image');
                const isAnalyzing = analyzingImageId === f.id;
                const isExpanded = expandedFileId === f.id;

                return (
                  <div key={f.id} className="flex flex-col p-3 rounded-lg border bg-card text-sm group gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {isImage ? (
                          <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <FileAudio className="w-4 h-4 text-primary shrink-0" />
                        )}
                        <span className="truncate font-medium">{f.file_name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isImage && (
                          <select
                            value={f.source_type || 'auto'}
                            onChange={(e) => handleSourceTypeChange(f.id, e.target.value as SourceDocumentType)}
                            className="h-7 text-xs rounded-md border border-input bg-background px-2 py-0 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {SOURCE_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}

                        <Badge variant={f.processed ? 'secondary' : 'default'} className="text-[10px]">
                          {f.processed ? 'Incluído' : 'Pendente'}
                        </Badge>

                        {isImage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-primary px-2"
                            onClick={() => {
                              if (!f.extracted_text && !isAnalyzing) {
                                extractImageText(f.id, f.storage_path);
                              } else {
                                setExpandedFileId(isExpanded ? null : f.id);
                              }
                            }}
                            disabled={isAnalyzing}
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin mr-1" /> Lendo...
                              </>
                            ) : f.extracted_text ? (
                              isExpanded ? 'Ocultar Leitura' : 'Ver Leitura da IA'
                            ) : (
                              'Ler Imagem'
                            )}
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteFile(f.id, f.storage_path, !!f.processed)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Pré-visualização e edição do texto extraído da imagem */}
                    {isExpanded && f.extracted_text && (
                      <div className="mt-2 p-3 bg-muted/40 rounded-md border border-border/60 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-semibold text-primary">Texto Extraído da Imagem pela IA:</span>
                          <span className="text-[11px]">Você pode conferir ou ajustar antes da geração</span>
                        </div>
                        <Textarea
                          defaultValue={f.extracted_text}
                          rows={4}
                          className="text-xs font-mono bg-background resize-y"
                          onBlur={async (e) => {
                            const newText = e.target.value;
                            if (newText !== f.extracted_text) {
                              await fetch('/api/update-file', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fileId: f.id, extractedText: newText }),
                              });
                              toast.success('Texto da imagem atualizado!');
                              onDataChange();
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {transcriptions.map((t) => (
                <div key={t.id} className="flex flex-col p-3 rounded-lg border bg-card text-sm group gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {t.audio_file_path?.includes('Texto Digitado') ? (
                        <Keyboard className="w-3 h-3" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      <span className="truncate">{t.audio_file_path}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(new Date(t.created_at))}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.processed ? 'secondary' : 'default'} className="text-[10px]">
                        {t.processed ? 'Incluído' : 'Pendente'}
                      </Badge>
                      {editingId !== t.id && (
                        <>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditingId(t.id); setEditValue(t.transcript_text); }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteTranscription(t.id, t.processed)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingId === t.id ? (
                    <div className="space-y-2 mt-1">
                      <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-xs min-h-[80px]" autoFocus />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}><X className="w-3 h-3 mr-1" /> Cancelar</Button>
                        <Button size="sm" onClick={() => saveEdit(t.id)}><Check className="w-3 h-3 mr-1" /> Salvar</Button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs">{t.transcript_text}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploading Overlay */}
      {(uploading || transcribing || compressing) && (
        <Card className="border-primary/30">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">
              {compressing
                ? `Compactando "${compressing}"...`
                : transcribing
                ? `Transcrevendo "${transcribing}"...`
                : 'Enviando arquivo...'}
            </span>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
