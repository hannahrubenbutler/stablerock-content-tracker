import { useState, useRef, useMemo, useEffect } from 'react';
import { Request, useUpdateRequest, useDeleteRequest, useCreateRequest, useComments, useCreateComment, useFileReferences, useUploadFile, useAssets } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ServiceLineBadge, ContentTypeBadge, PriorityDot } from '@/components/Badges';
import { STAGES, SERVICE_LINES, CONTENT_TYPES, STAGE_COLORS, OWNER_OPTIONS, getClientStatus } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import CreativeTab from '@/components/CreativeTab';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DetailModalProps {
  request: Request;
  onClose: () => void;
  onRequestClick?: (req: Request) => void;
}

type ModalTab = 'Details' | 'Creative' | 'Files & Comments';

export default function DetailModal({ request, onClose, onRequestClick }: DetailModalProps) {
  const { isAdmin, profile } = useAuth();
  const updateRequest = useUpdateRequest();
  const deleteRequest = useDeleteRequest();
  const createRequest = useCreateRequest();
  const { data: comments = [] } = useComments(request.id);
  const createComment = useCreateComment();
  const { data: files = [] } = useFileReferences(request.id);
  const uploadFile = useUploadFile();
  const { data: assets = [] } = useAssets();

  const req = request as any;
  const [editing, setEditing] = useState(false);
  const [ownerIsOther, setOwnerIsOther] = useState(() => {
    const current = (request as any).owner;
    return current && !(OWNER_OPTIONS as readonly string[]).includes(current);
  });
  const [form, setForm] = useState<any>({ ...request });
  const commentName = profile?.full_name || profile?.email || 'Unknown';
  const [commentText, setCommentText] = useState('');
  const [showPublishPrompt, setShowPublishPrompt] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track last viewed time per request for unread indicator
  const lastViewedKey = `sr_last_viewed_${request.id}`;
  const lastViewed = useMemo(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(lastViewedKey) : null;
    return stored ? new Date(stored) : null;
  }, [lastViewedKey]);

  // Mark as viewed on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(lastViewedKey, new Date().toISOString());
    }
  }, [lastViewedKey]);

  const unreadCommentCount = useMemo(() => {
    if (!lastViewed) return comments.length > 0 ? comments.length : 0;
    return comments.filter((c) => new Date(c.created_at) > lastViewed).length;
  }, [comments, lastViewed]);

  // Pending assets for this request
  const pendingAssets = useMemo(() => {
    return assets.filter((a) => a.request_id === request.id && (a.status === 'Waiting' || a.status === 'Blocking'));
  }, [assets, request.id]);

  const defaultTab: ModalTab = (request.stage === 'Client Review' || request.stage === 'Scheduled') ? 'Creative' : 'Details';
  const [activeTab, setActiveTab] = useState<ModalTab>(defaultTab);

  // Check if creative exists for warning
  const { data: creativeCheck } = useQuery({
    queryKey: ['creative-check', request.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('creatives')
        .select('id, graphic_url')
        .eq('request_id', request.id)
        .not('graphic_url', 'is', null)
        .limit(1);
      return data && data.length > 0;
    },
  });

  const handleStageChange = async (newStage: string) => {
    setForm({ ...form, stage: newStage });
    if (newStage === 'Published' && !form.actual_publish_date) {
      setShowPublishPrompt(true);
      setPublishDate(format(new Date(), 'yyyy-MM-dd'));
    }
    if (newStage === 'Client Review' && !creativeCheck) {
      toast.warning('No creative uploaded yet. Go to the Creative tab to upload graphic + caption and use "Send for Approval" instead.');
    }
    try {
      await updateRequest.mutateAsync({ id: request.id, stage: newStage } as any);
      toast.success(`Stage updated to ${newStage}`);
    } catch {
      toast.error('Failed to update stage');
      setForm({ ...form, stage: request.stage });
    }
  };

  const handleMarkAsPublished = () => {
    setShowPublishPrompt(true);
    setPublishDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handlePublishDateConfirm = async () => {
    setForm({ ...form, actual_publish_date: publishDate || null, stage: 'Published' });
    setShowPublishPrompt(false);
    try {
      await updateRequest.mutateAsync({ id: request.id, stage: 'Published', actual_publish_date: publishDate || null } as any);
      toast.success('Marked as published!');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handlePublishDateSkip = async () => {
    setShowPublishPrompt(false);
    setForm({ ...form, stage: 'Published' });
    try {
      await updateRequest.mutateAsync({ id: request.id, stage: 'Published' } as any);
      toast.success('Marked as published!');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleSave = async () => {
    try {
      await updateRequest.mutateAsync({
        id: request.id,
        title: form.title,
        description: form.description,
        service_line: form.service_line,
        content_type: form.content_type,
        stage: form.stage,
        priority: form.priority,
        target_date: form.target_date,
        event_promo_date: form.event_promo_date,
        context: form.context,
        assets_available: form.assets_available,
        submitter_name: form.submitter_name,
        owner: form.owner,
        what_needed_from_client: form.what_needed_from_client,
        contact_person: form.contact_person,
        date_mode: form.date_mode,
        date_range_end: form.date_range_end,
        flexible_date_text: form.flexible_date_text,
        has_hard_deadline: form.has_hard_deadline,
        deadline_text: form.deadline_text,
        actual_publish_date: form.actual_publish_date,
        linkedin_post_url: form.linkedin_post_url,
        internal_notes: form.internal_notes,
      } as any);
      toast.success('Request updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRequest.mutateAsync(request.id);
      toast.success('Request deleted');
      onClose();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !commentName.trim()) return;
    try {
      await createComment.mutateAsync({
        request_id: request.id,
        author_name: commentName,
        content: commentText,
      });
      setCommentText('');
      if (typeof window !== 'undefined') {
        localStorage.setItem(lastViewedKey, new Date().toISOString());
      }
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile.mutateAsync({ requestId: request.id, file, uploadedBy: commentName || 'Unknown' });
      toast.success('File uploaded');
    } catch {
      toast.error('Failed to upload file');
    }
  };

  const isImage = (type: string | null) => type && type.startsWith('image/');

  const inputClass = "w-full text-sm font-body bg-background border border-border rounded px-2 py-1.5 text-foreground";
  const labelClass = "text-xs font-medium font-body text-muted-foreground";

  const formatDateInfo = () => {
    if (req.date_mode === 'flexible') {
      return req.flexible_date_text ? `Flexible: ${req.flexible_date_text}` : 'Flexible timing';
    }
    if (req.date_mode === 'range' && request.target_date) {
      const start = format(parseISO(request.target_date), 'MMM d, yyyy');
      const end = req.date_range_end ? format(parseISO(req.date_range_end), 'MMM d, yyyy') : '?';
      return `${start} – ${end}`;
    }
    return request.target_date ? format(parseISO(request.target_date), 'MMM d, yyyy') : '–';
  };

  const tabs: ModalTab[] = ['Details', 'Creative', 'Files & Comments'];

  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-50 bg-foreground/50 flex items-start justify-center md:pt-12 px-0 md:px-4 overflow-y-auto">
        <div className="bg-card border border-border rounded-none md:rounded w-full md:max-w-3xl shadow-lg min-h-screen md:min-h-0 md:mb-8">
          {/* Header */}
          <div className="px-5 py-3 border-b border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {!editing ? (
                  <h2 className="text-base font-bold font-body text-foreground">{form.title}</h2>
                ) : (
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${inputClass} text-base font-bold`} />
                )}
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none ml-2 shrink-0">&times;</button>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-2">
              <PriorityDot priority={form.priority} />
              {!editing ? (
                <>
                  <ServiceLineBadge label={form.service_line} />
                  <ContentTypeBadge label={form.content_type} />
                </>
              ) : (
                <>
                  <select value={form.service_line} onChange={(e) => setForm({ ...form, service_line: e.target.value })} className="text-xs font-body bg-muted border border-border rounded px-2 py-1">
                    {SERVICE_LINES.map((sl) => <option key={sl} value={sl}>{sl}</option>)}
                  </select>
                  <select value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })} className="text-xs font-body bg-muted border border-border rounded px-2 py-1">
                    {CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                  </select>
                </>
              )}
              {isAdmin ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <select
                      value={form.stage}
                      onChange={(e) => handleStageChange(e.target.value)}
                      className="text-xs font-body font-semibold rounded px-2 py-1 text-accent-foreground"
                      style={{ backgroundColor: STAGE_COLORS[form.stage] || '#6B7280' }}
                    >
                      {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </TooltipTrigger>
                  {form.stage === 'In Simplified' && (
                    <TooltipContent>Content is being reviewed in Simplified (compliance platform) before publishing</TooltipContent>
                  )}
                </Tooltip>
              ) : (
                (() => {
                  const cs = getClientStatus(form.stage);
                  return (
                    <span
                      className="text-xs font-body font-semibold rounded px-2 py-1 text-white inline-block"
                      style={{ backgroundColor: cs.color }}
                    >
                      {cs.label}
                    </span>
                  );
                })()
              )}
              {isAdmin && editing && (
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="text-xs font-body bg-muted border border-border rounded px-2 py-1">
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              )}
              {req.has_hard_deadline && req.deadline_text && (
                <span className="text-[10px] font-body bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
                  🔴 {req.deadline_text}
                </span>
              )}
            </div>
          </div>

          {/* Mark as Published button for admin when Scheduled */}
          {isAdmin && form.stage === 'Scheduled' && !showPublishPrompt && (
            <div className="mx-5 mt-3">
              <button
                onClick={handleMarkAsPublished}
                className="w-full text-sm font-body font-semibold bg-[hsl(145,63%,42%)] text-white px-4 py-2.5 rounded-lg hover:opacity-90"
              >
                ✓ Mark as Published
              </button>
            </div>
          )}

          {/* Publish date prompt */}
          {showPublishPrompt && (
            <div className="mx-5 mt-3 p-3 bg-accent/10 border border-accent rounded space-y-2">
              <p className="text-xs font-body font-medium text-foreground">When was this published?</p>
              <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className={inputClass} />
              <div className="flex gap-2">
                <button onClick={handlePublishDateConfirm} className="text-xs font-body bg-accent text-accent-foreground px-3 py-1.5 rounded">Set Date</button>
                <button onClick={handlePublishDateSkip} className="text-xs font-body text-muted-foreground hover:text-foreground">Skip (use today)</button>
              </div>
            </div>
          )}

          {/* Pending asset alert */}
          {pendingAssets.length > 0 && (
            <div className="mx-5 mt-3 p-3 bg-[hsl(48,89%,50%)]/10 border border-[hsl(48,89%,50%)]/30 rounded">
              <p className="text-xs font-body font-semibold text-foreground">📦 {pendingAssets.length} asset{pendingAssets.length > 1 ? 's' : ''} still needed</p>
              <div className="mt-1 space-y-0.5">
                {pendingAssets.map((a) => (
                  <p key={a.id} className="text-[11px] font-body text-muted-foreground">
                    • {a.title} — <span className={a.status === 'Blocking' ? 'text-destructive font-medium' : 'text-[hsl(48,89%,50%)]'}>{a.status}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Tab navigation */}
          <div className="flex border-b border-border px-5">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-body font-medium px-3 py-2.5 border-b-2 transition-colors relative ${activeTab === tab ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {tab}
                {tab === 'Files & Comments' && unreadCommentCount > 0 && activeTab !== 'Files & Comments' && (
                  <span className="absolute -top-0.5 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] flex items-center justify-center font-bold">
                    {unreadCommentCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {/* Details tab */}
            {activeTab === 'Details' && (
              <>
                <div className="grid sm:grid-cols-2 gap-3 text-xs font-body">
                  <div>
                    <span className={labelClass}>Submitted</span>
                    <p className="text-foreground">{format(parseISO(request.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <span className={labelClass}>Due Date</span>
                    {editing ? (
                      <div className="space-y-1">
                        <select value={form.date_mode || 'specific'} onChange={(e) => setForm({ ...form, date_mode: e.target.value })} className={inputClass}>
                          <option value="specific">Specific Date</option>
                          <option value="range">Date Range</option>
                          <option value="flexible">Flexible</option>
                        </select>
                        {(form.date_mode || 'specific') !== 'flexible' && (
                          <input type="date" value={form.target_date || ''} onChange={(e) => setForm({ ...form, target_date: e.target.value || null })} className={inputClass} />
                        )}
                        {form.date_mode === 'range' && (
                          <input type="date" value={form.date_range_end || ''} onChange={(e) => setForm({ ...form, date_range_end: e.target.value || null })} className={inputClass} placeholder="End date" />
                        )}
                        {form.date_mode === 'flexible' && (
                          <input value={form.flexible_date_text || ''} onChange={(e) => setForm({ ...form, flexible_date_text: e.target.value || null })} className={inputClass} placeholder="e.g. sometime in April" />
                        )}
                      </div>
                    ) : (
                      <p className="text-foreground">{formatDateInfo()}</p>
                    )}
                  </div>
                  <div>
                    <span className={labelClass}>Event / Promo Date</span>
                    {editing ? (
                      <input type="date" value={form.event_promo_date || ''} onChange={(e) => setForm({ ...form, event_promo_date: e.target.value || null })} className={inputClass} />
                    ) : (
                      <p className="text-foreground">{form.event_promo_date ? format(parseISO(form.event_promo_date), 'MMM d, yyyy') : '–'}</p>
                    )}
                  </div>
                  <div>
                    <span className={labelClass}>Contact Person</span>
                    {editing ? (
                      <input value={form.contact_person || ''} onChange={(e) => setForm({ ...form, contact_person: e.target.value || null })} className={inputClass} />
                    ) : (
                      <p className="text-foreground">{req.contact_person || '–'}</p>
                    )}
                  </div>
                  <div>
                    <span className={labelClass}>Submitter</span>
                    {editing ? (
                      <input value={form.submitter_name || ''} onChange={(e) => setForm({ ...form, submitter_name: e.target.value || null })} className={inputClass} />
                    ) : (
                      <p className="text-foreground">{form.submitter_name || '–'}</p>
                    )}
                  </div>
                </div>

                {/* What's Needed from Client — visible to all if populated */}
                {isAdmin ? (
                  (form.what_needed_from_client || editing) && (
                    <div>
                      <span className={labelClass}>What's Needed from Client</span>
                      {editing ? (
                        <textarea value={form.what_needed_from_client || ''} onChange={(e) => setForm({ ...form, what_needed_from_client: e.target.value || null })} className={`${inputClass} min-h-[40px]`} />
                      ) : (
                        <div className="text-xs font-body text-foreground whitespace-pre-wrap mt-1 rounded p-2 bg-destructive/10 border border-destructive/20">
                          {form.what_needed_from_client}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  form.what_needed_from_client && (
                    <div>
                      <span className={labelClass}>What's Needed from Client</span>
                      <div className="text-xs font-body text-foreground whitespace-pre-wrap mt-1 rounded p-2 bg-destructive/10 border border-destructive/20">
                        {form.what_needed_from_client}
                      </div>
                    </div>
                  )
                )}

                {(['context', 'assets_available'] as const).map((field) => {
                  const labels: Record<string, string> = { context: 'Context', assets_available: 'Assets / Shared Materials' };
                  return (
                    <div key={field}>
                      <span className={labelClass}>{labels[field]}</span>
                      {editing ? (
                        <textarea value={(form as any)[field] || ''} onChange={(e) => setForm({ ...form, [field]: e.target.value || null })} className={`${inputClass} min-h-[40px]`} />
                      ) : (
                        <p className="text-xs font-body text-foreground whitespace-pre-wrap">{(form as any)[field] || '–'}</p>
                      )}
                    </div>
                  );
                })}

                {/* Archway Internal section — admin only */}
                {isAdmin && (
                  <>
                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-card px-3 text-[10px] font-body font-semibold text-muted-foreground uppercase tracking-wider">Archway Internal</span>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-xs font-body">
                      <div>
                        <span className={labelClass}>Actual Publish Date</span>
                        {editing ? (
                          <input type="date" value={form.actual_publish_date || ''} onChange={(e) => setForm({ ...form, actual_publish_date: e.target.value || null })} className={inputClass} />
                        ) : (
                          <p className="text-foreground">{form.actual_publish_date ? format(parseISO(form.actual_publish_date), 'MMM d, yyyy') : '–'}</p>
                        )}
                      </div>
                      <div>
                        <span className={labelClass}>Owner</span>
                        {editing ? (
                          ownerIsOther ? (
                            <div className="flex gap-1">
                              <input value={form.owner || ''} onChange={(e) => setForm({ ...form, owner: e.target.value || null })} className={`${inputClass} flex-1`} placeholder="Enter name" />
                              <button onClick={() => { setOwnerIsOther(false); setForm({ ...form, owner: 'Archway' }); }} className="text-[10px] font-body text-muted-foreground hover:text-foreground">✕</button>
                            </div>
                          ) : (
                            <select
                              value={form.owner || 'Archway'}
                              onChange={(e) => {
                                if (e.target.value === '__other__') {
                                  setOwnerIsOther(true);
                                  setForm({ ...form, owner: '' });
                                } else {
                                  setForm({ ...form, owner: e.target.value });
                                }
                              }}
                              className={inputClass}
                            >
                              {OWNER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                              <option value="__other__">Other…</option>
                            </select>
                          )
                        ) : (
                          <p className="text-foreground">{form.owner || '–'}</p>
                        )}
                      </div>
                    </div>

                    {/* LinkedIn Post URL */}
                    <div className="col-span-2">
                      <span className={labelClass}>LinkedIn Post URL</span>
                      {editing ? (
                        <input value={form.linkedin_post_url || ''} onChange={(e) => setForm({ ...form, linkedin_post_url: e.target.value || null })} className={inputClass} placeholder="https://www.linkedin.com/feed/update/..." />
                      ) : (
                        form.linkedin_post_url ? (
                          <a href={form.linkedin_post_url} target="_blank" rel="noopener noreferrer" className="text-xs font-body text-accent hover:underline break-all">{form.linkedin_post_url}</a>
                        ) : (
                          <p className="text-foreground">–</p>
                        )
                      )}
                    </div>

                    {/* Internal Notes */}
                    <div className="col-span-2">
                      <span className={labelClass}>Internal Notes</span>
                      {editing ? (
                        <textarea value={form.internal_notes || ''} onChange={(e) => setForm({ ...form, internal_notes: e.target.value || null })} className={`${inputClass} min-h-[60px]`} placeholder="Internal notes visible only to Archway team..." />
                      ) : (
                        <p className="text-xs font-body text-foreground whitespace-pre-wrap">{form.internal_notes || '–'}</p>
                      )}
                    </div>

                    {editing && (
                      <div className="space-y-1 col-span-2">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={form.has_hard_deadline || false} onChange={(e) => setForm({ ...form, has_hard_deadline: e.target.checked })} className="rounded border-border" />
                          <span className="text-xs font-body text-foreground">Hard deadline or event</span>
                        </label>
                        {form.has_hard_deadline && (
                          <input value={form.deadline_text || ''} onChange={(e) => setForm({ ...form, deadline_text: e.target.value || null })} className={inputClass} placeholder="e.g. ADV forms due 4/30" />
                        )}
                      </div>
                    )}
                  </>
                )}

                {isAdmin && (
                  <div className="flex gap-2">
                    {editing ? (
                      <>
                        <button onClick={handleSave} className="text-xs font-body bg-accent text-accent-foreground px-3 py-1.5 rounded hover:opacity-90">Save</button>
                        <button onClick={() => { setEditing(false); setForm({ ...request }); }} className="text-xs font-body text-muted-foreground hover:text-foreground px-3 py-1.5">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setEditing(true)} className="text-xs font-body bg-secondary text-secondary-foreground px-3 py-1.5 rounded hover:opacity-90">Edit</button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Creative tab */}
            {activeTab === 'Creative' && (
              <CreativeTab request={request} />
            )}

            {/* Files & Comments tab */}
            {activeTab === 'Files & Comments' && (
              <>
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <span className={labelClass}>Attachments ({files.length})</span>
                    <button onClick={() => fileInputRef.current?.click()} className="text-xs font-body text-accent hover:underline">Upload</button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.pptx,.xlsx" />
                  </div>
                  {files.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {files.map((f) => (
                        <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer" className="block border border-border rounded overflow-hidden hover:border-accent transition-colors">
                          {isImage(f.file_type) ? (
                            <img src={f.file_url} alt={f.file_name} className="w-full h-24 object-cover" />
                          ) : (
                            <div className="h-24 flex items-center justify-center bg-muted">
                              <span className="text-2xl">📄</span>
                            </div>
                          )}
                          <div className="px-2 py-1 text-[10px] font-body text-muted-foreground truncate">{f.file_name}</div>
                        </a>
                      ))}
                    </div>
                  )}
                </section>

                <AdminCommentSection
                  comments={comments}
                  lastViewed={lastViewed}
                  commentName={commentName}
                  commentText={commentText}
                  setCommentText={setCommentText}
                  handleComment={handleComment}
                  inputClass={inputClass}
                  labelClass={labelClass}
                />
              </>
            )}

            {/* Delete — admin only, with confirmation dialog */}
            {isAdmin && (
              <div className="pt-4 border-t border-border">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-[11px] font-body text-destructive hover:underline">
                      Delete this request
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this request?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{request.title}" and all associated comments, files, and creative versions. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// #7: Comment section with admin badge
function AdminCommentSection({
  comments,
  lastViewed,
  commentName,
  commentText,
  setCommentText,
  handleComment,
  inputClass,
  labelClass,
}: {
  comments: any[];
  lastViewed: Date | null;
  commentName: string;
  commentText: string;
  setCommentText: (v: string) => void;
  handleComment: () => void;
  inputClass: string;
  labelClass: string;
}) {
  // Fetch admin profile names to identify admin comments
  const { data: adminNames = [] } = useQuery({
    queryKey: ['admin-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      if (error) throw error;
      const userIds = (data || []).map((r: any) => r.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('full_name, email')
        .in('id', userIds);
      return (profiles || []).map((p: any) => p.full_name || p.email);
    },
    staleTime: 1000 * 60 * 10,
  });

  const isAdminAuthor = (name: string) => adminNames.some((n: string) => n === name);

  return (
    <section>
      <span className={labelClass}>Comments ({comments.length})</span>
      <div className="space-y-2 mt-2">
        {comments.map((c) => {
          const isNew = lastViewed && new Date(c.created_at) > lastViewed;
          const isArch = isAdminAuthor(c.author_name);
          return (
            <div key={c.id} className={`bg-muted rounded p-2 ${isNew ? 'ring-2 ring-accent/40' : ''}`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold font-body text-foreground flex items-center gap-1.5">
                  {c.author_name}
                  {isArch && (
                    <span className="text-[9px] font-body font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                      Archway
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-body text-muted-foreground">{format(parseISO(c.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <p className="text-xs font-body text-foreground mt-1">{c.content}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-2 space-y-2">
        <p className="text-xs font-body text-muted-foreground">Posting as <span className="font-semibold text-foreground">{commentName}</span></p>
        <div className="flex gap-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className={`${inputClass} flex-1`}
            onKeyDown={(e) => e.key === 'Enter' && handleComment()}
          />
          <button onClick={handleComment} className="text-xs font-body bg-accent text-accent-foreground px-3 py-1.5 rounded hover:opacity-90">Post</button>
        </div>
      </div>
    </section>
  );
}
