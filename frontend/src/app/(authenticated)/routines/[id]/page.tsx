'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { routineService } from '@/services/routine.service';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';

const CATEGORIES = [
  'cleanser',
  'toner',
  'essence',
  'serum',
  'treatment',
  'moisturizer',
  'sunscreen',
  'retinoid',
  'exfoliant',
  'face_oil',
  'other',
];

export default function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const [routine, setRoutine] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);

  // Add Step Dialog State
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('cleanser');
  const [useCatalog, setUseCatalog] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customName, setCustomName] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null);

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

  const fetchCatalog = async () => {
    try {
      const res = await api.get('/products');
      const items = res.data?.data?.items || res.data?.data || res.data || [];
      setCatalogProducts(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to load catalog products', err);
    }
  };

  useEffect(() => {
    fetchRoutine();
    fetchCatalog();
  }, [unwrappedParams.id]);

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (useCatalog && !selectedProductId) {
      alert('Please select a product from the catalog, or enter a custom name.');
      return;
    }
    if (!useCatalog && !customName.trim()) {
      alert('Please enter a product name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const stepOrder = (routine?.steps?.length || 0) + 1;
      await api.post(`/routines/${unwrappedParams.id}/steps`, {
        productId: useCatalog ? selectedProductId : null,
        customProductName: useCatalog ? null : customName.trim(),
        category: selectedCategory,
        stepOrder,
        frequency,
      });

      // Trigger automatic background analysis update
      try {
        await api.post(`/routines/${unwrappedParams.id}/analyze`);
      } catch {
        // Non-blocking
      }

      setAddStepOpen(false);
      setSelectedProductId('');
      setCustomName('');
      await fetchRoutine();
    } catch (err: any) {
      console.error('Failed to add routine step:', err);
      alert(err.response?.data?.error?.message || 'Failed to add step to routine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to remove this product from your routine?')) return;
    setDeletingStepId(stepId);
    try {
      await api.delete(`/routines/${unwrappedParams.id}/steps/${stepId}`);
      try {
        await api.post(`/routines/${unwrappedParams.id}/analyze`);
      } catch {
        // Non-blocking
      }
      await fetchRoutine();
    } catch (err) {
      console.error('Failed to delete step:', err);
      alert('Failed to remove step.');
    } finally {
      setDeletingStepId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-serif text-gray-900 mb-2">Routine not found</h2>
        <p className="text-gray-500 mb-4">This routine may have been deleted or belongs to another user.</p>
        <Link href="/routines" className="text-teal-600 font-medium hover:underline">
          Return to Routines
        </Link>
      </div>
    );
  }

  const filteredCatalog = catalogProducts.filter((p) => p.category === selectedCategory);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 pb-20">
      <Link href="/routines" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Routines
      </Link>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif text-gray-900 mb-1 capitalize">{routine.routineType} Routine</h1>
          <p className="text-gray-600 text-sm">
            {routine.steps.length} product{routine.steps.length === 1 ? '' : 's'} included • Last updated {new Date(routine.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setAddStepOpen(true)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4 text-teal-600" /> Add Product Step
          </button>
          <button
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center gap-2 transition-colors shadow-sm"
            onClick={() => router.push(`/routines/${routine.id}/analysis`)}
          >
            Analyze <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Routine Steps List */}
      <div className="space-y-4">
        {routine.steps.map((step: any, index: number) => (
          <div key={step.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 shadow-sm hover:border-gray-300 transition-colors">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="flex flex-col items-center justify-center h-10 w-10 rounded-full bg-teal-50 text-teal-700 font-semibold shrink-0 text-sm">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
                  {step.category}
                </div>
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {step.product ? step.product.name : step.customProductName}
                </h3>
                {step.product?.brand && (
                  <p className="text-sm text-gray-500">{step.product.brand.name}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 opacity-70" />
                    <span className="capitalize">{step.frequency.replace(/_/g, ' ').toLowerCase()}</span>
                  </div>
                  {step.daysUsed && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 opacity-70" />
                      <span>{step.daysUsed}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDeleteStep(step.id)}
              disabled={deletingStepId === step.id}
              className="text-gray-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors"
              title="Remove product"
            >
              {deletingStepId === step.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        ))}

        {routine.steps.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 p-6">
            <Sparkles className="h-10 w-10 text-teal-600 mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No products added yet</h3>
            <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
              Add your cleanser, moisturizer, or sunscreen to analyze compatibility and routine health.
            </p>
            <button
              onClick={() => setAddStepOpen(true)}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add First Product
            </button>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {addStepOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-xl font-serif text-gray-900 mb-4">Add Product to Routine</h3>

            <form onSubmit={handleAddStep} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Product Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedProductId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Mode Toggle */}
              <div className="flex border border-gray-200 rounded-lg p-1 bg-gray-50 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setUseCatalog(true)}
                  className={`flex-1 py-1.5 rounded-md transition-colors ${
                    useCatalog ? 'bg-white shadow text-teal-700' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Choose From Catalog
                </button>
                <button
                  type="button"
                  onClick={() => setUseCatalog(false)}
                  className={`flex-1 py-1.5 rounded-md transition-colors ${
                    !useCatalog ? 'bg-white shadow text-teal-700' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Custom Product Name
                </button>
              </div>

              {useCatalog ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Select Product
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Choose a verified product --</option>
                    {filteredCatalog.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {filteredCatalog.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No catalog products in this category yet. You can use &ldquo;Custom Product Name&rdquo; above.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Custom Product Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CeraVe Hydrating Cleanser"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Application Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="daily">Daily</option>
                  <option value="alternate_days">Alternate Days</option>
                  <option value="twice_weekly">Twice Weekly</option>
                  <option value="weekly">Weekly</option>
                  <option value="as_needed">As Needed</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddStepOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Adding...
                    </>
                  ) : (
                    'Add Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
