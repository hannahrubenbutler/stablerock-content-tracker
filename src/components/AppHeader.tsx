const NAV_TABS = ['Dashboard', 'All Requests', 'Calendar', 'Assets'] as const;
const TABS = [...NAV_TABS, 'Submit'] as const;
export type TabName = typeof TABS[number];

interface AppHeaderProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  needsActionCount?: number;
}

export default function AppHeader({ activeTab, onTabChange, needsActionCount = 0 }: AppHeaderProps) {
  return (
    <header>
      <div className="bg-primary px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-primary-foreground text-lg font-bold tracking-wider">
            STABLE ROCK
          </h1>
          <span className="text-accent text-xs font-display">|</span>
          <span className="text-primary-foreground/70 text-xs font-body">Content Tracker 2026</span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-primary-foreground/50 text-xs font-body">Managed by</span>
          <span className="text-primary-foreground/70 text-xs font-body font-semibold">Archway Digital</span>
        </div>
      </div>
      {/* Border accent */}
      <div className="h-0.5 bg-accent" />
      {/* Tab navigation — horizontal scroll on mobile */}
      <nav className="bg-card border-b border-border overflow-x-auto">
        <div className="flex whitespace-nowrap items-center">
          {NAV_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-4 py-2.5 text-sm font-medium font-body transition-colors border-b-2 shrink-0 relative ${
                activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {tab === 'Dashboard' && needsActionCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {needsActionCount}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => onTabChange('Submit')}
            className="ml-auto mr-2 my-1.5 px-4 py-1.5 text-sm font-medium font-body bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors shrink-0"
          >
            + Submit
          </button>
        </div>
      </nav>
    </header>
  );
}

export { TABS };
