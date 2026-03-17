import { useMemo } from 'react';
import { Request, useRequests } from '@/hooks/useData';
import { getClientStatus } from '@/lib/constants';
import { ServiceLineBadge, ContentTypeBadge } from '@/components/Badges';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';

interface ApprovedTabProps {
  onRequestClick: (req: Request) => void;
}

export default function ApprovedTab({ onRequestClick }: ApprovedTabProps) {
  const { data: requests = [] } = useRequests();

  const scheduledRequests = useMemo(() => {
    return requests.filter((r) => {
      const cs = getClientStatus(r.stage);
      return cs.tab === 'approved' && cs.label === 'Scheduled';
    }).sort((a, b) => {
      // Sort by target_date ascending
      if (!a.target_date && !b.target_date) return 0;
      if (!a.target_date) return 1;
      if (!b.target_date) return -1;
      return a.target_date > b.target_date ? 1 : -1;
    });
  }, [requests]);

  const publishedRequests = useMemo(() => {
    return requests.filter((r) => {
      const cs = getClientStatus(r.stage);
      return cs.tab === 'approved' && cs.label === 'Published';
    }).sort((a, b) => {
      const aDate = (a as any).actual_publish_date || a.updated_at;
      const bDate = (b as any).actual_publish_date || b.updated_at;
      return bDate > aDate ? 1 : -1;
    });
  }, [requests]);

  // Fetch schedule info for scheduled items
  const scheduledIds = scheduledRequests.map((r) => r.id);
  const { data: scheduleInfo = {} } = useQuery({
    queryKey: ['approved-schedule-info', scheduledIds],
    queryFn: async () => {
      if (scheduledIds.length === 0) return {};
      const { data, error } = await supabase
        .from('creatives')
        .select('request_id, scheduled_datetime, platform, version')
        .in('request_id', scheduledIds)
        .order('version', { ascending: false });
      if (error) throw error;
      const map: Record<string, { scheduled_datetime: string | null; platform: string }> = {};
      (data || []).forEach((c: any) => {
        if (!map[c.request_id]) {
          map[c.request_id] = { scheduled_datetime: c.scheduled_datetime, platform: c.platform };
        }
      });
      return map;
    },
    enabled: scheduledIds.length > 0,
  });

  return (
    <div className="space-y-8">
      {scheduledRequests.length === 0 && publishedRequests.length === 0 && (
        <div className="text-center py-16">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm font-body text-muted-foreground">No approved content yet. Once you approve posts in the Review tab, they'll appear here.</p>
        </div>
      )}

      {/* Scheduled section */}
      {scheduledRequests.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold font-body text-foreground mb-3 flex items-center gap-2">
            🗓 Scheduled
            <span className="text-xs font-normal text-muted-foreground">({scheduledRequests.length} post{scheduledRequests.length !== 1 ? 's' : ''} coming up)</span>
          </h2>
          <div className="space-y-2">
            {scheduledRequests.map((r) => {
              const info = scheduleInfo[r.id];
              return (
                <button
                  key={r.id}
                  onClick={() => onRequestClick(r)}
                  className="w-full text-left bg-card border border-border rounded-lg px-4 py-3 hover:border-accent transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1ABC9C]/10 flex items-center justify-center text-lg shrink-0">🕐</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-semibold text-foreground truncate">{r.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ServiceLineBadge label={r.service_line} />
                      <ContentTypeBadge label={r.content_type} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {info?.scheduled_datetime ? (
                      <p className="text-xs font-body font-semibold text-foreground">
                        {format(parseISO(info.scheduled_datetime), 'MMM d, yyyy')}
                        <span className="text-muted-foreground font-normal ml-1">
                          {format(parseISO(info.scheduled_datetime), 'h:mm a')}
                        </span>
                      </p>
                    ) : r.target_date ? (
                      <p className="text-xs font-body text-foreground">
                        {format(parseISO(r.target_date), 'MMM d, yyyy')}
                      </p>
                    ) : (
                      <p className="text-xs font-body text-muted-foreground italic">Date TBD</p>
                    )}
                    {info?.platform && (
                      <span className="text-[10px] font-body bg-[#2980B9]/10 text-[#2980B9] px-1.5 py-0.5 rounded mt-0.5 inline-block">{info.platform}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Published section */}
      {publishedRequests.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold font-body text-foreground mb-3 flex items-center gap-2">
            ✅ Published
            <span className="text-xs font-normal text-muted-foreground">({publishedRequests.length} piece{publishedRequests.length !== 1 ? 's' : ''} delivered)</span>
          </h2>
          <div className="space-y-2">
            {publishedRequests.map((r) => {
              const req = r as any;
              const displayDate = req.actual_publish_date
                ? format(parseISO(req.actual_publish_date), 'MMM d, yyyy')
                : format(parseISO(r.updated_at), 'MMM d, yyyy');
              return (
                <button
                  key={r.id}
                  onClick={() => onRequestClick(r)}
                  className="w-full text-left bg-card border border-border rounded-lg px-4 py-3 hover:border-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#27AE60]/10 flex items-center justify-center text-lg shrink-0">✅</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body font-semibold text-foreground truncate">{r.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <ServiceLineBadge label={r.service_line} />
                        <ContentTypeBadge label={r.content_type} />
                        <span className="text-[11px] font-body text-muted-foreground">Published {displayDate}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
