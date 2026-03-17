import { useMemo } from 'react';
import { Request, useRequests } from '@/hooks/useData';
import { STAGES, SERVICE_LINES, CONTENT_TYPES, SERVICE_LINE_COLORS, CONTENT_TYPE_COLORS, Stage } from '@/lib/constants';
import { ServiceLineBadge, ContentTypeBadge, PriorityDot } from '@/components/Badges';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, isWithinInterval, startOfWeek, endOfWeek, addWeeks } from 'date-fns';

interface DashboardProps {
  onRequestClick: (req: Request) => void;
  onStageFilter: (stage: Stage) => void;
}

export default function Dashboard({ onRequestClick, onStageFilter }: DashboardProps) {
  const { data: requests = [] } = useRequests();

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach((s) => (counts[s] = 0));
    requests.forEach((r) => { if (counts[r.stage] !== undefined) counts[r.stage]++; });
    return counts;
  }, [requests]);

  const thisWeek = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return requests.filter((r) => {
      if (!r.target_date || r.stage === 'Published') return false;
      const d = parseISO(r.target_date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    }).sort((a, b) => (a.target_date! > b.target_date! ? 1 : -1));
  }, [requests]);

  const nextWeek = useMemo(() => {
    const now = new Date();
    const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    return requests.filter((r) => {
      if (!r.target_date || r.stage === 'Published') return false;
      const d = parseISO(r.target_date);
      return isWithinInterval(d, { start: nextWeekStart, end: nextWeekEnd });
    }).sort((a, b) => (a.target_date! > b.target_date! ? 1 : -1));
  }, [requests]);

  const needsClientAction = useMemo(() => {
    return requests.filter(
      (r) => r.what_needed_from_client && r.what_needed_from_client.trim().length > 0 && r.stage !== 'Published'
    );
  }, [requests]);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 4 }, (_, i) => {
      const d = addMonths(startOfMonth(now), i);
      return { start: d, end: endOfMonth(d), label: format(d, 'MMM yyyy') };
    });
  }, []);

  const serviceLineMonthly = useMemo(() => {
    return SERVICE_LINES.map((sl) => ({
      name: sl,
      counts: months.map((m) =>
        requests.filter((r) => {
          if (r.service_line !== sl || !r.target_date) return false;
          const d = parseISO(r.target_date);
          return isWithinInterval(d, { start: m.start, end: m.end });
        }).length
      ),
    }));
  }, [requests, months]);

  const contentTypeMonthly = useMemo(() => {
    return CONTENT_TYPES.map((ct) => ({
      name: ct,
      counts: months.map((m) =>
        requests.filter((r) => {
          if (r.content_type !== ct || !r.target_date) return false;
          const d = parseISO(r.target_date);
          return isWithinInterval(d, { start: m.start, end: m.end });
        }).length
      ),
    }));
  }, [requests, months]);

  return (
    <div className="space-y-6">
      {/* Stage Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {STAGES.map((stage) => (
          <button
            key={stage}
            onClick={() => onStageFilter(stage)}
            className="bg-card border border-border rounded p-3 text-center hover:border-accent transition-colors"
          >
            <div className="text-2xl font-bold font-body text-foreground">{stageCounts[stage]}</div>
            <div className="text-xs text-muted-foreground font-body mt-1">{stage}</div>
          </button>
        ))}
      </div>

      {/* This Week */}
      <section>
        <h2 className="text-sm font-semibold font-body text-foreground mb-2">📅 This Week</h2>
        {thisWeek.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body">No content scheduled this week.</p>
        ) : (
          <div className="space-y-1">
            {thisWeek.map((r) => (
              <button
                key={r.id}
                onClick={() => onRequestClick(r)}
                className="w-full text-left bg-card border border-border rounded px-3 py-2 flex items-center gap-3 hover:border-accent transition-colors"
              >
                <PriorityDot priority={r.priority} />
                <ServiceLineBadge label={r.service_line} />
                <ContentTypeBadge label={r.content_type} />
                <span className="text-sm font-body text-foreground flex-1 truncate">{r.title}</span>
                <span className="text-xs text-muted-foreground font-body">{r.target_date && format(parseISO(r.target_date), 'EEE MMM d')}</span>
              </button>
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
                  {months.map((m) => (
                    <th key={m.label} className="px-3 py-2 text-center text-muted-foreground">{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {serviceLineMonthly.map((sl) => (
                  <tr key={sl.name} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-3 py-2">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: SERVICE_LINE_COLORS[sl.name] }} />
                      {sl.name}
                    </td>
                    {sl.counts.map((c, i) => (
                      <td key={i} className={`px-3 py-2 text-center font-medium ${c === 0 ? 'text-muted-foreground/40' : 'text-foreground'}`}>
                        {c || '–'}
                      </td>
                    ))}
                  </tr>
                ))}
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
                  {months.map((m) => (
                    <th key={m.label} className="px-3 py-2 text-center text-muted-foreground">{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contentTypeMonthly.map((ct) => (
                  <tr key={ct.name} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-3 py-2">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: CONTENT_TYPE_COLORS[ct.name] }} />
                      {ct.name}
                    </td>
                    {ct.counts.map((c, i) => (
                      <td key={i} className={`px-3 py-2 text-center font-medium ${c === 0 ? 'text-muted-foreground/40' : 'text-foreground'}`}>
                        {c || '–'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Needs Client Action */}
      <section>
        <h2 className="text-sm font-semibold font-body text-foreground mb-2">⚠️ Needs Client Action</h2>
        {needsClientAction.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body">Nothing needs your attention right now.</p>
        ) : (
          <div className="space-y-1">
            {needsClientAction.map((r) => (
              <button
                key={r.id}
                onClick={() => onRequestClick(r)}
                className="w-full text-left bg-card border border-border rounded px-3 py-2 flex items-center gap-3 hover:border-accent transition-colors"
              >
                <ContentTypeBadge label={r.content_type} />
                <span className="text-sm font-body text-foreground flex-1 truncate">{r.title}</span>
                <span className="text-xs text-muted-foreground font-body flex-1 truncate">{r.what_needed_from_client}</span>
                <span className="text-xs font-body text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">{r.stage}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
