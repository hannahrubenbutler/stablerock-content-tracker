import { useMemo, useState } from 'react';
import { Request, useRequests, useUpdateRequest } from '@/hooks/useData';
import { STAGES, SERVICE_LINES, CONTENT_TYPES, Stage } from '@/lib/constants';
import { ServiceLineBadge, ContentTypeBadge, PriorityDot } from '@/components/Badges';
import { format, parseISO } from 'date-fns';

interface AllRequestsProps {
  onRequestClick: (req: Request) => void;
  initialStageFilter?: Stage | null;
}

export default function AllRequests({ onRequestClick, initialStageFilter }: AllRequestsProps) {
  const { data: requests = [] } = useRequests();
  const updateRequest = useUpdateRequest();

  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [contentFilter, setContentFilter] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>(initialStageFilter || '');
  const [personFilter, setPersonFilter] = useState<string>('');

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (serviceFilter && r.service_line !== serviceFilter) return false;
      if (contentFilter && r.content_type !== contentFilter) return false;
      if (stageFilter && r.stage !== stageFilter) return false;
      if (personFilter && r.owner !== personFilter && r.submitter_name !== personFilter) return false;
      return true;
    });
  }, [requests, serviceFilter, contentFilter, stageFilter, personFilter]);

  const people = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.owner) set.add(r.owner);
      if (r.submitter_name) set.add(r.submitter_name);
    });
    return Array.from(set).sort();
  }, [requests]);

  const handleStageChange = (id: string, newStage: string) => {
    updateRequest.mutate({ id, stage: newStage as any });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground"
        >
          <option value="">All Service Lines</option>
          {SERVICE_LINES.map((sl) => <option key={sl} value={sl}>{sl}</option>)}
        </select>
        <select
          value={contentFilter}
          onChange={(e) => setContentFilter(e.target.value)}
          className="text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground"
        >
          <option value="">All Content Types</option>
          {CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground"
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={personFilter}
          onChange={(e) => setPersonFilter(e.target.value)}
          className="text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground"
        >
          <option value="">All People</option>
          {people.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {(serviceFilter || contentFilter || stageFilter || personFilter) && (
          <button
            onClick={() => { setServiceFilter(''); setContentFilter(''); setStageFilter(''); setPersonFilter(''); }}
            className="text-xs font-body text-accent hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded overflow-x-auto">
        <table className="w-full text-xs font-body">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-3 py-2 text-left w-6"></th>
              <th className="px-3 py-2 text-left">Service Line</th>
              <th className="px-3 py-2 text-left">Content Type</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Target Date</th>
              <th className="px-3 py-2 text-left">Stage</th>
              <th className="px-3 py-2 text-left">Needed from Client</th>
              <th className="px-3 py-2 text-left">Owner</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No requests found.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onRequestClick(r)}
                  className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2"><PriorityDot priority={r.priority} /></td>
                  <td className="px-3 py-2"><ServiceLineBadge label={r.service_line} /></td>
                  <td className="px-3 py-2"><ContentTypeBadge label={r.content_type} /></td>
                  <td className="px-3 py-2 text-foreground font-medium max-w-[200px] truncate">{r.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.target_date ? format(parseISO(r.target_date), 'MMM d, yyyy') : '–'}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={r.stage}
                      onChange={(e) => handleStageChange(r.id, e.target.value)}
                      className="text-xs bg-muted border-0 rounded px-1.5 py-1 text-foreground"
                    >
                      {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground max-w-[150px] truncate">{r.what_needed_from_client || '–'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.owner || '–'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
