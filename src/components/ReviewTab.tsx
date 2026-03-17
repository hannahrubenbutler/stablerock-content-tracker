import { useMemo, useState } from 'react';
import { Request, useRequests, useUpdateCreative, useUpdateRequest } from '@/hooks/useData';
import { getClientStatus } from '@/lib/constants';
import { ServiceLineBadge, ContentTypeBadge } from '@/components/Badges';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ReviewTabProps {
  onRequestClick: (req: Request) => void;
}

interface CreativeInfo {
  id: string;
  graphic_url: string | null;
  caption: string | null;
  platform: string;
  status: string;
  feedback: string | null;
  version: number;
  scheduled_datetime: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

export default function ReviewTab({ onRequestClick }: ReviewTabProps) {
  const { isAdmin } = useAuth();
  const { data: requests = [] } = useRequests();
  const updateCreative = useUpdateCreative();
  const updateRequest = useUpdateRequest();

  const reviewRequests = useMemo(() => {
    return requests.filter((r) => {
      const cs = getClientStatus(r.stage);
      return cs.tab === 'review';
    });
  }, [requests]);

  const requestIds = reviewRequests.map((r) => r.id);

  // Fetch latest creative for each review request
  const { data: creativeMap = {} } = useQuery({
    queryKey: ['review-creatives', requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return {};
      const { data, error } = await supabase
        .from('creatives')
        .select('*')
        .in('request_id', requestIds)
        .order('version', { ascending: false });
      if (error) throw error;
      const map: Record<string, CreativeInfo> = {};
      (data || []).forEach((c: any) => {
        if (!map[c.request_id]) {
          map[c.request_id] = c;
        }
      });
      return map;
    },
    enabled: requestIds.length > 0,
  });

  const readyForReview = reviewRequests.filter((r) => {
    const cs = getClientStatus(r.stage);
    return cs.label === 'Ready for Review';
  });

  const inRevision = reviewRequests.filter((r) => {
    const cs = getClientStatus(r.stage);
    return cs.label === 'In Revision';
  });

  const needsAction = readyForReview.length;

  return (
    <div className="space-y-8">
      {reviewRequests.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-sm font-body text-muted-foreground">Nothing to review right now. You're all caught up!</p>
        </div>
      ) : (
        <>
          {/* Ready for Review */}
          {readyForReview.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold font-body text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E67E22] animate-pulse" />
                Ready for Your Review
                <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-bold">{needsAction}</span>
              </h2>
              <div className="space-y-4">
                {readyForReview.map((r) => (
                  <ReviewCard
                    key={r.id}
                    request={r}
                    creative={creativeMap[r.id]}
                    onRequestClick={onRequestClick}
                    updateCreative={updateCreative}
                    updateRequest={updateRequest}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </section>
          )}

          {/* In Revision */}
          {inRevision.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold font-body text-foreground mb-3">
                🔄 In Revision ({inRevision.length})
              </h2>
              <p className="text-xs text-muted-foreground font-body mb-3">Archway is working on changes you requested. Updated versions will appear above when ready.</p>
              <div className="space-y-3">
                {inRevision.map((r) => {
                  const creative = creativeMap[r.id];
                  return (
                    <button
                      key={r.id}
                      onClick={() => onRequestClick(r)}
                      className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-accent transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {creative?.graphic_url && (
                          <img src={creative.graphic_url} alt="" className="w-16 h-16 object-cover rounded shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-body font-semibold text-foreground truncate">{r.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <ServiceLineBadge label={r.service_line} />
                            <ContentTypeBadge label={r.content_type} />
                          </div>
                          {creative?.feedback && (
                            <div className="mt-2 text-xs font-body bg-[#E67E22]/10 border border-[#E67E22]/20 rounded px-2.5 py-1.5 text-foreground">
                              <span className="font-semibold text-[#E67E22]">You said:</span> "{creative.feedback}"
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-body font-semibold px-2.5 py-1 rounded-full text-white bg-[#E67E22] shrink-0">
                          In Revision
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// Inline review card with LinkedIn preview + approve/request changes
function ReviewCard({
  request,
  creative,
  onRequestClick,
  updateCreative,
  updateRequest,
  isAdmin,
}: {
  request: Request;
  creative?: CreativeInfo;
  onRequestClick: (req: Request) => void;
  updateCreative: any;
  updateRequest: any;
  isAdmin: boolean;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [approverName, setApproverName] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('sr_submitter_name') || '' : ''
  );
  const [saving, setSaving] = useState(false);

  const handleApprove = async () => {
    if (!approverName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!creative) return;
    setSaving(true);
    try {
      await updateCreative.mutateAsync({
        id: creative.id,
        status: 'Approved',
        approved_by: approverName,
        approved_at: new Date().toISOString(),
      });
      await updateRequest.mutateAsync({ id: request.id, stage: 'Scheduled' } as any);
      localStorage.setItem('sr_submitter_name', approverName);
      toast.success('Approved! Post is now scheduled.');
    } catch {
      toast.error('Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!feedbackText.trim()) {
      toast.error('Please describe what changes you need');
      return;
    }
    if (!creative) return;
    setSaving(true);
    try {
      await updateCreative.mutateAsync({
        id: creative.id,
        status: 'Changes Requested',
        feedback: feedbackText,
      });
      await updateRequest.mutateAsync({ id: request.id, stage: 'Changes Requested' } as any);
      toast.success('Changes requested — Archway will revise this');
      setShowFeedback(false);
      setFeedbackText('');
    } catch {
      toast.error('Failed to request changes');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full text-sm font-body bg-background border border-border rounded px-2 py-1.5 text-foreground";

  return (
    <div className="bg-card border-2 border-[#E67E22]/30 rounded-xl overflow-hidden shadow-sm">
      {/* Header with badges */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ServiceLineBadge label={request.service_line} />
          <ContentTypeBadge label={request.content_type} />
          <button onClick={() => onRequestClick(request)} className="text-[11px] font-body text-accent hover:underline ml-2">
            View details →
          </button>
        </div>
        <span className="text-[11px] font-body font-semibold px-2.5 py-1 rounded-full text-white bg-[#E67E22]">
          Needs Your Review
        </span>
      </div>

      {/* LinkedIn-style preview */}
      {creative && (creative.graphic_url || creative.caption) ? (
        <div className="mx-4 mb-3 border border-border rounded-lg overflow-hidden bg-background">
          <div className="px-4 pt-3 pb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">SR</div>
            <div>
              <div className="text-sm font-semibold font-body text-foreground">Stable Rock</div>
              <div className="text-[11px] text-muted-foreground font-body">Company • {creative.platform || 'LinkedIn'}</div>
            </div>
          </div>
          {creative.caption && (
            <div className="px-4 pb-3">
              <p className="text-sm font-body text-foreground whitespace-pre-wrap leading-relaxed">{creative.caption}</p>
            </div>
          )}
          {creative.graphic_url && (
            <img src={creative.graphic_url} alt="" className="w-full" />
          )}
        </div>
      ) : (
        <div className="mx-4 mb-3 p-6 border border-border rounded-lg bg-muted text-center">
          <p className="text-sm font-body text-muted-foreground">Creative preview not available yet</p>
          <button onClick={() => onRequestClick(request)} className="text-xs font-body text-accent hover:underline mt-1">
            Open request to view details
          </button>
        </div>
      )}

      {/* Approve / Request Changes section */}
      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <input
            value={approverName}
            onChange={(e) => setApproverName(e.target.value)}
            placeholder="Your name"
            className={`${inputClass} flex-1 text-xs`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        {!showFeedback ? (
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={saving || !approverName.trim()}
              className="flex-1 text-sm font-body font-bold bg-[#27AE60] text-white px-4 py-3 rounded-lg hover:bg-[#219A52] disabled:opacity-50 transition-colors"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              disabled={saving}
              className="flex-1 text-sm font-body font-bold border-2 border-[#E67E22] text-[#E67E22] px-4 py-3 rounded-lg hover:bg-[#E67E22]/10 disabled:opacity-50 transition-colors"
            >
              ✎ Request Changes
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What changes would you like? Be specific so Archway can get it right..."
              className={`${inputClass} min-h-[80px]`}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleRequestChanges}
                disabled={saving || !feedbackText.trim()}
                className="text-sm font-body font-semibold bg-[#E67E22] text-white px-4 py-2 rounded-lg hover:bg-[#D35400] disabled:opacity-50 transition-colors"
              >
                Submit Feedback
              </button>
              <button onClick={() => setShowFeedback(false)} className="text-sm font-body text-muted-foreground hover:text-foreground px-3 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
