import { useState } from 'react';

interface ContentPreviewProps {
  contentType: string;
  graphicUrl: string | null;
  caption: string | null;
  title: string;
  scheduledDatetime?: string | null;
  eventDate?: string | null;
  platform?: string;
  /** Compact mode for dashboard thumbnails — just image + title */
  compact?: boolean;
}

// Render caption with hashtags in blue
function renderCaption(text: string) {
  return text.split(/(#\w+)/g).map((part, i) =>
    part.startsWith('#') ? <span key={i} className="text-[hsl(210,70%,50%)]">{part}</span> : part
  );
}

// Expandable caption
function ExpandableCaption({ text, className = '' }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split('\n');
  const isLong = lines.length > 4 || text.length > 280;

  if (!isLong) {
    return <p className={`whitespace-pre-wrap leading-relaxed ${className}`}>{renderCaption(text)}</p>;
  }

  return (
    <div>
      <p className={`whitespace-pre-wrap leading-relaxed ${!expanded ? 'line-clamp-4' : ''} ${className}`}>
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

function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
}

export default function ContentPreview({
  contentType,
  graphicUrl,
  caption,
  title,
  scheduledDatetime,
  eventDate,
  platform = 'LinkedIn',
  compact = false,
}: ContentPreviewProps) {
  const type = contentType.toLowerCase();

  // Compact mode: just thumbnail + title for dashboards
  if (compact) {
    return (
      <div>
        {graphicUrl ? (
          <img src={graphicUrl} alt="" className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-40 bg-muted flex items-center justify-center text-2xl text-muted-foreground">📝</div>
        )}
      </div>
    );
  }

  // LinkedIn Post
  if (type === 'linkedin post') {
    return <LinkedInPreview graphicUrl={graphicUrl} caption={caption} platform={platform} />;
  }

  // Blog Post / SEO Article
  if (type === 'blog post' || type === 'seo article') {
    return <BlogPreview graphicUrl={graphicUrl} caption={caption} title={title} />;
  }

  // Email Campaign / Email Nurture / Newsletter
  if (type === 'email campaign' || type === 'email nurture' || type === 'newsletter') {
    return <EmailPreview graphicUrl={graphicUrl} caption={caption} title={title} />;
  }

  // Landing Page
  if (type === 'landing page') {
    return <LandingPagePreview graphicUrl={graphicUrl} caption={caption} title={title} />;
  }

  // Event Promotion
  if (type === 'event promotion') {
    return <EventPreview graphicUrl={graphicUrl} caption={caption} title={title} eventDate={eventDate} />;
  }

  // Website Update
  if (type === 'website update') {
    return <WebsiteUpdatePreview graphicUrl={graphicUrl} caption={caption} title={title} />;
  }

  // Fallback: Other / Not Sure
  return <GenericPreview graphicUrl={graphicUrl} caption={caption} contentType={contentType} />;
}

// ─── LinkedIn ────────────────────────────────────────────
function LinkedInPreview({ graphicUrl, caption, platform }: { graphicUrl: string | null; caption: string | null; platform: string }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">SR</div>
        <div>
          <div className="text-xs font-semibold font-body text-foreground">Stable Rock Solutions</div>
          <div className="text-[10px] text-muted-foreground font-body">Company · {platform}</div>
        </div>
      </div>
      {caption && (
        <div className="px-3 pb-2">
          <ExpandableCaption text={caption} className="text-xs font-body text-foreground" />
        </div>
      )}
      {graphicUrl && <img src={graphicUrl} alt="" className="w-full" />}
      <div className="px-3 py-1.5 border-t border-border flex items-center justify-around text-[10px] text-muted-foreground font-body">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>🔁 Repost</span>
        <span>📤 Send</span>
      </div>
    </div>
  );
}

// ─── Blog / SEO ──────────────────────────────────────────
function BlogPreview({ graphicUrl, caption, title }: { graphicUrl: string | null; caption: string | null; title: string }) {
  const readTime = caption ? estimateReadTime(caption) : 1;
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {graphicUrl && <img src={graphicUrl} alt="" className="w-full" />}
      <div className="px-4 py-3 space-y-2">
        <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {title}
        </h3>
        {caption && (
          <ExpandableCaption text={caption} className="text-sm font-body text-muted-foreground leading-relaxed" />
        )}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-[10px] font-body text-muted-foreground">stablerock.com/blog</span>
          <span className="text-[10px] font-body text-muted-foreground">📖 Read time: {readTime} min</span>
        </div>
      </div>
    </div>
  );
}

