import { Request } from '@/hooks/useData';
import { ServiceLineBadge, ContentTypeBadge } from '@/components/Badges';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';

interface ScheduledQueueProps {
  requests: Request[];
  onRequestClick: (req: Request) => void;
}

export default function ScheduledQueue({ requests, onRequestClick }: ScheduledQueueProps) {
  const requestIds = requests.map((r) => r.id);
  const { data: scheduleInfo = {} } = useQuery({
    queryKey: ['scheduled-info', requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return {};
      const { data, error } = await supabase
        .from('creatives')
        .select('request_id, scheduled_datetime, platform, version')
        .in('request_id', requestIds)
        .eq('status', 'Approved')
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
    enabled: requestIds.length > 0,
  });

  if (requests.length === 0) return null;

  // Sort by scheduled datetime
  const sorted = [...requests].sort((a, b) => {
    const aTime = scheduleInfo[a.id]?.scheduled_datetime || '';
    const bTime = scheduleInfo[b.id]?.scheduled_datetime || '';
    return aTime.localeCompare(bTime);
  });

  return (
    <section>
      <h2 className="text-sm font-semibold font-body text-foreground mb-2">🗓 Scheduled ({requests.length})</h2>
      <div className="space-y-1">
        {sorted.map((r) => {
          const info = scheduleInfo[r.id];
          return (
            <button
              key={r.id}
              onClick={() => onRequestClick(r)}
              className="w-full text-left bg-card border border-border rounded px-3 py-2 hover:border-accent transition-colors flex items-center gap-3"
            >
              <span className="text-lg">🕐</span>
              <ServiceLineBadge label={r.service_line} />
              <ContentTypeBadge label={r.content_type} />
              <span className="text-sm font-body text-foreground flex-1 truncate">{r.title}</span>
              {info?.scheduled_datetime && (
                <span className="text-xs font-body text-muted-foreground shrink-0">
                  {format(parseISO(info.scheduled_datetime), 'MMM d, yyyy h:mm a')}
                </span>
              )}
              {info?.platform && (
                <span className="text-[10px] font-body bg-[#2980B9]/10 text-[#2980B9] px-1.5 py-0.5 rounded shrink-0">{info.platform}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
