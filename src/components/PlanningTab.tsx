import { useState } from 'react';
import { Request } from '@/hooks/useData';
import { SERVICE_LINES, CONTENT_TYPES } from '@/lib/constants';
import ContentCalendarView from '@/components/content/ContentCalendarView';
import ContentOverviewView from '@/components/content/ContentOverviewView';

interface PlanningTabProps {
  onRequestClick: (req: Request) => void;
}

export default function PlanningTab({ onRequestClick }: PlanningTabProps) {
  const [serviceFilter, setServiceFilter] = useState('');
  const [contentFilter, setContentFilter] = useState('');

  const inputClass = "text-xs font-body bg-card border border-border rounded px-2 py-1.5 text-foreground";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        <h2 className="text-lg font-semibold font-body text-foreground mr-4">Content Calendar</h2>
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

      <ContentCalendarView
        onRequestClick={onRequestClick}
        serviceFilter={serviceFilter}
        contentFilter={contentFilter}
      />

      <ContentOverviewView
        serviceFilter={serviceFilter}
        contentFilter={contentFilter}
      />
    </div>
  );
}
