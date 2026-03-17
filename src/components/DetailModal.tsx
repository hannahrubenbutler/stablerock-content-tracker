import { useState, useRef } from 'react';
import { Request, useUpdateRequest, useDeleteRequest, useComments, useCreateComment, useFileReferences, useUploadFile } from '@/hooks/useData';
import { ServiceLineBadge, ContentTypeBadge, PriorityDot } from '@/components/Badges';
import { STAGES, SERVICE_LINES, CONTENT_TYPES } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface DetailModalProps {
  request: Request;
  onClose: () => void;
}

export default function DetailModal({ request, onClose }: DetailModalProps) {
  const updateRequest = useUpdateRequest();
  const deleteRequest = useDeleteRequest();
  const { data: comments = [] } = useComments(request.id);
  const createComment = useCreateComment();
  const { data: files = [] } = useFileReferences(request.id);
  const uploadFile = useUploadFile();

  const req = request as any;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({ ...request });
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-start justify-center md:pt-16 px-0 md:px-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-none md:rounded w-full md:max-w-2xl shadow-lg min-h-screen md:min-h-0 md:mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <PriorityDot priority={form.priority} />
            {!editing ? (
              <h2 className="text-sm font-semibold font-body text-foreground truncate">{form.title}</h2>
            ) : (
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none ml-2">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {!editing ? (
              <>
                <ServiceLineBadge label={form.service_line} />
                <ContentTypeBadge label={form.content_type} />
                <span className="text-xs font-body text-muted-foreground bg-muted px-2 py-0.5 rounded">{form.stage}</span>
                {req.has_hard_deadline && req.deadline_text && (
                  <span className="text-[10px] font-body bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
                    🔴 {req.deadline_text}
                  </span>
                )}
              </>
            ) : (
              <>
                <select value={form.service_line} onChange={(e) => setForm({ ...form, service_line: e.target.value })} className="text-xs font-body bg-muted border border-border rounded px-2 py-1">
                  {SERVICE_LINES.map((sl) => <option key={sl} value={sl}>{sl}</option>)}
                </select>
                <select value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })} className="text-xs font-body bg-muted border border-border rounded px-2 py-1">
                  {CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                </select>
                <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="text-xs font-body bg-muted border border-border rounded px-2 py-1">
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="text-xs font-body bg-muted border border-border rounded px-2 py-1">
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </>
            )}
          </div>

          {/* Fields */}
          <div className="grid sm:grid-cols-2 gap-3 text-xs font-body">
            <div>
              <span className={labelClass}>Requested Date</span>
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
              <span className={labelClass}>Actual Publish Date</span>
              {editing ? (
                <input type="date" value={form.actual_publish_date || ''} onChange={(e) => setForm({ ...form, actual_publish_date: e.target.value || null })} className={inputClass} />
              ) : (
                <p className="text-foreground">{form.actual_publish_date ? format(parseISO(form.actual_publish_date), 'MMM d, yyyy') : '–'}</p>
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
              <span className={labelClass}>Owner</span>
              {editing ? (
                <input value={form.owner || ''} onChange={(e) => setForm({ ...form, owner: e.target.value || null })} className={inputClass} />
              ) : (
                <p className="text-foreground">{form.owner || '–'}</p>
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

          {/* Hard Deadline (edit mode) */}
          {editing && (
            <div className="space-y-1">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.has_hard_deadline || false} onChange={(e) => setForm({ ...form, has_hard_deadline: e.target.checked })} className="rounded border-border" />
                <span className="text-xs font-body text-foreground">Hard deadline or event</span>
              </label>
              {form.has_hard_deadline && (
                <input value={form.deadline_text || ''} onChange={(e) => setForm({ ...form, deadline_text: e.target.value || null })} className={inputClass} placeholder="e.g. ADV forms due 4/30" />
              )}
            </div>
          )}

          {/* Text fields */}
          {(['context', 'assets_available', 'what_needed_from_client'] as const).map((field) => {
            const labels: Record<string, string> = { context: 'Context', assets_available: 'Assets / Shared Materials', what_needed_from_client: "What's Needed from Client" };
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

          {/* Action buttons */}
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={handleSave} className="text-xs font-body bg-accent text-accent-foreground px-3 py-1.5 rounded hover:opacity-90">Save</button>
                <button onClick={() => { setEditing(false); setForm({ ...request }); }} className="text-xs font-body text-muted-foreground hover:text-foreground px-3 py-1.5">Cancel</button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="text-xs font-body bg-secondary text-secondary-foreground px-3 py-1.5 rounded hover:opacity-90">Edit</button>
                <button onClick={() => setShowDeleteConfirm(true)} className="text-xs font-body bg-destructive text-destructive-foreground px-3 py-1.5 rounded hover:opacity-90">Delete</button>
              </>
            )}
          </div>

          {showDeleteConfirm && (
            <div className="bg-destructive/10 border border-destructive rounded p-3 flex items-center gap-3">
              <p className="text-xs font-body text-foreground flex-1">Are you sure? This cannot be undone.</p>
              <button onClick={handleDelete} className="text-xs font-body bg-destructive text-destructive-foreground px-3 py-1.5 rounded">Yes, Delete</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-xs font-body text-muted-foreground">Cancel</button>
            </div>
          )}

          {/* Files */}
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

          {/* Comments */}
          <section>
            <span className={labelClass}>Comments ({comments.length})</span>
            <div className="space-y-2 mt-2">
              {comments.map((c) => (
                <div key={c.id} className="bg-muted rounded p-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold font-body text-foreground">{c.author_name}</span>
                    <span className="text-[10px] font-body text-muted-foreground">{format(parseISO(c.created_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  <p className="text-xs font-body text-foreground mt-1">{c.content}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-2">
              <input
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
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
        </div>
      </div>
    </div>
  );
}
