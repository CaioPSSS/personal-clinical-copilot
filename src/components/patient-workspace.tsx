'use client';

import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StepUpload } from '@/components/steps/step-upload';
import { StepAutoNote } from '@/components/steps/step-auto-note';
import { StepEvidence } from '@/components/steps/step-evidence';
import { StepChat } from '@/components/steps/step-chat';
import { createClient } from '@/lib/supabase/client';
import {
  Patient,
  MedicalRecord,
  Transcription,
  EvidenceNote,
  ChatMessage,
  FileRecord,
} from '@/lib/types';
import { calculateAge, getInitials } from '@/lib/helpers';
import {
  Upload,
  FileText,
  FlaskConical,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface PatientWorkspaceProps {
  patient: Patient;
  initialRecord: MedicalRecord | null;
  initialTranscriptions: Transcription[];
  initialEvidenceNote: EvidenceNote | null;
  initialChatMessages: ChatMessage[];
  initialFiles: FileRecord[];
}

export function PatientWorkspace({
  patient,
  initialRecord,
  initialTranscriptions,
  initialEvidenceNote,
  initialChatMessages,
  initialFiles,
}: PatientWorkspaceProps) {
  const [medicalRecord, setMedicalRecord] = useState(initialRecord);
  const [transcriptions, setTranscriptions] = useState(initialTranscriptions);
  const [evidenceNote, setEvidenceNote] = useState(initialEvidenceNote);
  const [chatMessages, setChatMessages] = useState(initialChatMessages);
  const [files, setFiles] = useState(() => {
    const recordDate = initialRecord ? new Date(initialRecord.updated_at).getTime() : 0;
    return initialFiles.map(f => ({
      ...f,
      processed: new Date(f.created_at).getTime() < recordDate
    }));
  });

  const supabase = createClient();

  const refreshData = useCallback(async () => {
    const [recordRes, transcRes, evidenceRes, messagesRes, filesRes] =
      await Promise.all([
        supabase
          .from('medical_records')
          .select('*')
          .eq('patient_id', patient.id)
          .order('version', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('transcriptions')
          .select('*')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('evidence_notes')
          .select('*')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('chat_messages')
          .select('*')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('files')
          .select('*')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false }),
      ]);

    if (recordRes.data) setMedicalRecord(recordRes.data as MedicalRecord);
    if (transcRes.data) setTranscriptions(transcRes.data as Transcription[]);
    if (evidenceRes.data) setEvidenceNote(evidenceRes.data as EvidenceNote);
    if (messagesRes.data) setChatMessages(messagesRes.data as ChatMessage[]);
    if (filesRes.data) {
      const dbFiles = filesRes.data as FileRecord[];
      const recordDate = recordRes.data ? new Date((recordRes.data as MedicalRecord).updated_at).getTime() : 0;
      setFiles(dbFiles.map(f => ({
        ...f,
        processed: new Date(f.created_at).getTime() < recordDate
      })));
    }
  }, [patient.id, supabase]);

  const age = patient.date_of_birth
    ? calculateAge(patient.date_of_birth)
    : null;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Patient Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <Avatar className="w-14 h-14 border-2 border-primary/30">
          <AvatarFallback className="gradient-primary text-white font-bold text-lg">
            {getInitials(patient.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{patient.full_name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {age !== null && <span>{age} anos</span>}
            {patient.gender && (
              <Badge variant="secondary" className="text-[10px]">
                {patient.gender}
              </Badge>
            )}
            {patient.bed_number && <span>• Leito {patient.bed_number}</span>}
            {patient.room_number && <span>• Quarto {patient.room_number}</span>}
          </div>
        </div>
      </div>

      {/* 4-Step Tabs */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger value="upload" className="flex items-center gap-1.5 py-2.5 text-xs sm:text-sm">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="auto-note" className="flex items-center gap-1.5 py-2.5 text-xs sm:text-sm">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Prontuário</span>
          </TabsTrigger>
          <TabsTrigger value="evidence" className="flex items-center gap-1.5 py-2.5 text-xs sm:text-sm">
            <FlaskConical className="w-4 h-4" />
            <span className="hidden sm:inline">Conduta</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-1.5 py-2.5 text-xs sm:text-sm">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <StepUpload
            patientId={patient.id}
            transcriptions={transcriptions}
            files={files}
            onDataChange={refreshData}
          />
        </TabsContent>

        <TabsContent value="auto-note" keepMounted>
          <StepAutoNote
            patientId={patient.id}
            medicalRecord={medicalRecord}
            transcriptions={transcriptions}
            files={files}
            onDataChange={refreshData}
          />
        </TabsContent>

        <TabsContent value="evidence" keepMounted>
          <StepEvidence
            patientId={patient.id}
            medicalRecord={medicalRecord}
            evidenceNote={evidenceNote}
            onDataChange={refreshData}
          />
        </TabsContent>

        <TabsContent value="chat" keepMounted>
          <StepChat
            patientId={patient.id}
            medicalRecord={medicalRecord}
            evidenceNote={evidenceNote}
            initialMessages={chatMessages}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
