import { useState } from 'react';
import { Request } from '@/hooks/useData';
import { SERVICE_LINES, CONTENT_TYPES } from '@/lib/constants';
import ContentListView from '@/components/content/ContentListView';
import ContentCalendarView from '@/components/content/ContentCalendarView';
import ContentOverviewView from '@/components/content/ContentOverviewView';
import { List, CalendarDays, BarChart3 } from 'lucide-react';

type ContentViewMode = 'list' | 'calendar' | 'overview';

interface ContentTabProps {
  onRequestClick: (req: Request) => void;
}

export default function ContentTab({ onRequestClick }: ContentTabProps) {
  const [viewMode, setViewMode] = useState<ContentViewMode>('calendar');
  const [serviceFilter, setServiceFilter] = useState('');
  const [contentFilter, setContentFilter] = useState('');

  const inputClass = "text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground";

  const views: { key: ContentViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'list', label: 'List', icon: <List className="w-3.5 h-3.5" /> },
    { key: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* View toggle + shared filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex bg-muted rounded-full p-0.5">
          {views.map((v) => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`flex items-center gap-1.5 text-xs font-body font-medium px-3 py-1.5 rounded-full transition-colors ${
                viewMode === v.key
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>

        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className={inputClass}>
          <option value="">All Service Lines</option>
          {SERVICE_LINES.map((sl) => <option key={sl} value={sl}>{sl}</option>)}
        </select>
        <select value={contentFilter} onChange={(e) => setContentFilter(e.target.value)} className={inputClass}>
          <option value="">All Content Types</option>
          {CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
        </select>
        {(serviceFilter || contentFilter) && (
          <button onClick={() => { setServiceFilter(''); setContentFilter(''); }} className="text-xs font-body text-accent hover:underline">
            Clear
          </button>
        )}
      </div>

      {/* Views */}
      {viewMode === 'list' && (
        <ContentListView
          onRequestClick={onRequestClick}
          serviceFilter={serviceFilter}
          contentFilter={contentFilter}
        />
      )}
      {viewMode === 'calendar' && (
        <ContentCalendarView
          onRequestClick={onRequestClick}
          serviceFilter={serviceFilter}
          contentFilter={contentFilter}
        />
      )}
      {viewMode === 'overview' && (
        <ContentOverviewView
          serviceFilter={serviceFilter}
          contentFilter={contentFilter}
        />
      )}
    </div>
  );
}
