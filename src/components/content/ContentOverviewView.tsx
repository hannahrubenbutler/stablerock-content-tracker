import { useMemo } from 'react';
import { useRequests } from '@/hooks/useData';
import { SERVICE_LINES, CONTENT_TYPES, SERVICE_LINE_COLORS, CONTENT_TYPE_COLORS } from '@/lib/constants';
import {
  format, startOfMonth, endOfMonth, addMonths, parseISO, isWithinInterval,
} from 'date-fns';

interface ContentOverviewViewProps {
  serviceFilter: string;
  contentFilter: string;
}

export default function ContentOverviewView({ serviceFilter, contentFilter }: ContentOverviewViewProps) {
  const { data: requests = [] } = useRequests();

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (serviceFilter && r.service_line !== serviceFilter) return false;
      if (contentFilter && r.content_type !== contentFilter) return false;
      return true;
    });
  }, [requests, serviceFilter, contentFilter]);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 4 }, (_, i) => {
      const d = addMonths(startOfMonth(now), i);
      return { start: d, end: endOfMonth(d), label: format(d, 'MMM yyyy') };
    });
  }, []);

  const serviceLineMonthly = useMemo(() => SERVICE_LINES.map((sl) => ({
    name: sl,
    counts: months.map((m) => filteredRequests.filter((r) => r.service_line === sl && r.target_date && isWithinInterval(parseISO(r.target_date), { start: m.start, end: m.end })).length),
  })), [filteredRequests, months]);

  const contentTypeMonthly = useMemo(() => CONTENT_TYPES.map((ct) => ({
    name: ct,
    counts: months.map((m) => filteredRequests.filter((r) => r.content_type === ct && r.target_date && isWithinInterval(parseISO(r.target_date), { start: m.start, end: m.end })).length),
  })), [filteredRequests, months]);

  const computeRowTotal = (counts: number[]) => counts.reduce((a, b) => a + b, 0);
  const computeColumnTotals = (rows: { counts: number[] }[]) => {
    if (rows.length === 0) return [];
    return rows[0].counts.map((_, colIdx) => rows.reduce((sum, row) => sum + row.counts[colIdx], 0));
  };
  const slColumnTotals = useMemo(() => computeColumnTotals(serviceLineMonthly), [serviceLineMonthly]);
  const ctColumnTotals = useMemo(() => computeColumnTotals(contentTypeMonthly), [contentTypeMonthly]);

  return (
    <div className="space-y-6">
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
                <tr className="border-t-2 border-border bg-muted/50">
                  <td className="px-3 py-2 font-bold text-foreground">Total</td>
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
                <tr className="border-t-2 border-border bg-muted/50">
                  <td className="px-3 py-2 font-bold text-foreground">Total</td>
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
