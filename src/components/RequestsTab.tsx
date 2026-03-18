import { useMemo, useState } from 'react';
import { Request, useRequests } from '@/hooks/useData';
import { SERVICE_LINES, CONTENT_TYPES, getClientStatus } from '@/lib/constants';
import { ServiceLineBadge, ContentTypeBadge, PriorityDot } from '@/components/Badges';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface RequestsTabProps {
  onRequestClick: (req: Request) => void;
}

export default function RequestsTab({ onRequestClick }: RequestsTabProps) {
  const { isAdmin } = useAuth();
  const { data: requests = [] } = useRequests();

  const [serviceFilter, setServiceFilter] = useState('');
  const [contentFilter, setContentFilter] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'all' | 'published'>('active');

  const tabRequests = useMemo(() => {
    if (viewMode === 'all') return requests;
    if (viewMode === 'published') return requests.filter((r) => r.stage === 'Published');
    return requests.filter((r) => {
      const cs = getClientStatus(r.stage);
      return cs.tab === 'requests';
    });
  }, [requests, viewMode]);

  const filtered = useMemo(() => {
    return tabRequests.filter((r) => {
      if (serviceFilter && r.service_line !== serviceFilter) return false;
      if (contentFilter && r.content_type !== contentFilter) return false;
      return true;
    }).sort((a, b) => {
      // Primary sort: due date (soonest first), no-date items at bottom
      const aDate = a.target_date;
      const bDate = b.target_date;
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      if (aDate && bDate && aDate !== bDate) return aDate > bDate ? 1 : -1;
      // Tiebreaker: priority
      const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      const aPri = priorityOrder[a.priority] ?? 1;
      const bPri = priorityOrder[b.priority] ?? 1;
      if (aPri !== bPri) return aPri - bPri;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tabRequests, serviceFilter, contentFilter]);

  const inputClass = "text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {(['active', 'all', 'published'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`text-xs font-body px-3 py-1.5 rounded-full border transition-colors capitalize ${
              viewMode === mode ? 'bg-accent text-accent-foreground border-accent' : 'bg-card text-muted-foreground border-border hover:border-accent'
            }`}
          >
            {mode === 'active' ? 'Active' : mode === 'all' ? 'All' : 'Published'}
          </button>
        ))}
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className={inputClass}>
          <option value="">All Service Lines</option>
          {SERVICE_LINES.map((sl) => <option key={sl} value={sl}>{sl}</option>)}
        </select>
        <select value={contentFilter} onChange={(e) => setContentFilter(e.target.value)} className={inputClass}>
          <option value="">All Content Types</option>
          {CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
        </select>
        {(serviceFilter || contentFilter) && (
          <button onClick={() => { setServiceFilter(''); setContentFilter(''); }} className="text-xs font-body text-accent hover:underline">
            Clear
          </button>
        )}
        <span className="ml-auto text-xs font-body text-muted-foreground">
          {filtered.length} request{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg mb-1">🎉</p>
          <p className="text-sm font-body text-muted-foreground">No pending requests. Submit one when you're ready!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const cs = getClientStatus(r.stage);
            const req = r as any;
            const daysSinceCreated = differenceInDays(new Date(), parseISO(r.created_at));
            const isAging = daysSinceCreated >= 7 && r.stage === 'Requested';
            return (
              <button
                key={r.id}
                onClick={() => onRequestClick(r)}
                className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-accent transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <PriorityDot priority={r.priority} />
                      <span className="text-sm font-body font-semibold text-foreground truncate">{r.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <ServiceLineBadge label={r.service_line} />
                      <ContentTypeBadge label={r.content_type} />
                      <span className="text-[11px] font-body text-muted-foreground">
                        Submitted {format(parseISO(r.created_at), 'MMM d')}
                        {isAging && (
                          <span className="ml-1 text-[10px] font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                            {daysSinceCreated}+ days
                          </span>
                        )}
                      </span>
                      {r.target_date && (
                        <span className="text-[11px] font-body text-muted-foreground">
                          | Due {format(parseISO(r.target_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {req.contact_person && (
                        <span className="text-[11px] font-body text-muted-foreground">
                          · {req.contact_person}
                        </span>
                      )}
                    </div>
                    {r.what_needed_from_client && (
                      <div className="mt-2 text-xs font-body text-destructive bg-destructive/10 border border-destructive/20 rounded px-2.5 py-1.5">
                        ⚠ Archway needs: {r.what_needed_from_client}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span
                      className="text-[11px] font-body font-semibold px-2.5 py-1 rounded-full text-white"
                      style={{ backgroundColor: cs.color }}
                    >
                      {cs.label}
                    </span>
                    {isAdmin && (
                      <>
                        <span className="text-[10px] font-body text-muted-foreground">{r.stage}</span>
                        {req.owner && (
                          <span className="text-[10px] font-body text-muted-foreground">{req.owner}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
