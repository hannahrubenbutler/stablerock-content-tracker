import { useAuth } from '@/hooks/useAuth';
import { Settings, LogOut } from 'lucide-react';

const NAV_TABS = ['Dashboard', 'Requests', 'Review', 'Approved'] as const;

const ALL_TABS = ['Dashboard', 'Requests', 'Review', 'Approved', 'Submit', 'Settings'] as const;
export type TabName = (typeof ALL_TABS)[number];

interface AppHeaderProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  reviewCount?: number;
}

export default function AppHeader({ activeTab, onTabChange, reviewCount = 0 }: AppHeaderProps) {
  const { isAdmin, profile, signOut } = useAuth();

  return (
    <header>
      <div className="bg-primary px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-primary-foreground text-lg font-bold tracking-wider">
            STABLE ROCK
          </h1>
          <span className="text-accent text-xs font-display">|</span>
          <span className="text-primary-foreground/70 text-xs font-body">Content Hub</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-primary-foreground/50 text-xs font-body hidden md:inline">
            {profile?.full_name ?? profile?.email}
          </span>
          {isAdmin && (
            <button
              onClick={() => onTabChange('Settings')}
              className={`transition-colors ${
                activeTab === 'Settings'
                  ? 'text-accent'
                  : 'text-primary-foreground/60 hover:text-primary-foreground'
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={signOut}
            className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Border accent */}
      <div className="h-0.5 bg-accent" />
      {/* Tab navigation */}
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
              {tab === 'Review' && reviewCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {reviewCount}
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

export { ALL_TABS as TABS };
