'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { routineService } from '@/services/routine.service';
import { Loader2, ArrowLeft, ArrowRight, Edit, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const [routine, setRoutine] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoutine = async () => {
      try {
        const data = await routineService.getRoutineById(unwrappedParams.id);
        setRoutine(data);
      } catch (error) {
        console.error('Failed to fetch routine', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoutine();
  }, [unwrappedParams.id]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!routine) {
    return <div className="text-center py-12">Routine not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <Link href="/routines" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Routines
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-gray-900 mb-2 capitalize">{routine.routineType} Routine</h1>
          <p className="text-gray-600">
            {routine.steps.length} steps • Last updated {new Date(routine.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            onClick={() => router.push('/onboarding/routine')}
          >
            <Edit className="h-4 w-4" /> Edit Routine
          </button>
          <button 
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center gap-2"
            onClick={() => router.push(`/routines/${routine.id}/analysis`)}
          >
            Analyze <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {routine.steps.map((step: any, index: number) => (
          <div key={step.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            <div className="flex flex-col items-center justify-center h-10 w-10 rounded-full bg-gray-100 text-gray-500 font-medium shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
                    {step.category}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {step.product ? step.product.name : step.customProductName}
                  </h3>
                  {step.product?.brand && (
                    <p className="text-sm text-gray-500">{step.product.brand.name}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 opacity-70" />
                  <span className="capitalize">{step.frequency.replace(/_/g, ' ').toLowerCase()}</span>
                </div>
                {step.daysUsed && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 opacity-70" />
                    <span>{step.daysUsed}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {routine.steps.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-500">No products added to this routine yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
