import { useMemo, useState } from 'react';
import { Request, useRequests } from '@/hooks/useData';
import { CONTENT_TYPE_COLORS, SERVICE_LINE_COLORS, SERVICE_LINES } from '@/lib/constants';
import { ContentTypeBadge } from '@/components/Badges';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO,
  addMonths, subMonths, isToday,
} from 'date-fns';

interface CalendarViewProps {
  onRequestClick: (req: Request) => void;
}

export default function CalendarView({ onRequestClick }: CalendarViewProps) {
  const { data: requests = [] } = useRequests();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
    const startPad = getDay(start);
    return { allDays, startPad };
  }, [currentMonth]);

  const requestsByDate = useMemo(() => {
    const map: Record<string, Request[]> = {};
    requests.forEach((r) => {
      if (!r.target_date) return;
      const key = r.target_date;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [requests]);

  const monthRequests = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return requests.filter((r) => {
      if (!r.target_date) return false;
      const d = parseISO(r.target_date);
      return d >= start && d <= end;
    });
  }, [requests, currentMonth]);

  const groupedByService = useMemo(() => {
    const groups: Record<string, Request[]> = {};
    SERVICE_LINES.forEach((sl) => { groups[sl] = []; });
    monthRequests.forEach((r) => {
      if (groups[r.service_line]) groups[r.service_line].push(r);
    });
    return Object.entries(groups).filter(([, reqs]) => reqs.length > 0);
  }, [monthRequests]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-sm font-body text-muted-foreground hover:text-foreground px-2 py-1">← Prev</button>
        <h2 className="text-lg font-semibold font-body text-foreground">{format(currentMonth, 'MMMM yyyy')}</h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-sm font-body text-muted-foreground hover:text-foreground px-2 py-1">Next →</button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card border border-border rounded">
        <div className="grid grid-cols-7">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs font-medium font-body text-muted-foreground py-2 border-b border-border">{d}</div>
          ))}
          {Array.from({ length: days.startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-border bg-muted/30" />
          ))}
          {days.allDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayReqs = requestsByDate[key] || [];
            return (
              <div key={key} className={`min-h-[80px] border-b border-r border-border p-1 ${isToday(day) ? 'bg-accent/10' : ''}`}>
                <div className={`text-xs font-body mb-1 ${isToday(day) ? 'text-accent font-bold' : 'text-muted-foreground'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayReqs.slice(0, 3).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onRequestClick(r)}
                      className="w-full text-left text-[10px] font-body rounded px-1 py-0.5 truncate block"
                      style={{
                        backgroundColor: CONTENT_TYPE_COLORS[r.content_type] || '#6B7280',
                        borderLeft: `3px solid ${SERVICE_LINE_COLORS[r.service_line] || '#6B7280'}`,
                        color: '#fff',
                      }}
                    >
                      {r.title}
                    </button>
                  ))}
                  {dayReqs.length > 3 && (
                    <div className="text-[10px] text-muted-foreground font-body px-1">+{dayReqs.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grouped by Service Line */}
      {groupedByService.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold font-body text-foreground mb-3">Scheduled This Month by Service Line</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupedByService.map(([sl, reqs]) => (
              <div key={sl} className="bg-card border border-border rounded p-3" style={{ borderLeftWidth: 4, borderLeftColor: SERVICE_LINE_COLORS[sl] }}>
                <h3 className="text-xs font-semibold font-body text-foreground mb-2">{sl} ({reqs.length})</h3>
                <div className="space-y-1.5">
                  {reqs.map((r) => (
                    <button key={r.id} onClick={() => onRequestClick(r)} className="w-full text-left text-xs font-body text-muted-foreground hover:text-foreground flex items-center gap-2">
                      <ContentTypeBadge label={r.content_type} />
                      <span className="truncate flex-1">{r.title}</span>
                      <span className="shrink-0 text-[10px]">{r.target_date && format(parseISO(r.target_date), 'MMM d')}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
