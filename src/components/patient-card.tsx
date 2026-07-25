'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, BedDouble, Calendar, Building2, Pencil } from 'lucide-react';
import { Patient } from '@/lib/types';
import { calculateAge, formatRelativeTime, getInitials } from '@/lib/helpers';
import { EditPatientDialog } from './edit-patient-dialog';

interface PatientCardProps {
  patient: Patient;
  onDelete: (id: string) => void;
  existingInstitutions?: string[];
}

export function PatientCard({ patient, onDelete, existingInstitutions = [] }: PatientCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  const age = patient.date_of_birth
    ? calculateAge(patient.date_of_birth)
    : null;

  return (
    <>
      <Link href={`/dashboard/patient/${patient.id}`}>
        <Card className="group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 bg-card/60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                  <AvatarFallback className="gradient-primary text-white font-semibold text-sm">
                    {getInitials(patient.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {patient.full_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {age !== null && (
                      <span className="text-xs text-muted-foreground">
                        {age} anos
                      </span>
                    )}
                    {patient.gender && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {patient.gender}
                      </Badge>
                    )}
                    {patient.institution && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                        <Building2 className="w-2.5 h-2.5 mr-1" />
                        {patient.institution}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2 text-primary" />
                    Editar Dados
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(patient.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Extra info */}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              {patient.bed_number && (
                <span className="flex items-center gap-1">
                  <BedDouble className="w-3 h-3" />
                  Leito {patient.bed_number}
                </span>
              )}
              {patient.room_number && (
                <span>Quarto {patient.room_number}</span>
              )}
              <span className="flex items-center gap-1 ml-auto">
                <Calendar className="w-3 h-3" />
                {formatRelativeTime(patient.updated_at)}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>

      <EditPatientDialog
        patient={patient}
        open={editOpen}
        onOpenChange={setEditOpen}
        existingInstitutions={existingInstitutions}
        onUpdated={() => router.refresh()}
      />
    </>
  );
}
