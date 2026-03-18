import { useMemo, useState } from 'react';
import { Request, useRequests } from '@/hooks/useData';
import { getClientStatus } from '@/lib/constants';
import { ContentTypeBadge } from '@/components/Badges';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { TabName } from '@/components/AppHeader';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface DashboardProps {
  onRequestClick: (req: Request) => void;
  onTabChange: (tab: TabName) => void;
}

export default function Dashboard({ onRequestClick, onTabChange }: DashboardProps) {
  const { data: requests = [] } = useRequests();

  // Quick stats
  const inProgressCount = useMemo(() => requests.filter((r) => {
    const cs = getClientStatus(r.stage);
    return cs.tab === 'requests' && cs.label !== 'On Hold';
  }).length, [requests]);
  const reviewCount = useMemo(() => requests.filter((r) => {
    const cs = getClientStatus(r.stage);
    return cs.tab === 'review' && cs.label === 'Ready for Review';
  }).length, [requests]);
  const scheduledCount = useMemo(() => requests.filter((r) => {
    const cs = getClientStatus(r.stage);
    return cs.tab === 'approved' && cs.label === 'Scheduled';
  }).length, [requests]);
  const publishedThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    return requests.filter((r) => {
      if (r.stage !== 'Published') return false;
      const pubDate = (r as any).actual_publish_date || r.updated_at;
      return isWithinInterval(parseISO(pubDate), { start: monthStart, end: monthEnd });
    }).length;
  }, [requests]);

  // Needs attention — group by contact_person only
  const needsClientAction = useMemo(() => {
    return requests.filter((r) => r.what_needed_from_client?.trim() && r.stage !== 'Published');
  }, [requests]);

  const needsClientGrouped = useMemo(() => {
    const groups: Record<string, Request[]> = {};
    needsClientAction.forEach((r) => {
      const person = (r as any).contact_person || '';
      const key = person.trim() || '__unassigned__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    const entries = Object.entries(groups);
    return entries.sort((a, b) => {
      if (a[0] === '__unassigned__') return 1;
      if (b[0] === '__unassigned__') return -1;
      return b[1].length - a[1].length;
    });
  }, [needsClientAction]);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (person: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [person]: !prev[person] }));
  };

  const statCards = [
    { label: 'Requests in progress', count: inProgressCount, tab: 'Content' as TabName, borderColor: 'hsl(204, 64%, 44%)' },
    { label: reviewCount > 0 ? 'Ready for review ⚡' : 'Ready for review', count: reviewCount, tab: 'Review' as TabName, borderColor: 'hsl(28, 80%, 52%)', highlight: reviewCount > 0 },
    { label: 'Scheduled', count: scheduledCount, tab: 'Approved' as TabName, borderColor: 'hsl(168, 76%, 42%)' },
    { label: 'Published this month', count: publishedThisMonth, tab: null, borderColor: 'hsl(145, 63%, 42%)' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const isClickable = card.tab !== null;
          const Comp = isClickable ? 'button' : 'div';
          return (
            <Comp
              key={card.label}
              onClick={isClickable ? () => onTabChange(card.tab!) : undefined}
              className={`rounded-lg p-4 text-center transition-colors border-t-[3px] ${
                card.highlight
                  ? 'bg-accent/10 border-border shadow-sm'
                  : 'bg-card border-border shadow-sm'
              } ${isClickable ? 'hover:border-accent cursor-pointer' : ''}`}
              style={{ borderTopColor: card.borderColor }}
            >
              <div className={`text-2xl font-bold font-body ${card.highlight ? 'text-accent' : 'text-foreground'}`}>{card.count}</div>
              <div className={`text-xs font-body mt-1 ${card.highlight ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>
                {card.label}
              </div>
            </Comp>
          );
        })}
      </div>

      {/* 2. Needs Attention — collapsible per person */}
      <section>
        <h2 className="text-sm font-semibold font-body text-foreground mb-2">⚠️ Needs Your Attention ({needsClientAction.length})</h2>
        {needsClientGrouped.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body">Nothing needs your attention right now.</p>
        ) : (
          <div className="space-y-4">
            {needsClientGrouped.map(([person, items]) => {
              const isCollapsed = collapsedGroups[person];
              return (
                <div key={person}>
                  <button
                    onClick={() => toggleGroup(person)}
                    className="text-xs font-semibold font-body text-foreground mb-1 flex items-center gap-2 hover:text-accent transition-colors"
                  >
                    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                      {person === '__unassigned__' ? 'Not yet assigned' : person}
                    </span>
                    <span className="text-muted-foreground font-normal">{items.length} item{items.length > 1 ? 's' : ''}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-1 ml-5">
                      {items.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => onRequestClick(r)}
                          className="w-full text-left bg-card border border-border rounded px-3 py-2 flex items-center gap-3 hover:border-accent transition-colors"
                        >
                          <ContentTypeBadge label={r.content_type} />
                          <span className="text-sm font-body text-foreground flex-1 truncate">{r.title}</span>
                          <span className="text-xs text-destructive font-body flex-1 truncate">{r.what_needed_from_client}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
