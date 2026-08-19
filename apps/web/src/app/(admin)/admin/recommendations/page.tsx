'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';

interface RuleSummary {
  antecedentNames: string[];
  consequentName: string;
  confidence: number;
  lift: number;
}
interface RecommendationStatus {
  lastRun: { computedAt: string; ordersAnalyzed: number; rulesGenerated: number } | null;
  rules: RuleSummary[];
}

export default function AdminRecommendationsPage() {
  const [status, setStatus] = useState<RecommendationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const load = async () => {
    try {
      setStatus(await apiGet<RecommendationStatus>('/api/v1/recommendations/status'));
    } catch {
      toast.error('Failed to load recommendation status');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const recompute = async () => {
    setRecomputing(true);
    try {
      await apiPost('/api/v1/recommendations/recompute');
      toast.success('Recommendations recomputed');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Recompute failed');
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-5xl">
      <h1 className="display text-3xl mb-1">Recommendations</h1>
      <p className="text-[color:var(--fg-muted)] mb-8">
        Association rules mined from completed orders — powers &quot;frequently bought together&quot;, cart suggestions, and the homepage recommendations.
      </p>

      <div className="card mb-8 flex items-center justify-between gap-6 flex-wrap">
        <div className="text-sm">
          {loading ? (
            <span className="text-[color:var(--fg-muted)]">Loading…</span>
          ) : status?.lastRun ? (
            <>
              <div className="font-medium">
                Last computed {new Date(status.lastRun.computedAt).toLocaleString()}
              </div>
              <div className="text-[color:var(--fg-muted)]">
                {status.lastRun.ordersAnalyzed} orders analyzed · {status.lastRun.rulesGenerated} rules generated
              </div>
            </>
          ) : (
            <span className="text-[color:var(--fg-muted)]">Never computed yet.</span>
          )}
        </div>
        <button onClick={recompute} disabled={recomputing} className="btn-primary">
          {recomputing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4" /> Recompute now</>}
        </button>
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" /></div>
        ) : !status || status.rules.length === 0 ? (
          <div className="py-16 text-center text-sm text-[color:var(--fg-muted)]">
            No rules yet — click &quot;Recompute now&quot; once there&apos;s completed order history.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-left text-xs text-[color:var(--fg-muted)]">
                <th className="px-5 py-3 font-medium">If bought</th>
                <th className="px-5 py-3 font-medium">Then recommend</th>
                <th className="px-5 py-3 font-medium">Confidence</th>
                <th className="px-5 py-3 font-medium">Lift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {status.rules.map((r, i) => (
                <tr key={i}>
                  <td className="px-5 py-2.5">{r.antecedentNames.join(' + ')}</td>
                  <td className="px-5 py-2.5 font-medium">{r.consequentName}</td>
                  <td className="px-5 py-2.5">{(r.confidence * 100).toFixed(0)}%</td>
                  <td className="px-5 py-2.5">{r.lift.toFixed(2)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
