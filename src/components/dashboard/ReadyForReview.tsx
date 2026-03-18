import { Request } from '@/hooks/useData';
import { ServiceLineBadge, ContentTypeBadge } from '@/components/Badges';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import ContentPreview from '@/components/ContentPreview';

interface ReadyForReviewProps {
  requests: Request[];
  onRequestClick: (req: Request) => void;
}

export default function ReadyForReview({ requests, onRequestClick }: ReadyForReviewProps) {
  const requestIds = requests.map((r) => r.id);
  // #3: Fetch thumbnail + caption + scheduled_datetime
  const { data: creativeData = {} } = useQuery({
    queryKey: ['creative-thumbnails', requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return {};
      const { data, error } = await supabase
        .from('creatives')
        .select('request_id, graphic_url, caption, scheduled_datetime, version')
        .in('request_id', requestIds)
        .order('version', { ascending: false });
      if (error) throw error;
      const map: Record<string, { graphic_url: string | null; caption: string | null; scheduled_datetime: string | null }> = {};
      (data || []).forEach((c: any) => {
        if (!map[c.request_id]) {
          map[c.request_id] = { graphic_url: c.graphic_url, caption: c.caption, scheduled_datetime: c.scheduled_datetime };
        }
      });
      return map;
    },
    enabled: requestIds.length > 0,
  });

  return (
    <section>
      <h2 className="text-sm font-semibold font-body text-foreground mb-2 flex items-center gap-2">
        👀 Ready for Your Review
        {requests.length > 0 && (
          <span className="bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-full font-bold">{requests.length}</span>
        )}
      </h2>
      {requests.length === 0 ? (
        <p className="text-xs text-muted-foreground font-body">No posts waiting for review right now.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {requests.map((r) => {
            const cd = creativeData[r.id];
            return (
              <button
                key={r.id}
                onClick={() => onRequestClick(r)}
                className="text-left bg-card border border-border rounded-lg overflow-hidden hover:border-accent transition-colors group"
              >
                {/* Thumbnail — taller */}
                {cd?.graphic_url ? (
                  <ContentPreview
                    contentType={r.content_type}
                    graphicUrl={cd.graphic_url}
                    caption={cd.caption}
                    title={r.title}
                    compact
                  />
                ) : (
                  <div className="w-full h-40 bg-muted flex items-center justify-center text-2xl text-muted-foreground">📝</div>
                )}
                <div className="p-3 space-y-1.5">
                  <p className="text-sm font-body font-medium text-foreground truncate">{r.title}</p>
                  {/* First line of caption */}
                  {cd?.caption && (
                    <p className="text-[11px] font-body text-muted-foreground truncate">{cd.caption.split('\n')[0]}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <ServiceLineBadge label={r.service_line} />
                    <ContentTypeBadge label={r.content_type} />
                  </div>
                  {/* Scheduled date */}
                  {cd?.scheduled_datetime && (
                    <p className="text-[10px] font-body text-muted-foreground">
                      🕐 Scheduled for {format(parseISO(cd.scheduled_datetime), 'MMM d \'at\' h:mm a')}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <span className="text-xs font-body font-semibold text-accent group-hover:underline">Review →</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
