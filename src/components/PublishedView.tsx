import { Request, useRequests } from '@/hooks/useData';
import { ServiceLineBadge, ContentTypeBadge } from '@/components/Badges';
import { format, parseISO } from 'date-fns';

interface PublishedViewProps {
  onRequestClick: (req: Request) => void;
}

export default function PublishedView({ onRequestClick }: PublishedViewProps) {
  const { data: requests = [] } = useRequests();
  const published = requests.filter((r) => r.stage === 'Published').sort((a, b) => {
    const aDate = (a as any).actual_publish_date || a.updated_at;
    const bDate = (b as any).actual_publish_date || b.updated_at;
    return bDate > aDate ? 1 : -1;
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-body">{published.length} piece(s) published — proof of value.</p>
      {published.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body py-8 text-center">
          Nothing published yet. Content moves here when Archway marks it as Published.
        </p>
      ) : (
        published.map((r) => {
          const req = r as any;
          const displayDate = req.actual_publish_date
            ? format(parseISO(req.actual_publish_date), 'MMM d, yyyy')
            : format(parseISO(r.updated_at), 'MMM d, yyyy');
          return (
            <button
              key={r.id}
              onClick={() => onRequestClick(r)}
              className="w-full text-left bg-card border border-border rounded p-4 hover:border-accent transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <ServiceLineBadge label={r.service_line} />
                <ContentTypeBadge label={r.content_type} />
              </div>
              <h3 className="text-sm font-semibold font-body text-foreground">{r.title}</h3>
              <p className="text-xs text-muted-foreground font-body mt-1">
                Published {displayDate}
                {r.submitter_name && ` · Requested by ${r.submitter_name}`}
              </p>
            </button>
          );
        })
      )}
    </div>
  );
}
