import { useState, useMemo } from 'react';
import AppHeader, { TabName } from '@/components/AppHeader';
import Dashboard from '@/components/Dashboard';
import RequestsTab from '@/components/RequestsTab';
import ReviewTab from '@/components/ReviewTab';
import ApprovedTab from '@/components/ApprovedTab';
import AdminSettings from '@/components/AdminSettings';
import DetailModal from '@/components/DetailModal';
import { Request, useRequests } from '@/hooks/useData';
import { getClientStatus } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabName>('Dashboard');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const { data: requests = [] } = useRequests();
  const { isAdmin } = useAuth();

  // Get review-eligible request IDs (stage = Client Review / Creative Uploaded)
  const reviewCandidateIds = useMemo(() => {
    return requests
      .filter((r) => {
        const cs = getClientStatus(r.stage);
        return cs.tab === 'review' && cs.label === 'Ready for Review';
      })
      .map((r) => r.id);
  }, [requests]);

  // Only count those that actually have a creative with a graphic
  const { data: reviewCount = 0 } = useQuery({
    queryKey: ['review-count', reviewCandidateIds],
    queryFn: async () => {
      if (reviewCandidateIds.length === 0) return 0;
      const { data, error } = await supabase
        .from('creatives')
        .select('request_id')
        .in('request_id', reviewCandidateIds)
        .not('graphic_url', 'is', null);
      if (error) throw error;
      const unique = new Set((data || []).map((c: any) => c.request_id));
      return unique.size;
    },
    enabled: reviewCandidateIds.length > 0,
  });

  const handleTabChange = (tab: TabName) => {
    if (tab === 'Settings' && !isAdmin) return;
    setActiveTab(tab);
  };

  const tabLabels: Record<string, string> = {
    'Dashboard': 'Dashboard',
    'Requests': 'Your Requests',
    'Review': 'Review',
    'Approved': 'Approved',
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
        {activeTab === 'Settings' && isAdmin && <AdminSettings />}
      </main>

      {selectedRequest && (
        <DetailModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      )}
    </div>
  );
}
