import { useState, useMemo } from 'react';
import AppHeader, { TabName } from '@/components/AppHeader';
import Dashboard from '@/components/Dashboard';
import RequestsTab from '@/components/RequestsTab';
import ReviewTab from '@/components/ReviewTab';
import ApprovedTab from '@/components/ApprovedTab';
import SubmitForm from '@/components/SubmitForm';
import AdminSettings from '@/components/AdminSettings';
import DetailModal from '@/components/DetailModal';
import { Request, useRequests } from '@/hooks/useData';
import { getClientStatus } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabName>('Dashboard');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const { data: requests = [] } = useRequests();
  const { isAdmin } = useAuth();

  const reviewCount = useMemo(() => {
    return requests.filter((r) => {
      const cs = getClientStatus(r.stage);
      return cs.tab === 'review' && cs.label === 'Ready for Review';
    }).length;
  }, [requests]);

  const handleTabChange = (tab: TabName) => {
    if (tab === 'Settings' && !isAdmin) return;
    setActiveTab(tab);
  };

  const tabLabels: Record<string, string> = {
    'Dashboard': 'Dashboard',
    'Requests': 'Your Requests',
    'Review': 'Review',
    'Approved': 'Approved',
    'Submit': 'Submit a Request',
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader activeTab={activeTab} onTabChange={handleTabChange} reviewCount={reviewCount} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab !== 'Settings' && activeTab !== 'Dashboard' && (
          <h2 className="text-lg font-semibold font-body text-foreground mb-4">{tabLabels[activeTab] || activeTab}</h2>
        )}

        {activeTab === 'Dashboard' && (
          <Dashboard onRequestClick={setSelectedRequest} onTabChange={handleTabChange} />
        )}
        {activeTab === 'Requests' && (
          <RequestsTab onRequestClick={setSelectedRequest} />
        )}
        {activeTab === 'Review' && (
          <ReviewTab onRequestClick={setSelectedRequest} />
        )}
        {activeTab === 'Approved' && (
          <ApprovedTab onRequestClick={setSelectedRequest} />
        )}
        {activeTab === 'Submit' && (
          <SubmitForm onNavigateToRequests={() => setActiveTab('Requests')} />
        )}
        {activeTab === 'Settings' && isAdmin && <AdminSettings />}
      </main>

      {selectedRequest && (
        <DetailModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      )}
    </div>
  );
}
