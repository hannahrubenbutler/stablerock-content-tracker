import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];
export type Request = Tables['requests']['Row'];
type RequestInsert = Tables['requests']['Insert'];
type RequestUpdate = Tables['requests']['Update'];
export type Asset = Tables['assets']['Row'];
type AssetInsert = Tables['assets']['Insert'];
type AssetUpdate = Tables['assets']['Update'];
export type Comment = Tables['comments']['Row'];
type CommentInsert = Tables['comments']['Insert'];
export type FileReference = Tables['file_references']['Row'];

export function useRequests() {
  return useQuery({
    queryKey: ['requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: RequestInsert) => {
      const { data, error } = await supabase.from('requests').insert(req).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  });
}

export function useUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: RequestUpdate & { id: string }) => {
      const { data, error } = await supabase.from('requests').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  });
}

export function useDeleteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  });
}

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (asset: AssetInsert) => {
      const { data, error } = await supabase.from('assets').insert(asset).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: AssetUpdate & { id: string }) => {
      const { data, error } = await supabase.from('assets').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useComments(requestId: string) {
  return useQuery({
    queryKey: ['comments', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!requestId,
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comment: CommentInsert) => {
      const { data, error } = await supabase.from('comments').insert(comment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['comments', vars.request_id] }),
  });
}

export function useFileReferences(requestId: string) {
  return useQuery({
    queryKey: ['files', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_references')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!requestId,
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, file, uploadedBy }: { requestId: string; file: File; uploadedBy: string }) => {
      const filePath = `${requestId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
      if (uploadError) {
        console.error('useUploadFile storage upload failed', { requestId, fileName: file.name, uploadError });
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);

      const { data, error } = await supabase.from('file_references').insert({
        request_id: requestId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        uploaded_by: uploadedBy,
      }).select().single();
      if (error) {
        console.error('useUploadFile file reference insert failed', { requestId, fileName: file.name, error });
        throw error;
      }
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['files', data.request_id] }),
  });
}

// Creatives
export type Creative = {
  id: string;
  request_id: string;
  version: number;
  graphic_url: string | null;
  graphic_file_name: string | null;
  caption: string | null;
  platform: string;
  scheduled_datetime: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  feedback: string | null;
  attachment_url: string | null;
  attachment_file_name: string | null;
  created_at: string;
  updated_at: string;
};

export function useCreatives(requestId: string) {
  return useQuery({
    queryKey: ['creatives', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creatives')
        .select('*')
        .eq('request_id', requestId)
        .order('version', { ascending: true });
      if (error) throw error;
      return data as Creative[];
    },
    enabled: !!requestId,
  });
}

export function useLatestCreative(requestId: string) {
  return useQuery({
    queryKey: ['creatives', requestId, 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creatives')
        .select('*')
        .eq('request_id', requestId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Creative | null;
    },
    enabled: !!requestId,
  });
}

export function useCreateCreative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (creative: { request_id: string; version: number; graphic_url?: string; graphic_file_name?: string; caption?: string; platform?: string; scheduled_datetime?: string; status?: string }) => {
      const { data, error } = await supabase.from('creatives').insert(creative as any).select().single();
      if (error) throw error;
      return data as Creative;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['creatives', data.request_id] });
    },
  });
}

export function useUpdateCreative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('creatives').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Creative;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['creatives', data.request_id] });
    },
  });
}

export function useUploadCreativeGraphic() {
  return useMutation({
    mutationFn: async ({ requestId, file }: { requestId: string; file: File }) => {
      const filePath = `creatives/${requestId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
      return { publicUrl, fileName: file.name };
    },
  });
}

// Batch fetch comment and file counts for all requests
export function useRequestMetaCounts() {
  return useQuery({
    queryKey: ['request-meta-counts'],
    queryFn: async () => {
      const [commentsRes, filesRes] = await Promise.all([
        supabase.from('comments').select('request_id'),
        supabase.from('file_references').select('request_id'),
      ]);

      const commentCounts: Record<string, number> = {};
      const fileCounts: Record<string, number> = {};

      (commentsRes.data || []).forEach((c) => {
        commentCounts[c.request_id] = (commentCounts[c.request_id] || 0) + 1;
      });
      (filesRes.data || []).forEach((f) => {
        fileCounts[f.request_id] = (fileCounts[f.request_id] || 0) + 1;
      });

      return { commentCounts, fileCounts };
    },
  });
}
