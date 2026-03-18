import { useMemo, useState } from 'react';
import { Request, useRequests, useUpdateCreative, useUpdateRequest } from '@/hooks/useData';
import { getClientStatus } from '@/lib/constants';
import { ServiceLineBadge, ContentTypeBadge } from '@/components/Badges';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FileImage, CheckCircle2 } from 'lucide-react';

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

  // Fetch file attachments for requests without creatives
  const { data: fileMap = {} } = useQuery({
    queryKey: ['review-files', requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return {};
      const { data, error } = await supabase
        .from('file_references')
        .select('*')
        .in('request_id', requestIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const map: Record<string, { file_url: string; file_name: string; file_type: string | null }> = {};
      (data || []).forEach((f: any) => {
        if (!map[f.request_id]) {
          map[f.request_id] = { file_url: f.file_url, file_name: f.file_name, file_type: f.file_type };
        }
      });
      return map;
    },
    enabled: requestIds.length > 0,
  });

  // #1: Only show in "Ready for Review" if they have a creative with graphic_url
  const readyForReview = reviewRequests.filter((r) => {
    const cs = getClientStatus(r.stage);
    if (cs.label !== 'Ready for Review') return false;
    const creative = creativeMap[r.id];
    return creative && creative.graphic_url;
  });

  const inRevision = reviewRequests.filter((r) => {
    const cs = getClientStatus(r.stage);
    return cs.label === 'In Revision';
  });

  const needsAction = readyForReview.length;

  return (
    <div className="space-y-8">
      {reviewRequests.length === 0 || (readyForReview.length === 0 && inRevision.length === 0) ? (
        // #15: Empty state with animation
        <div className="text-center py-16 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(145,63%,42%)]/10 mb-4 animate-scale-in">
            <CheckCircle2 className="w-8 h-8 text-[hsl(145,63%,42%)]" />
          </div>
          <p className="text-sm font-body text-muted-foreground">Nothing to review right now. You're all caught up!</p>
        </div>
      ) : (
        <>
          {readyForReview.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold font-body text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Ready for Your Review
                <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-bold">{needsAction}</span>
              </h2>
              <div className="space-y-4">
                {readyForReview.map((r) => (
                  <ReviewCard
                    key={r.id}
                    request={r}
                    creative={creativeMap[r.id]}
                    file={fileMap[r.id]}
                    onRequestClick={onRequestClick}
                    updateCreative={updateCreative}
                    updateRequest={updateRequest}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </section>
          )}

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
                      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-accent transition-colors shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        {creative?.graphic_url && (
                          <img src={creative.graphic_url} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-body font-semibold text-foreground truncate">{r.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <ServiceLineBadge label={r.service_line} />
                            <ContentTypeBadge label={r.content_type} />
                          </div>
                          {creative?.feedback && (
                            <div className="mt-2 text-xs font-body bg-accent/10 border border-accent/20 rounded px-2.5 py-1.5 text-foreground">
                              <span className="font-semibold text-accent">You said:</span> "{creative.feedback}"
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-body font-semibold px-2.5 py-1 rounded-full text-white bg-accent shrink-0">
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

// Render caption with hashtags in blue
function renderCaption(text: string) {
  return text.split(/(#\w+)/g).map((part, i) =>
    part.startsWith('#') ? <span key={i} className="text-[hsl(210,70%,50%)]">{part}</span> : part
  );
}

// #2: Expandable caption component
function ExpandableCaption({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split('\n');
  const isLong = lines.length > 4 || text.length > 280;

  if (!isLong) {
    return <p className="text-xs font-body text-foreground whitespace-pre-wrap leading-relaxed">{renderCaption(text)}</p>;
  }

  return (
    <div>
      <p className={`text-xs font-body text-foreground whitespace-pre-wrap leading-relaxed ${!expanded ? 'line-clamp-4' : ''}`}>
        {renderCaption(text)}
      </p>
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="text-xs font-body text-muted-foreground hover:text-foreground mt-0.5"
      >
        {expanded ? '...see less' : '...see more'}
      </button>
    </div>
  );
}

function ReviewCard({
  request,
  creative,
  file,
  onRequestClick,
  updateCreative,
  updateRequest,
  isAdmin,
}: {
  request: Request;
  creative?: CreativeInfo;
  file?: { file_url: string; file_name: string; file_type: string | null };
  onRequestClick: (req: Request) => void;
  updateCreative: any;
  updateRequest: any;
  isAdmin: boolean;
}) {
  const { profile } = useAuth();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [saving, setSaving] = useState(false);
  // #11: Fade out animation on approve
  const [isExiting, setIsExiting] = useState(false);

  const approverName = profile?.full_name || profile?.email || '';

  const handleApprove = async () => {
    if (!approverName) { toast.error('Could not determine your name'); return; }
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
      setIsExiting(true);
      toast.success('Approved! Post is now scheduled.');
    } catch {
      toast.error('Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!feedbackText.trim()) { toast.error('Please describe what changes you need'); return; }
    if (!creative) return;
    setSaving(true);
    try {
      await updateCreative.mutateAsync({
        id: creative.id,
        status: 'Changes Requested',
        feedback: feedbackText,
      });
      await updateRequest.mutateAsync({ id: request.id, stage: 'Changes Requested' } as any);
      setIsExiting(true);
      toast.success('Changes requested — Archway will revise this');
      setShowFeedback(false);
      setFeedbackText('');
    } catch {
      toast.error('Failed to request changes');
    } finally {
      setSaving(false);
    }
  };

  const previewImageUrl = creative?.graphic_url
    || (file?.file_type?.startsWith('image') ? file.file_url : null);

  const hasPreviewContent = previewImageUrl || creative?.caption;

  return (
    <div className={`bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all ${isExiting ? 'animate-fade-out opacity-0' : 'animate-fade-in'}`}>
      {/* Card header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-body font-bold text-foreground truncate">{request.title}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <ServiceLineBadge label={request.service_line} />
              <ContentTypeBadge label={request.content_type} />
              {request.target_date && (
                <span className="text-[11px] font-body text-muted-foreground">
                  Due {format(parseISO(request.target_date), 'MMM d')}
                </span>
              )}
            </div>
          </div>
          <span className="text-[11px] font-body font-semibold px-2.5 py-1 rounded-full bg-accent/15 text-accent shrink-0">
            Needs Your Review
          </span>
        </div>
      </div>

      {/* LinkedIn-style preview */}
      {hasPreviewContent ? (
        <div className="mx-4 mb-3 border border-border rounded-lg overflow-hidden bg-background">
          <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">SR</div>
            <div>
              <div className="text-xs font-semibold font-body text-foreground">Stable Rock Solutions</div>
              <div className="text-[10px] text-muted-foreground font-body">Company · {creative?.platform || 'LinkedIn'}</div>
            </div>
          </div>
          {creative?.caption && (
            <div className="px-3 pb-2">
              <ExpandableCaption text={creative.caption} />
            </div>
          )}
          {previewImageUrl && (
            <img src={previewImageUrl} alt="" className="w-full" />
          )}
          {/* Faux engagement bar */}
          <div className="px-3 py-1.5 border-t border-border flex items-center justify-around text-[10px] text-muted-foreground font-body">
            <span>👍 Like</span>
            <span>💬 Comment</span>
            <span>🔁 Repost</span>
            <span>📤 Send</span>
          </div>
        </div>
      ) : (
        <div className="mx-4 mb-3 py-6 border border-dashed border-border rounded-lg bg-muted/50 flex flex-col items-center justify-center gap-1.5">
          <FileImage className="w-6 h-6 text-muted-foreground/50" />
          <p className="text-xs font-body text-muted-foreground">Creative preview not available yet</p>
          <button onClick={() => onRequestClick(request)} className="text-[11px] font-body text-accent hover:underline">
            View request details →
          </button>
        </div>
      )}

      {/* Actions — #14: stack on mobile */}
      <div className="px-4 pb-4 space-y-3">
        {!showFeedback ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleApprove}
              disabled={saving}
              className="flex-1 text-sm font-body font-semibold bg-[hsl(145,63%,42%)] text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              disabled={saving}
              className="flex-1 text-sm font-body font-semibold bg-accent text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              ✎ Request Changes
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-body font-medium text-muted-foreground">
              What changes would you like?
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Be specific so Archway can get it right..."
              className="w-full text-sm font-body bg-background border border-border rounded-lg px-3 py-2 text-foreground min-h-[72px] focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleRequestChanges}
                disabled={saving || !feedbackText.trim()}
                className="text-sm font-body font-semibold bg-accent text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
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
