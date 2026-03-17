import { useMemo } from 'react';
import { Request, useRequests } from '@/hooks/useData';
import { SERVICE_LINES, CONTENT_TYPES, SERVICE_LINE_COLORS, CONTENT_TYPE_COLORS, getClientStatus } from '@/lib/constants';
import { ServiceLineBadge, ContentTypeBadge, PriorityDot } from '@/components/Badges';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, isWithinInterval, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import ReadyForReview from '@/components/dashboard/ReadyForReview';
import { TabName } from '@/components/AppHeader';

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

  // Ready for review items
  const clientReviewRequests = useMemo(() => requests.filter((r) => {
    const cs = getClientStatus(r.stage);
    return cs.tab === 'review' && cs.label === 'Ready for Review';
  }), [requests]);

  // This / next week
  const thisWeek = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return requests.filter((r) => {
      if (!r.target_date || r.stage === 'Published') return false;
      return isWithinInterval(parseISO(r.target_date), { start: weekStart, end: weekEnd });
    }).sort((a, b) => a.target_date! > b.target_date! ? 1 : -1);
  }, [requests]);

  const nextWeek = useMemo(() => {
    const now = new Date();
    const nwStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    const nwEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    return requests.filter((r) => {
      if (!r.target_date || r.stage === 'Published') return false;
      return isWithinInterval(parseISO(r.target_date), { start: nwStart, end: nwEnd });
    }).sort((a, b) => a.target_date! > b.target_date! ? 1 : -1);
  }, [requests]);

  // Needs attention
  const needsClientAction = useMemo(() => {
    return requests.filter((r) => r.what_needed_from_client?.trim() && r.stage !== 'Published');
  }, [requests]);

  const needsClientGrouped = useMemo(() => {
    const groups: Record<string, Request[]> = {};
    needsClientAction.forEach((r) => {
      const person = (r as any).contact_person || r.owner || 'Unassigned';
      if (!groups[person]) groups[person] = [];
      groups[person].push(r);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [needsClientAction]);

  // Monthly grids
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 4 }, (_, i) => {
      const d = addMonths(startOfMonth(now), i);
      return { start: d, end: endOfMonth(d), label: format(d, 'MMM yyyy') };
    });
  }, []);

  const serviceLineMonthly = useMemo(() => SERVICE_LINES.map((sl) => ({
    name: sl,
    counts: months.map((m) => requests.filter((r) => r.service_line === sl && r.target_date && isWithinInterval(parseISO(r.target_date), { start: m.start, end: m.end })).length),
  })), [requests, months]);

  const contentTypeMonthly = useMemo(() => CONTENT_TYPES.map((ct) => ({
    name: ct,
    counts: months.map((m) => requests.filter((r) => r.content_type === ct && r.target_date && isWithinInterval(parseISO(r.target_date), { start: m.start, end: m.end })).length),
  })), [requests, months]);

  const computeRowTotal = (counts: number[]) => counts.reduce((a, b) => a + b, 0);
  const computeColumnTotals = (rows: { counts: number[] }[]) => {
    if (rows.length === 0) return [];
    return rows[0].counts.map((_, colIdx) => rows.reduce((sum, row) => sum + row.counts[colIdx], 0));
  };
  const slColumnTotals = useMemo(() => computeColumnTotals(serviceLineMonthly), [serviceLineMonthly]);
  const ctColumnTotals = useMemo(() => computeColumnTotals(contentTypeMonthly), [contentTypeMonthly]);

  const renderWeekItem = (r: Request) => {
    const cs = getClientStatus(r.stage);
    return (
      <button
        key={r.id}
        onClick={() => onRequestClick(r)}
        className="w-full text-left bg-card border border-border rounded px-3 py-2 hover:border-accent transition-colors"
      >
        <div className="flex items-center gap-3">
          <PriorityDot priority={r.priority} />
          <ServiceLineBadge label={r.service_line} />
          <ContentTypeBadge label={r.content_type} />
          <span className="text-sm font-body text-foreground flex-1 truncate">{r.title}</span>
          <span
            className="text-[10px] font-body font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
            style={{ backgroundColor: cs.color }}
          >
            {cs.label}
          </span>
          <span className="text-xs text-muted-foreground font-body shrink-0">{r.target_date && format(parseISO(r.target_date), 'EEE MMM d')}</span>
        </div>
        {r.what_needed_from_client && (
          <div className="ml-8 mt-1 text-[11px] font-body text-destructive">
            ⚠ {r.what_needed_from_client}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button onClick={() => onTabChange('Requests')} className="bg-card border border-border rounded-lg p-4 text-center hover:border-accent transition-colors">
          <div className="text-2xl font-bold font-body text-foreground">{inProgressCount}</div>
          <div className="text-xs text-muted-foreground font-body mt-1">Requests in progress</div>
        </button>
        <button onClick={() => onTabChange('Review')} className={`border rounded-lg p-4 text-center hover:border-accent transition-colors ${reviewCount > 0 ? 'bg-[#E67E22]/10 border-[#E67E22]/30' : 'bg-card border-border'}`}>
          <div className={`text-2xl font-bold font-body ${reviewCount > 0 ? 'text-[#E67E22]' : 'text-foreground'}`}>{reviewCount}</div>
          <div className={`text-xs font-body mt-1 ${reviewCount > 0 ? 'text-[#E67E22] font-semibold' : 'text-muted-foreground'}`}>
            {reviewCount > 0 ? 'Ready for review ⚡' : 'Ready for review'}
          </div>
        </button>
        <button onClick={() => onTabChange('Approved')} className="bg-card border border-border rounded-lg p-4 text-center hover:border-accent transition-colors">
          <div className="text-2xl font-bold font-body text-foreground">{scheduledCount}</div>
          <div className="text-xs text-muted-foreground font-body mt-1">Scheduled</div>
        </button>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold font-body text-[#27AE60]">{publishedThisMonth}</div>
          <div className="text-xs text-muted-foreground font-body mt-1">Published this month</div>
        </div>
      </div>

      {/* 2. Ready for Review */}
      <ReadyForReview requests={clientReviewRequests} onRequestClick={onRequestClick} />

      {/* 3. This Week */}
      <section>
        <h2 className="text-sm font-semibold font-body text-foreground mb-2">📅 This Week</h2>
        {thisWeek.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body">Nothing scheduled this week.</p>
        ) : (
          <div className="space-y-1">{thisWeek.map(renderWeekItem)}</div>
        )}
      </section>

      {/* 4. Next Week */}
      <section>
        <h2 className="text-sm font-semibold font-body text-foreground mb-2">📋 Next Week</h2>
        {nextWeek.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body">Nothing scheduled next week.</p>
        ) : (
          <div className="space-y-1">{nextWeek.map(renderWeekItem)}</div>
        )}
      </section>

      {/* 5. Needs Attention */}
      <section>
        <h2 className="text-sm font-semibold font-body text-foreground mb-2">⚠️ Needs Your Attention ({needsClientAction.length})</h2>
        {needsClientGrouped.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body">Nothing needs your attention right now.</p>
        ) : (
          <div className="space-y-4">
            {needsClientGrouped.map(([person, items]) => (
              <div key={person}>
                <h3 className="text-xs font-semibold font-body text-foreground mb-1 flex items-center gap-2">
                  <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded">{person}</span>
                  <span className="text-muted-foreground font-normal">{items.length} item{items.length > 1 ? 's' : ''}</span>
                </h3>
                <div className="space-y-1">
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
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Monthly Grids */}
      <div className="grid md:grid-cols-2 gap-4">
        <section>
          <h2 className="text-sm font-semibold font-body text-foreground mb-2">By Service Line</h2>
          <div className="bg-card border border-border rounded overflow-x-auto">
            <table className="w-full text-xs font-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-muted-foreground">Service Line</th>
                  {months.map((m) => <th key={m.label} className="px-3 py-2 text-center text-muted-foreground">{m.label}</th>)}
                  <th className="px-3 py-2 text-center text-muted-foreground font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {serviceLineMonthly.map((sl) => {
                  const total = computeRowTotal(sl.counts);
                  return (
                    <tr key={sl.name} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="px-3 py-2">
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: SERVICE_LINE_COLORS[sl.name] }} />
                        {sl.name}
                      </td>
                      {sl.counts.map((c, i) => (
                        <td key={i} className={`px-3 py-2 text-center font-medium ${c === 0 ? 'text-muted-foreground/40 bg-destructive/5' : 'text-foreground'}`}>{c || '–'}</td>
                      ))}
                      <td className="px-3 py-2 text-center font-bold text-foreground">{total}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-3 py-2 font-semibold text-foreground">Total</td>
                  {slColumnTotals.map((t, i) => <td key={i} className="px-3 py-2 text-center font-bold text-foreground">{t}</td>)}
                  <td className="px-3 py-2 text-center font-bold text-foreground">{slColumnTotals.reduce((a, b) => a + b, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold font-body text-foreground mb-2">By Content Type</h2>
          <div className="bg-card border border-border rounded overflow-x-auto">
            <table className="w-full text-xs font-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-muted-foreground">Content Type</th>
                  {months.map((m) => <th key={m.label} className="px-3 py-2 text-center text-muted-foreground">{m.label}</th>)}
                  <th className="px-3 py-2 text-center text-muted-foreground font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {contentTypeMonthly.map((ct) => {
                  const total = computeRowTotal(ct.counts);
                  return (
                    <tr key={ct.name} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="px-3 py-2">
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: CONTENT_TYPE_COLORS[ct.name] }} />
                        {ct.name}
                      </td>
                      {ct.counts.map((c, i) => (
                        <td key={i} className={`px-3 py-2 text-center font-medium ${c === 0 ? 'text-muted-foreground/40 bg-destructive/5' : 'text-foreground'}`}>{c || '–'}</td>
                      ))}
                      <td className="px-3 py-2 text-center font-bold text-foreground">{total}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-3 py-2 font-semibold text-foreground">Total</td>
                  {ctColumnTotals.map((t, i) => <td key={i} className="px-3 py-2 text-center font-bold text-foreground">{t}</td>)}
                  <td className="px-3 py-2 text-center font-bold text-foreground">{ctColumnTotals.reduce((a, b) => a + b, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
