'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { routineService } from '@/services/routine.service';
import { Sun, Moon, ArrowRight, Loader2 } from 'lucide-react';

export default function RoutinesDashboardPage() {
  const router = useRouter();
  const [routines, setRoutines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoutines = async () => {
      try {
        const data = await routineService.getUserRoutines();
        setRoutines(data);
      } catch (error) {
        console.error('Failed to fetch routines', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoutines();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const morning = routines.find(r => r.routineType === 'morning');
  const evening = routines.find(r => r.routineType === 'evening');

  const RoutineCard = ({ routine, type, title, icon: Icon }: any) => {
    if (!routine) {
      return (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 flex flex-col items-center justify-center text-gray-500 bg-gray-50/50">
          <Icon className="h-8 w-8 mb-3 opacity-50" />
          <h3 className="text-lg font-medium mb-1">No {title}</h3>
          <p className="text-sm mb-4">You haven't added a {title.toLowerCase()} yet.</p>
          <button 
            className="text-teal-600 text-sm font-medium hover:underline"
            onClick={() => router.push('/onboarding/routine')}
          >
            Add Routine
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-serif">{title}</h3>
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {routine.steps.length} steps
          </span>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Last updated</span>
            <span className="text-gray-900">{new Date(routine.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => router.push(`/routines/${routine.id}/analysis`)}
            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Analyze Routine
            <ArrowRight className="h-4 w-4" />
          </button>
          
          <button 
            onClick={() => router.push(`/routines/${routine.id}`)}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-gray-900 mb-2">Your Routines</h1>
        <p className="text-gray-600">Manage and analyze your daily skincare routines.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <RoutineCard routine={morning} type="morning" title="Morning Routine" icon={Sun} />
        <RoutineCard routine={evening} type="evening" title="Evening Routine" icon={Moon} />
      </div>
    </div>
  );
}
