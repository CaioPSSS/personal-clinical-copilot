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
} from 'lucide-react';
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
  const audioRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

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

  const pendingTranscriptions = transcriptions.filter((t) => !t.processed);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Upload areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Áudio */}
        <Card
          className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={() => audioRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Mic className="w-7 h-7 text-primary" />
            </div>
            <p className="font-medium text-foreground">Upload de Áudio</p>
            <p className="text-xs text-muted-foreground mt-1">
              .m4a, .mp3, .wav, .ogg, .webm
            </p>
            <p className="text-xs text-muted-foreground">
              Transcrição automática via Whisper
            </p>
            <input
              ref={audioRef}
              type="file"
              className="hidden"
              accept="audio/*,.m4a"
              multiple
              onChange={handleAudioUpload}
            />
          </CardContent>
        </Card>

        {/* Imagem */}
        <Card
          className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={() => imageRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ImagePlus className="w-7 h-7 text-blue-400" />
            </div>
            <p className="font-medium text-foreground">Upload de Imagem</p>
            <p className="text-xs text-muted-foreground mt-1">
              Exames laboratoriais, ECG, radiografias
            </p>
            <p className="text-xs text-muted-foreground">
              .jpg, .png, .heic, .webp
            </p>
            <input
              ref={imageRef}
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
          </CardContent>
        </Card>
      </div>

      {/* Status */}
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
