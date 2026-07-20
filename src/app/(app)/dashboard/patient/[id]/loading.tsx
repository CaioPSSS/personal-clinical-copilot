import { Skeleton } from '@/components/ui/skeleton';

export default function PatientLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="w-10 h-10 rounded-md" />
        <Skeleton className="w-14 h-14 rounded-full" />
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-12 w-full mb-6 rounded-lg" />
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}