// ─── Email ───────────────────────────────────────────────
function EmailPreview({ graphicUrl, caption, title }: { graphicUrl: string | null; caption: string | null; title: string }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Email header bar */}
      <div className="bg-muted px-3 py-1.5 flex items-center gap-2 border-b border-border">
        <span className="text-[10px] font-body font-semibold text-muted-foreground tracking-wider uppercase">Email Preview</span>
      </div>
      {/* From / Subject */}
      <div className="px-4 py-2.5 border-b border-border space-y-0.5">
        <div className="text-[11px] font-body text-muted-foreground">
          <span className="font-semibold text-foreground">From:</span> Stable Rock Solutions
        </div>
        <div className="text-[11px] font-body text-muted-foreground">
          <span className="font-semibold text-foreground">Subject:</span> {title}
        </div>
      </div>
      {/* Email body */}
      <div className="px-4 py-3 space-y-3">
        {caption && (
          <ExpandableCaption text={caption} className="text-sm font-body text-foreground leading-relaxed" />
        )}
        {graphicUrl && (
          <img src={graphicUrl} alt="" className="w-full rounded border border-border" />
        )}
      </div>
      {/* Footer */}
      <div className="bg-muted px-3 py-1.5 border-t border-border text-center">
        <span className="text-[9px] font-body text-muted-foreground">Sent via HubSpot</span>
      </div>
    </div>
  );
}

// ─── Landing Page ────────────────────────────────────────
function LandingPagePreview({ graphicUrl, caption, title }: { graphicUrl: string | null; caption: string | null; title: string }) {
  const slug = slugify(title);
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Browser chrome */}
      <div className="bg-muted px-3 py-2 flex items-center gap-2 border-b border-border">
        <div className="flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
          <span className="w-2.5 h-2.5 rounded-full bg-accent/40" />
          <span className="w-2.5 h-2.5 rounded-full bg-[hsl(145,63%,42%)]/40" />
        </div>
        <div className="flex-1 bg-background rounded px-2 py-0.5 text-[10px] font-body text-muted-foreground truncate">
          stablerock.com/{slug}
        </div>
      </div>
      {/* Hero */}
      {graphicUrl && <img src={graphicUrl} alt="" className="w-full" />}
      <div className="px-4 py-4 space-y-3 text-center">
        <h3 className="text-base font-bold font-body text-foreground">{title}</h3>
        {caption && (
          <p className="text-sm font-body text-muted-foreground leading-relaxed line-clamp-3">{caption}</p>
        )}
        <div className="pt-1">
          <span className="inline-block bg-accent text-accent-foreground text-xs font-body font-semibold px-5 py-2 rounded-lg">
            Learn More
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Event Promotion ─────────────────────────────────────
function EventPreview({ graphicUrl, caption, title, eventDate }: { graphicUrl: string | null; caption: string | null; title: string; eventDate?: string | null }) {
  let formattedDate: string | null = null;
  if (eventDate) {
    try {
      const d = new Date(eventDate);
      formattedDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch { /* ignore */ }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {graphicUrl && <img src={graphicUrl} alt="" className="w-full" />}
      <div className="px-4 py-3 space-y-2">
        <h3 className="text-base font-bold font-body text-foreground">{title}</h3>
        {formattedDate && (
          <div className="flex items-center gap-2 text-sm font-body text-accent font-semibold">
            📅 {formattedDate}
          </div>
        )}
        {caption && (
          <ExpandableCaption text={caption} className="text-sm font-body text-muted-foreground leading-relaxed" />
        )}
        <div className="pt-1">
          <span className="inline-block bg-accent text-accent-foreground text-xs font-body font-semibold px-5 py-2 rounded-lg">
            Register
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Website Update ──────────────────────────────────────
function WebsiteUpdatePreview({ graphicUrl, caption, title }: { graphicUrl: string | null; caption: string | null; title: string }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Browser chrome */}
      <div className="bg-muted px-3 py-2 flex items-center gap-2 border-b border-border">
        <div className="flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
          <span className="w-2.5 h-2.5 rounded-full bg-accent/40" />
          <span className="w-2.5 h-2.5 rounded-full bg-[hsl(145,63%,42%)]/40" />
        </div>
        <div className="flex-1 bg-background rounded px-2 py-0.5 text-[10px] font-body text-muted-foreground truncate">
          stablerock.com
        </div>
      </div>
      {/* Content */}
      <div className="relative">
        {graphicUrl && <img src={graphicUrl} alt="" className="w-full" />}
        <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[9px] font-body font-bold px-2 py-0.5 rounded">
          Website Update
        </span>
      </div>
      {caption && (
        <div className="px-4 py-3">
          <p className="text-sm font-body text-muted-foreground leading-relaxed">{caption}</p>
        </div>
      )}
    </div>
  );
}

// ─── Generic / Other ─────────────────────────────────────
function GenericPreview({ graphicUrl, caption, contentType }: { graphicUrl: string | null; caption: string | null; contentType: string }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {graphicUrl && <img src={graphicUrl} alt="" className="w-full" />}
      <div className="px-4 py-3 space-y-2">
        {caption && (
          <ExpandableCaption text={caption} className="text-sm font-body text-foreground leading-relaxed" />
        )}
        <span className="inline-block text-[10px] font-body font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {contentType}
        </span>
      </div>
    </div>
  );
}
