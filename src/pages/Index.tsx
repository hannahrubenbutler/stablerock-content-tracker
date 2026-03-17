import { useState, useMemo } from 'react';
import AppHeader, { TabName } from '@/components/AppHeader';
import Dashboard from '@/components/Dashboard';
import AllRequests from '@/components/AllRequests';
import CalendarView from '@/components/CalendarView';
import SubmitForm from '@/components/SubmitForm';
import AssetsView from '@/components/AssetsView';
import DetailModal from '@/components/DetailModal';
import { Request, useRequests } from '@/hooks/useData';
import { Stage } from '@/lib/constants';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabName>('Dashboard');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [stageFilter, setStageFilter] = useState<Stage | null>(null);
  const { data: requests = [] } = useRequests();

  const needsActionCount = useMemo(() => {
    return requests.filter(
      (r) => r.what_needed_from_client && r.what_needed_from_client.trim().length > 0 && r.stage !== 'Published'
    ).length;
  }, [requests]);

  const handleStageFilter = (stage: Stage) => {
    setStageFilter(stage);
    setActiveTab('All Requests');
  };

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    if (tab !== 'All Requests') setStageFilter(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader activeTab={activeTab} onTabChange={handleTabChange} needsActionCount={needsActionCount} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-lg font-semibold font-body text-foreground mb-4">{activeTab}</h2>

        {activeTab === 'Dashboard' && (
          <Dashboard onRequestClick={setSelectedRequest} onStageFilter={handleStageFilter} />
        )}
        {activeTab === 'All Requests' && (
          <AllRequests onRequestClick={setSelectedRequest} initialStageFilter={stageFilter} />
        )}
        {activeTab === 'Calendar' && (
          <CalendarView onRequestClick={setSelectedRequest} />
        )}
        {activeTab === 'Submit' && (
          <SubmitForm onNavigateToRequests={() => setActiveTab('All Requests')} />
        )}
        {activeTab === 'Published' && (
          <PublishedView onRequestClick={setSelectedRequest} />
        )}
        {activeTab === 'Assets' && <AssetsView />}
      </main>

      {selectedRequest && (
        <DetailModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      )}
    </div>
  );
}
