import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to Supabase realtime changes on requests, creatives, and comments
 * and invalidates the corresponding React Query caches.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('global-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['requests'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creatives' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['creatives'] });
        queryClient.invalidateQueries({ queryKey: ['creative-thumbnails'] });
        queryClient.invalidateQueries({ queryKey: ['creative-check'] });
        queryClient.invalidateQueries({ queryKey: ['review-count'] });
        queryClient.invalidateQueries({ queryKey: ['approved-creative-info'] });
        if (payload.new && (payload.new as any).request_id) {
          queryClient.invalidateQueries({ queryKey: ['creatives', (payload.new as any).request_id] });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['request-meta-counts'] });
        if (payload.new && (payload.new as any).request_id) {
          queryClient.invalidateQueries({ queryKey: ['comments', (payload.new as any).request_id] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
