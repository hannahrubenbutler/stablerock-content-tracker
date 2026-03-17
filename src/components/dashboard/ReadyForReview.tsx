import { Request } from '@/hooks/useData';
import { ServiceLineBadge, ContentTypeBadge } from '@/components/Badges';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ReadyForReviewProps {
  requests: Request[];
  onRequestClick: (req: Request) => void;
}

export default function ReadyForReview({ requests, onRequestClick }: ReadyForReviewProps) {
  // Fetch latest creative thumbnail for each request
  const requestIds = requests.map((r) => r.id);
  const { data: creativeThumbnails = {} } = useQuery({
    queryKey: ['creative-thumbnails', requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return {};
      const { data, error } = await supabase
        .from('creatives')
        .select('request_id, graphic_url, version')
        .in('request_id', requestIds)
        .order('version', { ascending: false });
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((c: any) => {
        if (!map[c.request_id] && c.graphic_url) {
          map[c.request_id] = c.graphic_url;
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
          {requests.map((r) => (
            <button
              key={r.id}
              onClick={() => onRequestClick(r)}
              className="text-left bg-card border border-border rounded-lg overflow-hidden hover:border-accent transition-colors group"
            >
              {/* Thumbnail */}
              {creativeThumbnails[r.id] ? (
                <img src={creativeThumbnails[r.id]} alt="" className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-muted flex items-center justify-center text-2xl text-muted-foreground">📝</div>
              )}
              <div className="p-3 space-y-2">
                <p className="text-sm font-body font-medium text-foreground truncate">{r.title}</p>
                <div className="flex items-center gap-2">
                  <ServiceLineBadge label={r.service_line} />
                  <ContentTypeBadge label={r.content_type} />
                </div>
                <div className="flex justify-end">
                  <span className="text-xs font-body font-semibold text-accent group-hover:underline">Review →</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
