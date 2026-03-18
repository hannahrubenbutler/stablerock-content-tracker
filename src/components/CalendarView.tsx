import { useMemo, useState } from 'react';
import { Request, useRequests } from '@/hooks/useData';
import { CONTENT_TYPE_COLORS, CONTENT_TYPE_ABBR, CONTENT_TYPES, SERVICE_LINE_COLORS, SERVICE_LINES, STAGE_COLORS, getClientStatus } from '@/lib/constants';
import { ContentTypeBadge } from '@/components/Badges';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO,
  addMonths, subMonths, isToday, isWithinInterval,
} from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CalendarViewProps {
  onRequestClick: (req: Request) => void;
}

export default function CalendarView({ onRequestClick }: CalendarViewProps) {
  const { data: requests = [] } = useRequests();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [personFilter, setPersonFilter] = useState<string>('');

  const people = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.owner) set.add(r.owner);
      if (r.submitter_name) set.add(r.submitter_name);
      if ((r as any).contact_person) set.add((r as any).contact_person);
    });
    return Array.from(set).sort();
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (serviceFilter && r.service_line !== serviceFilter) return false;
      if (personFilter && r.owner !== personFilter && r.submitter_name !== personFilter && (r as any).contact_person !== personFilter) return false;
      return true;
    });
  }, [requests, serviceFilter, personFilter]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
    const startPad = getDay(start);
    return { allDays, startPad };
  }, [currentMonth]);

  const requestsByDate = useMemo(() => {
    const map: Record<string, Request[]> = {};
    filteredRequests.forEach((r) => {
      if (!r.target_date) return;
      const key = r.target_date;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [filteredRequests]);

  const monthRequests = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return filteredRequests.filter((r) => {
      if (!r.target_date) return false;
      const d = parseISO(r.target_date);
      return d >= start && d <= end;
    });
  }, [filteredRequests, currentMonth]);

  const groupedByService = useMemo(() => {
    const groups: Record<string, Request[]> = {};
    SERVICE_LINES.forEach((sl) => { groups[sl] = []; });
    monthRequests.forEach((r) => {
      if (groups[r.service_line]) groups[r.service_line].push(r);
    });
    return Object.entries(groups).filter(([, reqs]) => reqs.length > 0);
  }, [monthRequests]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderRangeBadge = (r: Request) => {
    const req = r as any;
    if (req.date_mode === 'range' && req.date_range_end) {
      return (
        <span className="ml-0.5 text-[8px] opacity-80">
          →{format(parseISO(req.date_range_end), 'M/d')}
        </span>
      );
    }
    return null;
  };

  const getStageDotColor = (stage: string) => {
    if (stage === 'Requested' || stage === 'Needs Info') return '#95A5A6';
    if (stage === 'In Progress' || stage === 'In Simplified') return '#F1C40F';
    if (stage === 'Approved' || stage === 'Scheduled' || stage === 'Published') return '#27AE60';
    return STAGE_COLORS[stage] || '#6B7280';
  };

  const hasActiveFilter = serviceFilter || personFilter;

  return (
    <div className="space-y-6">
      {/* Month navigation + filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-sm font-body text-muted-foreground hover:text-foreground px-2 py-1">← Prev</button>
          <h2 className="text-lg font-semibold font-body text-foreground">{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-sm font-body text-muted-foreground hover:text-foreground px-2 py-1">Next →</button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground">
            <option value="">All Service Lines</option>
            {SERVICE_LINES.map((sl) => <option key={sl} value={sl}>{sl}</option>)}
          </select>
          <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} className="text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground">
            <option value="">All People</option>
            {people.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {hasActiveFilter && (
            <button onClick={() => { setServiceFilter(''); setPersonFilter(''); }} className="text-xs font-body text-accent hover:underline">
              Clear filters
            </button>
          )}
        </div>
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
            const today = isToday(day);
            const hasOverflow = dayReqs.length > 3;
            return (
              <div key={key} className={`min-h-[80px] border-b border-r border-border p-1 ${today ? 'bg-accent/10' : ''}`}>
                <div className={`text-xs font-body mb-1 flex items-center gap-1 ${today ? 'text-accent font-bold' : 'text-muted-foreground'}`}>
                  {format(day, 'd')}
                  {today && <span className="text-[9px] bg-accent text-accent-foreground px-1 rounded">Today</span>}
                </div>
                <div className="space-y-0.5">
                  {dayReqs.slice(0, 3).map((r) => {
                    const abbr = CONTENT_TYPE_ABBR[r.content_type] || '';
                    return (
                      <button
                        key={r.id}
                        onClick={() => onRequestClick(r)}
                        className="w-full text-left text-[10px] font-body rounded px-1 py-0.5 truncate block relative"
                        style={{
                          backgroundColor: CONTENT_TYPE_COLORS[r.content_type] || '#6B7280',
                          borderLeft: `3px solid ${SERVICE_LINE_COLORS[r.service_line] || '#6B7280'}`,
                          color: '#fff',
                        }}
                      >
                        <span className="font-bold mr-0.5">{abbr}</span>
                        {r.title}
                        {renderRangeBadge(r)}
                        <span
                          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getStageDotColor(r.stage) }}
                          title={r.stage}
                        />
                      </button>
                    );
                  })}
                  {/* #12: Popover for overflow items */}
                  {hasOverflow && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-[10px] text-muted-foreground font-body px-1 hover:text-accent">
                          +{dayReqs.length - 3} more
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2 space-y-1" align="start">
                        <p className="text-xs font-semibold font-body text-foreground mb-1.5">{format(day, 'EEEE, MMM d')}</p>
                        {dayReqs.map((r) => {
                          const cs = getClientStatus(r.stage);
                          return (
                            <button
                              key={r.id}
                              onClick={() => onRequestClick(r)}
                              className="w-full text-left text-xs font-body text-foreground hover:text-accent flex items-center gap-2 py-1 border-b border-border last:border-0"
                            >
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cs.color }} />
                              <span className="truncate flex-1">{r.title}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">{cs.label}</span>
                            </button>
                          );
                        })}
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty month state */}
      {monthRequests.length === 0 && (
        <p className="text-sm text-muted-foreground font-body py-4 text-center">
          No content scheduled for {format(currentMonth, 'MMMM yyyy')}{hasActiveFilter ? ' matching your filters' : ''}. Submit a request to get started.
        </p>
      )}

      {/* Grouped by Service Line */}
      {groupedByService.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold font-body text-foreground mb-3">Scheduled This Month by Service Line</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupedByService.map(([sl, reqs]) => (
              <div key={sl} className="bg-card border border-border rounded p-3" style={{ borderLeftWidth: 4, borderLeftColor: SERVICE_LINE_COLORS[sl] }}>
                <h3 className="text-xs font-semibold font-body text-foreground mb-2 flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SERVICE_LINE_COLORS[sl] }} />
                  {sl} ({reqs.length})
                </h3>
                <div className="space-y-1.5">
                  {reqs.map((r) => {
                    const rr = r as any;
                    return (
                      <button key={r.id} onClick={() => onRequestClick(r)} className="w-full text-left text-xs font-body text-muted-foreground hover:text-foreground flex items-center gap-2">
                        <ContentTypeBadge label={r.content_type} />
                        <span className="truncate flex-1">{r.title}</span>
                        <span className="shrink-0 text-[10px]">
                          {r.target_date && format(parseISO(r.target_date), 'MMM d')}
                          {rr.date_mode === 'range' && rr.date_range_end && ` – ${format(parseISO(rr.date_range_end), 'MMM d')}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
