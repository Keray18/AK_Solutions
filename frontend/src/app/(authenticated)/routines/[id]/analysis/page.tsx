'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { routineService } from '@/services/routine.service';
import { Loader2, ArrowLeft, ShieldAlert, ShieldCheck, Info, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function RoutineAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isStale, setIsStale] = useState(false);

  const fetchAnalysis = async (forceRun = false) => {
    setIsLoading(true);
    setError('');
    try {
      let data;
      if (forceRun) {
        data = await routineService.analyzeRoutine(unwrappedParams.id);
      } else {
        data = await routineService.getAnalysis(unwrappedParams.id);
        if (data.analysisUnavailable) {
          data = await routineService.analyzeRoutine(unwrappedParams.id);
        }
      }
      setAnalysis(data);
      if (data.isStale) {
        setIsStale(true);
      } else {
        setIsStale(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'We couldn\'t analyze this routine right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        let data = await routineService.getAnalysis(unwrappedParams.id);
        if (data?.analysisUnavailable) {
          data = await routineService.analyzeRoutine(unwrappedParams.id);
        }
        if (!ignore) {
          setAnalysis(data);
          setIsStale(Boolean(data?.isStale));
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err.response?.data?.error?.message || 'We could not analyze this routine right now. Please try again.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [unwrappedParams.id]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <p className="text-gray-500 animate-pulse">Running deterministic analysis engine...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-serif text-gray-900 mb-2">Analysis Failed</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button onClick={() => router.back()} className="text-teal-600 font-medium hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const { overallScore, label, confidence, confidenceReasons, breakdown, issues, strengths } = analysis;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-teal-600';
    if (score >= 70) return 'text-lime-600';
    if (score >= 50) return 'text-amber-500';
    return 'text-rose-500';
  };

  const IssueCard = ({ issue }: { issue: any }) => (
    <div className={`p-5 rounded-xl border ${
      issue.severity === 'high' ? 'border-rose-200 bg-rose-50/50' : 
      issue.severity === 'medium' ? 'border-amber-200 bg-amber-50/50' :
      issue.severity === 'info' ? 'border-blue-200 bg-blue-50/50' :
      'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex gap-3">
        <div className="mt-1">
          {issue.severity === 'high' || issue.severity === 'medium' ? (
            <AlertTriangle className={`h-5 w-5 ${issue.severity === 'high' ? 'text-rose-500' : 'text-amber-500'}`} />
          ) : (
            <Info className={`h-5 w-5 ${issue.severity === 'info' ? 'text-blue-500' : 'text-gray-500'}`} />
          )}
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-1">{issue.title}</h4>
          <p className="text-sm text-gray-600 mb-3">{issue.description}</p>
          
          <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Products Involved:</div>
          <ul className="list-disc pl-5 text-sm text-gray-700 mb-3 space-y-1">
            {issue.productsInvolved.map((p: string, idx: number) => (
              <li key={idx}>{p}</li>
            ))}
          </ul>
          
          {issue.recommendation && (
            <div className="mt-3 bg-white/60 p-3 rounded-lg text-sm text-gray-800">
              <span className="font-medium">Recommendation:</span> {issue.recommendation}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 pb-24">
      <Link href="/routines" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Routines
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-serif text-gray-900 mb-2">Routine Analysis</h1>
        <p className="text-gray-600">A detailed breakdown of your skincare routine&apos;s structure and compatibility.</p>
        
        {isStale && (
          <div className="mt-6 bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm flex flex-col items-center">
            <AlertTriangle className="h-5 w-5 text-amber-500 mb-2" />
            <p className="font-medium mb-1">Your routine has changed since this analysis.</p>
            <p className="text-amber-700/80 mb-4">Please run a new analysis to see updated results.</p>
            <button 
              onClick={() => fetchAnalysis(true)} 
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Re-analyze Routine
            </button>
          </div>
        )}
      </div>

      {/* Score Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8 shadow-sm text-center">
        <div className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-4">Routine Health Score</div>
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className={`text-6xl font-light font-serif ${getScoreColor(overallScore)}`}>
            {overallScore}<span className="text-3xl text-gray-300">/100</span>
          </div>
        </div>
        <div className="text-xl font-medium text-gray-800 mb-6">{label}</div>
        
        <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100 text-sm">
          <span className="text-gray-500">Analysis Confidence:</span>
          <span className={`font-medium ${
            confidence === 'High' ? 'text-teal-600' : 
            confidence === 'Moderate' ? 'text-amber-600' : 'text-rose-500'
          }`}>
            {confidence}
          </span>
        </div>
        
        {confidence !== 'High' && confidenceReasons.length > 0 && (
          <p className="text-xs text-gray-500 mt-3 max-w-md mx-auto">{confidenceReasons.join(' ')}</p>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column: Breakdown */}
        <div className="md:col-span-1 space-y-6">
          <h3 className="text-lg font-serif text-gray-900">Score Breakdown</h3>
          
          {Object.entries(breakdown).map(([key, category]: [string, any]) => (
            <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-sm font-medium">
                  {category.score} <span className="text-gray-400">/ {category.max}</span>
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                <div 
                  className="bg-teal-500 h-1.5 rounded-full" 
                  style={{ width: `${(category.score / category.max) * 100}%` }}
                ></div>
              </div>
              <div className="space-y-1">
                {category.reasons.map((reason: string, idx: number) => (
                  <p key={idx} className="text-xs text-gray-600 leading-relaxed">{reason}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Details */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Strengths */}
          {strengths && strengths.length > 0 && (
            <section>
              <h3 className="text-lg font-serif text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
                What&apos;s Working
              </h3>
              <div className="bg-teal-50/50 rounded-xl border border-teal-100 p-5">
                <ul className="space-y-3">
                  {strengths.map((str: string, idx: number) => (
                    <li key={idx} className="flex gap-3 text-sm text-gray-800">
                      <span className="text-teal-600 font-bold">✓</span>
                      {str}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Issues */}
          {issues && issues.length > 0 && (
            <section>
              <h3 className="text-lg font-serif text-gray-900 mb-4">Needs Attention</h3>
              <div className="space-y-4">
                {issues
                  .sort((a: any, b: any) => {
                    const sevScore = { high: 3, medium: 2, low: 1, info: 0 };
                    return sevScore[b.severity as keyof typeof sevScore] - sevScore[a.severity as keyof typeof sevScore];
                  })
                  .map((issue: any) => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
