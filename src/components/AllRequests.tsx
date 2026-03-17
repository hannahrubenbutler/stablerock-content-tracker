import { useMemo, useState, useEffect } from 'react';
import { Request, useRequests, useUpdateRequest, useRequestMetaCounts, useAssets } from '@/hooks/useData';
import { STAGES, SERVICE_LINES, CONTENT_TYPES, Stage, STAGE_COLORS, OWNER_OPTIONS } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { ServiceLineBadge, ContentTypeBadge, PriorityDot } from '@/components/Badges';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AllRequestsProps {
  onRequestClick: (req: Request) => void;
  initialStageFilter?: Stage | null;
}

export default function AllRequests({ onRequestClick, initialStageFilter }: AllRequestsProps) {
  const { isAdmin } = useAuth();
  const { data: requests = [] } = useRequests();
  const updateRequest = useUpdateRequest();
  const { data: metaCounts } = useRequestMetaCounts();
  const { data: assets = [] } = useAssets();

  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [contentFilter, setContentFilter] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>(initialStageFilter || '');
  const [personFilter, setPersonFilter] = useState<string>('');

  useEffect(() => {
    if (initialStageFilter) setStageFilter(initialStageFilter);
  }, [initialStageFilter]);

  // Build a set of request IDs that have waiting/blocking assets
  const requestsWithPendingAssets = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => {
      if (a.request_id && (a.status === 'Waiting' || a.status === 'Blocking')) {
        set.add(a.request_id);
      }
    });
    return set;
  }, [assets]);

  const filtered = useMemo(() => {
    const result = requests.filter((r) => {
      if (serviceFilter && r.service_line !== serviceFilter) return false;
      if (contentFilter && r.content_type !== contentFilter) return false;
      if (stageFilter && r.stage !== stageFilter) return false;
      if (personFilter && r.owner !== personFilter && r.submitter_name !== personFilter && (r as any).contact_person !== personFilter) return false;
      return true;
    });
    return result.sort((a, b) => {
      const aReq = a as any;
      const bReq = b as any;
      const aFlex = aReq.date_mode === 'flexible' || !a.target_date;
      const bFlex = bReq.date_mode === 'flexible' || !b.target_date;
      if (aFlex && !bFlex) return 1;
      if (!aFlex && bFlex) return -1;
      if (aFlex && bFlex) return 0;
      return a.target_date! > b.target_date! ? 1 : -1;
    });
  }, [requests, serviceFilter, contentFilter, stageFilter, personFilter]);

  const people = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.owner) set.add(r.owner);
      if (r.submitter_name) set.add(r.submitter_name);
      if ((r as any).contact_person) set.add((r as any).contact_person);
    });
    return Array.from(set).sort();
  }, [requests]);

  const handleStageChange = (id: string, newStage: string) => {
    updateRequest.mutate({ id, stage: newStage as any });
  };

  const formatDateCell = (r: any) => {
    const req = r as any;
    if (req.date_mode === 'flexible') {
      if (r.target_date) {
        return <span className="text-muted-foreground">{format(parseISO(r.target_date), 'MMM d, yyyy')}</span>;
      }
      return <span className="text-muted-foreground/60 italic">Flexible</span>;
    }
    if (req.date_mode === 'range' && r.target_date) {
      return (
        <span className="text-muted-foreground">
          {format(parseISO(r.target_date), 'MMM d')}
          {req.date_range_end && (
            <span className="ml-1 text-[10px] bg-muted px-1.5 py-0.5 rounded">
              – {format(parseISO(req.date_range_end), 'MMM d')}
            </span>
          )}
        </span>
      );
    }
    return <span className="text-muted-foreground">{r.target_date ? format(parseISO(r.target_date), 'MMM d, yyyy') : '–'}</span>;
  };

  const isAging = (r: Request) => {
    if (r.stage !== 'Requested') return false;
    const days = differenceInDays(new Date(), parseISO(r.created_at));
    return days >= 7;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filters + Count */}
        <div className="flex flex-wrap gap-2 items-center">
          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground">
            <option value="">All Service Lines</option>
            {SERVICE_LINES.map((sl) => <option key={sl} value={sl}>{sl}</option>)}
          </select>
          <select value={contentFilter} onChange={(e) => setContentFilter(e.target.value)} className="text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground">
            <option value="">All Content Types</option>
            {CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
          </select>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground">
            <option value="">All Stages</option>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} className="text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground">
            <option value="">All People</option>
            {people.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {(serviceFilter || contentFilter || stageFilter || personFilter) && (
            <button onClick={() => { setServiceFilter(''); setContentFilter(''); setStageFilter(''); setPersonFilter(''); }} className="text-xs font-body text-accent hover:underline">
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs font-body text-muted-foreground">
            Showing {filtered.length} of {requests.length} requests
          </span>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded overflow-x-auto">
          <table className="w-full text-xs font-body">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 py-2 text-left w-6"></th>
                <th className="px-3 py-2 text-left">Submitted</th>
                <th className="px-3 py-2 text-left">Service Line</th>
                <th className="px-3 py-2 text-left">Content Type</th>
                <th className="px-3 py-2 text-left min-w-[250px]">Title</th>
                <th className="px-3 py-2 text-left">Due Date</th>
                <th className="px-3 py-2 text-left">Stage</th>
                <th className="px-3 py-2 text-left">Needed from Client</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-left">Owner</th>
                <th className="px-3 py-2 text-center w-16">📎 💬</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                  No requests match your filters.
                  {(serviceFilter || contentFilter || stageFilter || personFilter) && (
                    <button onClick={() => { setServiceFilter(''); setContentFilter(''); setStageFilter(''); setPersonFilter(''); }} className="ml-2 text-accent hover:underline">Clear filters</button>
                  )}
                </td></tr>
              ) : (
                filtered.map((r) => {
                  const req = r as any;
                  const cc = metaCounts?.commentCounts[r.id] || 0;
                  const fc = metaCounts?.fileCounts[r.id] || 0;
                  const aging = isAging(r);
                  const hasPendingAsset = requestsWithPendingAssets.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => onRequestClick(r)}
                      className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <PriorityDot priority={r.priority} />
                          {aging && (
                            <span className="inline-block w-2 h-2 rounded-full bg-accent" title="Aging: 7+ days in Requested" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {format(parseISO(r.created_at), 'MMM d')}
                      </td>
                      <td className="px-3 py-2"><ServiceLineBadge label={r.service_line} /></td>
                      <td className="px-3 py-2"><ContentTypeBadge label={r.content_type} /></td>
                      <td className="px-3 py-2 text-foreground font-medium max-w-[300px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate">
                              {r.title}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-sm">{r.title}</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex items-center gap-1 mt-0.5">
                          {r.event_promo_date && (
                            <span className="text-[10px] font-body bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
                              📅 {format(parseISO(r.event_promo_date), 'MMM d')}
                            </span>
                          )}
                          {req.has_hard_deadline && req.deadline_text && (
                            <span className="text-[10px] font-body bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
                              🔴 {req.deadline_text}
                            </span>
                          )}
                          {hasPendingAsset && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[10px] font-body bg-[#F1C40F]/20 text-[#F1C40F] border border-[#F1C40F]/30 px-1.5 py-0.5 rounded">
                                  📦 Asset needed
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Asset is waiting or blocking this request</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">{formatDateCell(r)}</td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <select
                              value={r.stage}
                              onChange={(e) => handleStageChange(r.id, e.target.value)}
                              className="text-xs bg-muted border-0 rounded px-1.5 py-1 text-foreground"
                            >
                              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </TooltipTrigger>
                          {r.stage === 'In Simplified' && (
                            <TooltipContent>Content is being reviewed in Simplified (compliance platform) before publishing</TooltipContent>
                          )}
                        </Tooltip>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[250px]">
                        <span className="whitespace-normal break-words">{r.what_needed_from_client || '–'}</span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{req.contact_person || '–'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.owner || '–'}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {fc > 0 && <span className="mr-1">📎{fc}</span>}
                        {cc > 0 && <span>💬{cc}</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
