'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { routineService } from '@/services/routine.service';
import { Sun, Moon, ArrowRight, Loader2, Sparkles, Plus } from 'lucide-react';
import api from '@/services/api';

interface RoutineCardProps {
  routine: any;
  type: 'morning' | 'evening';
  title: string;
  icon: any;
  onAdd: () => void;
  onAnalyze: (id: string) => void;
  onView: (id: string) => void;
  isCreating?: boolean;
}

function RoutineCard({ routine, type, title, icon: Icon, onAdd, onAnalyze, onView, isCreating }: RoutineCardProps) {
  if (!routine) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
        <div className="p-3 bg-gray-100 rounded-full text-gray-400 mb-3">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">{title} Not Configured</h3>
        <p className="text-xs text-gray-500 mb-5 max-w-xs">
          {type === 'morning'
            ? 'Add daytime essentials like cleanser, antioxidants, and daily SPF protection.'
            : 'Add nighttime essentials like double cleansing, treatments, and barrier moisturizers.'}
        </p>
        <button
          className="inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:border-teal-500 hover:text-teal-600 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all disabled:opacity-50"
          onClick={onAdd}
          disabled={isCreating}
        >
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin text-teal-600" /> : <Plus className="h-4 w-4 text-teal-600" />}
          Configure {title}
        </button>
      </div>
    );
  }

  const stepCount = routine.steps?.length || 0;

  return (
    <div className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500 capitalize">{routine.name || `${type} routine`}</p>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${stepCount > 0 ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
            {stepCount} product{stepCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-2 mb-6 text-xs text-gray-500">
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span>Last updated</span>
            <span className="font-medium text-gray-700">{new Date(routine.updatedAt).toLocaleDateString()}</span>
          </div>
          {stepCount === 0 && (
            <p className="text-amber-600 pt-1">
              No products added yet. Add products to analyze compatibility.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          onClick={() => onView(routine.id)}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          {stepCount === 0 ? 'Add Products' : 'View Products & Edit'}
        </button>

        <button
          onClick={() => onAnalyze(routine.id)}
          className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          Analyze Routine
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function RoutinesDashboardPage() {
  const router = useRouter();
  const [routines, setRoutines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creatingType, setCreatingType] = useState<string | null>(null);

  const fetchRoutines = async () => {
    try {
      const data = await routineService.getUserRoutines();
      setRoutines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch routines', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const handleCreateRoutine = async (type: 'morning' | 'evening') => {
    setCreatingType(type);
    try {
      const res = await api.post('/routines', {
        name: type === 'morning' ? 'Morning Routine' : 'Evening Routine',
        routineType: type,
        steps: [],
      });
      const newRoutine = res.data?.data;
      if (newRoutine?.id) {
        router.push(`/routines/${newRoutine.id}`);
      } else {
        await fetchRoutines();
      }
    } catch (err: any) {
      console.error('Failed to create routine', err);
      alert('Could not create routine. Please try again.');
    } finally {
      setCreatingType(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const morning = routines.find((r) => r.routineType === 'morning');
  const evening = routines.find((r) => r.routineType === 'evening');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-gray-900 mb-2">Your Routines</h1>
        <p className="text-gray-600 text-sm">
          Deterministic chemistry analysis, active compatibility, and routine structure.
        </p>
      </div>

      {routines.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center mb-8">
          <Sparkles className="h-10 w-10 text-teal-600 mx-auto mb-3 opacity-60" />
          <h2 className="text-xl font-serif text-gray-900 mb-2">No Routines Configured Yet</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
            Build your morning or evening routine to discover ingredient interactions, verify sun protection, and optimize your skincare health.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => handleCreateRoutine('morning')}
              disabled={creatingType === 'morning'}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5"
            >
              {creatingType === 'morning' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Morning Routine
            </button>
            <button
              onClick={() => handleCreateRoutine('evening')}
              disabled={creatingType === 'evening'}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5"
            >
              {creatingType === 'evening' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Evening Routine
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <RoutineCard
          routine={morning}
          type="morning"
          title="Morning Routine"
          icon={Sun}
          onAdd={() => handleCreateRoutine('morning')}
          onAnalyze={(id) => router.push(`/routines/${id}/analysis`)}
          onView={(id) => router.push(`/routines/${id}`)}
          isCreating={creatingType === 'morning'}
        />
        <RoutineCard
          routine={evening}
          type="evening"
          title="Evening Routine"
          icon={Moon}
          onAdd={() => handleCreateRoutine('evening')}
          onAnalyze={(id) => router.push(`/routines/${id}/analysis`)}
          onView={(id) => router.push(`/routines/${id}`)}
          isCreating={creatingType === 'evening'}
        />
      </div>
    </div>
  );
}
