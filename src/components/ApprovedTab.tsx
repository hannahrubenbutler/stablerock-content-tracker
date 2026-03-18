import { useMemo } from 'react';
import { Request, useRequests } from '@/hooks/useData';
import { getClientStatus } from '@/lib/constants';
import { ServiceLineBadge, ContentTypeBadge } from '@/components/Badges';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ExternalLink } from 'lucide-react';

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

  // #6: Group published by month
  const publishedByMonth = useMemo(() => {
    const groups: { label: string; items: Request[] }[] = [];
    const monthMap: Record<string, Request[]> = {};
    publishedRequests.forEach((r) => {
      const req = r as any;
      const pubDate = req.actual_publish_date || r.updated_at;
      const monthKey = format(parseISO(pubDate), 'yyyy-MM');
      if (!monthMap[monthKey]) monthMap[monthKey] = [];
      monthMap[monthKey].push(r);
    });
    Object.keys(monthMap).sort().reverse().forEach((key) => {
      const label = format(parseISO(key + '-01'), 'MMMM yyyy');
      groups.push({ label, items: monthMap[key] });
    });
    return groups;
  }, [publishedRequests]);

  // Fetch schedule info + graphic_url for scheduled items
  const allIds = [...scheduledRequests.map((r) => r.id), ...publishedRequests.map((r) => r.id)];
  const { data: creativeInfo = {} } = useQuery({
    queryKey: ['approved-creative-info', allIds],
    queryFn: async () => {
      if (allIds.length === 0) return {};
      const { data, error } = await supabase
        .from('creatives')
        .select('request_id, scheduled_datetime, platform, version, graphic_url')
        .in('request_id', allIds)
        .order('version', { ascending: false });
      if (error) throw error;
      const map: Record<string, { scheduled_datetime: string | null; platform: string; graphic_url: string | null }> = {};
      (data || []).forEach((c: any) => {
        if (!map[c.request_id]) {
          map[c.request_id] = { scheduled_datetime: c.scheduled_datetime, platform: c.platform, graphic_url: c.graphic_url };
        }
      });
      return map;
    },
    enabled: allIds.length > 0,
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
              const info = creativeInfo[r.id];
              return (
                <button
                  key={r.id}
                  onClick={() => onRequestClick(r)}
                  className="w-full text-left bg-card border border-border rounded-lg px-4 py-3 hover:border-accent transition-colors flex items-center gap-3"
                >
                  {/* #4: Creative thumbnail */}
                  {info?.graphic_url ? (
                    <img src={info.graphic_url} alt="" className="w-14 h-14 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[hsl(168,76%,42%)]/10 flex items-center justify-center text-lg shrink-0">🕐</div>
                  )}
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
                      <span className="text-[10px] font-body bg-[hsl(210,70%,50%)]/10 text-[hsl(210,70%,50%)] px-1.5 py-0.5 rounded mt-0.5 inline-block">{info.platform}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Published section — #6: grouped by month */}
      {publishedByMonth.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold font-body text-foreground mb-3 flex items-center gap-2">
            ✅ Published
            <span className="text-xs font-normal text-muted-foreground">({publishedRequests.length} piece{publishedRequests.length !== 1 ? 's' : ''} delivered)</span>
          </h2>
          <div className="space-y-5">
            {publishedByMonth.map(({ label, items }) => (
              <div key={label}>
                <h3 className="text-xs font-semibold font-body text-muted-foreground mb-2">
                  {label} ({items.length} post{items.length !== 1 ? 's' : ''})
                </h3>
                <div className="space-y-2">
                  {items.map((r) => {
                    const req = r as any;
                    const info = creativeInfo[r.id];
                    const displayDate = req.actual_publish_date
                      ? format(parseISO(req.actual_publish_date), 'MMM d, yyyy')
                      : format(parseISO(r.updated_at), 'MMM d, yyyy');
                    return (
                      <div
                        key={r.id}
                        className="bg-card border border-border rounded-lg px-4 py-3 hover:border-accent transition-colors flex items-center gap-3"
                      >
                        {/* Thumbnail */}
                        {info?.graphic_url ? (
                          <img src={info.graphic_url} alt="" className="w-14 h-14 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[hsl(145,63%,42%)]/10 flex items-center justify-center text-lg shrink-0">✅</div>
                        )}
                        <button onClick={() => onRequestClick(r)} className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-body font-semibold text-foreground truncate">{r.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <ServiceLineBadge label={r.service_line} />
                            <ContentTypeBadge label={r.content_type} />
                            <span className="text-[11px] font-body text-muted-foreground">Published {displayDate}</span>
                          </div>
                        </button>
                        {/* #5: View on LinkedIn link — placeholder for linkedin_post_url field */}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
