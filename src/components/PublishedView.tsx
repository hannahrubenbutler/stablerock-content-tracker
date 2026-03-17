import { Request, useRequests } from '@/hooks/useData';
import { ServiceLineBadge, ContentTypeBadge } from '@/components/Badges';
import { format, parseISO } from 'date-fns';

interface PublishedViewProps {
  onRequestClick: (req: Request) => void;
}

export default function PublishedView({ onRequestClick }: PublishedViewProps) {
  const { data: requests = [] } = useRequests();
  const published = requests.filter((r) => r.stage === 'Published').sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-body">{published.length} piece(s) published — proof of value.</p>
      {published.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body py-8 text-center">No published content yet.</p>
      ) : (
        published.map((r) => (
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
              Published {format(parseISO(r.updated_at), 'MMM d, yyyy')}
              {r.submitter_name && ` · Requested by ${r.submitter_name}`}
            </p>
          </button>
        ))
      )}
    </div>
  );
}
