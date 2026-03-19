import { useState, useRef } from 'react';
import { Request, useCreatives, useCreateCreative, useUpdateCreative, useUploadCreativeGraphic, useUpdateRequest } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Paperclip, FileText, X } from 'lucide-react';
import ContentPreview from '@/components/ContentPreview';
import { supabase } from '@/integrations/supabase/client';

interface CreativeTabProps {
  request: Request;
}

type ContentCategory = 'linkedin' | 'blog' | 'email' | 'landing_page' | 'event' | 'other';

function getContentCategory(contentType: string): ContentCategory {
  const t = contentType.toLowerCase();
  if (t.includes('linkedin')) return 'linkedin';
  if (t.includes('blog') || t.includes('seo')) return 'blog';
  if (t.includes('email') || t.includes('nurture') || t.includes('newsletter')) return 'email';
  if (t.includes('landing') || t.includes('website')) return 'landing_page';
  if (t.includes('event')) return 'event';
  return 'other';
}

function getImageLabel(category: ContentCategory): string {
  switch (category) {
    case 'linkedin': return 'Graphic';
    case 'blog': return 'Featured Image';
    case 'email': return 'Email Header Image';
    case 'event': return 'Event Graphic';
    case 'landing_page': return 'Screenshot / Mockup';
    default: return 'File Upload';
  }
}

export default function CreativeTab({ request }: CreativeTabProps) {
  const { data: creatives = [] } = useCreatives(request.id);
  const createCreative = useCreateCreative();
  const updateCreative = useUpdateCreative();
  const uploadGraphic = useUploadCreativeGraphic();
  const updateRequest = useUpdateRequest();
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const latest = creatives.length > 0 ? creatives[creatives.length - 1] : null;
  const isClientReview = request.stage === 'Client Review';
  const isScheduled = request.stage === 'Scheduled';
  const isPublished = request.stage === 'Published';
  const category = getContentCategory(request.content_type);

  // Shared fields
  const [graphicUrl, setGraphicUrl] = useState(latest?.graphic_url || '');
  const [graphicFileName, setGraphicFileName] = useState(latest?.graphic_file_name || '');
  const [attachmentUrl, setAttachmentUrl] = useState(latest?.attachment_url || '');
  const [attachmentFileName, setAttachmentFileName] = useState(latest?.attachment_file_name || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // LinkedIn / Event fields
  const [caption, setCaption] = useState(latest?.caption || '');
  const [platform, setPlatform] = useState(latest?.platform || 'LinkedIn');
  const [scheduledDate, setScheduledDate] = useState(latest?.scheduled_datetime ? format(parseISO(latest.scheduled_datetime), 'yyyy-MM-dd') : '');
  const [scheduledTime, setScheduledTime] = useState(latest?.scheduled_datetime ? format(parseISO(latest.scheduled_datetime), 'HH:mm') : '09:00');

  // Blog / SEO fields
  const [articleTitle, setArticleTitle] = useState(latest?.article_title || request.title || '');
  const [targetKeyword, setTargetKeyword] = useState(latest?.target_keyword || '');
  const [bodyContent, setBodyContent] = useState(latest?.body_content || '');

  // Email fields
  const [subjectLine, setSubjectLine] = useState(latest?.subject_line || request.title || '');

  // Landing page fields
  const [pageUrl, setPageUrl] = useState(latest?.page_url || '');

  // Event fields
  const [eventLocation, setEventLocation] = useState(latest?.event_location || '');
  const [eventDate, setEventDate] = useState(latest?.event_date || request.event_promo_date || request.target_date || '');

  // Approval
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const approverName = profile?.full_name || profile?.email || '';

  // Determine if can send
  const canSendForApproval = (() => {
    switch (category) {
      case 'linkedin': return !!caption.trim();
      case 'blog': return !!articleTitle.trim();
      case 'email': return !!subjectLine.trim();
      case 'landing_page': return !!pageUrl.trim() || !!bodyContent.trim();
      case 'event': return !!caption.trim();
      default: return !!bodyContent.trim() || !!attachmentUrl;
    }
  })();

  const handleGraphicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadGraphic.mutateAsync({ requestId: request.id, file });
      setGraphicUrl(result.publicUrl);
      setGraphicFileName(result.fileName);
      toast.success('File uploaded');
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filePath = `creatives/${request.id}/attachments/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
      setAttachmentUrl(publicUrl);
      setAttachmentFileName(file.name);
      toast.success('Attachment uploaded');
    } catch {
      toast.error('Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  // Build creative payload based on content type
  const buildPayload = () => {
    const scheduledDatetime = scheduledDate && scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
      : null;

    const base: Record<string, any> = {
      graphic_url: graphicUrl || undefined,
      graphic_file_name: graphicFileName || undefined,
      attachment_url: attachmentUrl || undefined,
      attachment_file_name: attachmentFileName || undefined,
      status: 'Pending Approval',
    };

    switch (category) {
      case 'linkedin':
        return { ...base, caption, platform, scheduled_datetime: scheduledDatetime };
      case 'blog':
        return { ...base, article_title: articleTitle, body_content: bodyContent, target_keyword: targetKeyword, caption: bodyContent };
      case 'email':
        return { ...base, subject_line: subjectLine, body_content: bodyContent, caption: bodyContent };
      case 'landing_page':
        return { ...base, page_url: pageUrl, body_content: bodyContent, caption: bodyContent };
      case 'event':
        return { ...base, caption, platform, scheduled_datetime: scheduledDatetime, event_location: eventLocation, event_date: eventDate };
      default:
        return { ...base, body_content: bodyContent, caption: bodyContent };
    }
  };

  const handleSendForApproval = async () => {
    if (!canSendForApproval) { toast.error('Please fill in the required fields'); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      const nextVersion = (latest?.version || 0) + 1;
      const isRevision = latest && latest.status === 'Changes Requested';

      if (isRevision || !latest || latest.status !== 'Draft') {
        await createCreative.mutateAsync({
          request_id: request.id,
          version: nextVersion,
          ...payload,
        });
      } else {
        await updateCreative.mutateAsync({
          id: latest.id,
          ...payload,
        });
      }

      await updateRequest.mutateAsync({ id: request.id, stage: 'Client Review' } as any);
      toast.success('Sent for approval — request moved to Client Review!');
    } catch {
      toast.error('Failed to send for approval');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!approverName) { toast.error('Could not determine your name'); return; }
    if (!latest) { toast.error('No creative has been uploaded yet.'); return; }
    setSaving(true);
    try {
      await updateCreative.mutateAsync({
        id: latest.id,
        status: 'Approved',
        approved_by: approverName,
        approved_at: new Date().toISOString(),
      });
      await updateRequest.mutateAsync({ id: request.id, stage: 'Scheduled' } as any);
      toast.success('Approved! Post is now scheduled.');
    } catch {
      toast.error('Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!feedbackText.trim()) { toast.error('Please describe what changes you need'); return; }
    if (!latest) { toast.error('No creative has been uploaded yet.'); return; }
    setSaving(true);
    try {
      await updateCreative.mutateAsync({
        id: latest.id,
        status: 'Changes Requested',
        feedback: feedbackText,
      });
      await updateRequest.mutateAsync({ id: request.id, stage: 'Changes Requested' } as any);
      toast.success('Changes requested');
      setShowFeedback(false);
      setFeedbackText('');
    } catch {
      toast.error('Failed to request changes');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full text-sm font-body bg-background border border-border rounded px-2 py-1.5 text-foreground";
  const labelClass = "text-xs font-medium font-body text-muted-foreground";

  // Preview data
  const previewGraphicUrl = graphicUrl || latest?.graphic_url;
  const previewCaption = caption || bodyContent || latest?.caption;

  const showEditSection = (!isClientReview || (latest && latest.status === 'Changes Requested')) && !isScheduled && !isPublished;

  return (
    <div className="space-y-4">
      {/* Published banner */}
      {isPublished && (previewGraphicUrl || previewCaption) && (
        <div className="relative border border-[hsl(145,63%,42%)]/30 rounded-lg overflow-hidden">
          <div className="absolute top-3 left-3 z-10 bg-[hsl(145,63%,42%)] text-white text-xs font-body font-bold px-3 py-1 rounded-full shadow-md">
            ✅ Published
          </div>
          <ContentPreview
            contentType={request.content_type}
            graphicUrl={previewGraphicUrl || null}
            caption={previewCaption || null}
            title={articleTitle || subjectLine || request.title}
            scheduledDatetime={latest?.scheduled_datetime}
            eventDate={eventDate || request.event_promo_date || request.target_date}
            platform={platform}
          />
        </div>
      )}

      {/* Preview (non-published) */}
      {!isPublished && (previewGraphicUrl || previewCaption) && (
        <div>
          <ContentPreview
            contentType={request.content_type}
            graphicUrl={previewGraphicUrl || null}
            caption={previewCaption || null}
            title={articleTitle || subjectLine || request.title}
            scheduledDatetime={latest?.scheduled_datetime}
            eventDate={eventDate || request.event_promo_date || request.target_date}
            platform={platform}
          />
          {latest?.scheduled_datetime && (
            <div className="px-4 py-2 bg-muted/50 text-xs font-body text-muted-foreground flex items-center gap-2 border border-border border-t-0 rounded-b-lg">
              🕐 Scheduled: {format(parseISO(latest.scheduled_datetime), 'MMM d, yyyy h:mm a')}
            </div>
          )}
        </div>
      )}

      {/* Attachment display */}
      {latest?.attachment_url && latest?.attachment_file_name && (
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <a href={latest.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sm font-body text-accent hover:underline truncate">
            {latest.attachment_file_name}
          </a>
          <span className="text-[10px] font-body text-muted-foreground ml-auto">Attachment</span>
        </div>
      )}

      {/* Approval buttons */}
      {isClientReview && latest && latest.status === 'Pending Approval' && (
        <div className="space-y-3 bg-accent/5 border border-accent/20 rounded-lg p-4">
          <p className="text-xs font-body font-semibold text-foreground">This content is ready for your review.</p>
          <p className="text-[11px] font-body text-muted-foreground">Approving as <span className="font-semibold text-foreground">{approverName}</span></p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleApprove} disabled={saving} className="flex-1 text-sm font-body font-semibold bg-[hsl(145,63%,42%)] text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50">
              ✓ Approve
            </button>
            <button onClick={() => setShowFeedback(true)} disabled={saving} className="flex-1 text-sm font-body font-semibold bg-accent text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50">
              ✎ Request Changes
            </button>
          </div>
          {showFeedback && (
            <div className="space-y-2 mt-2">
              <label className="text-xs font-body font-medium text-muted-foreground">What changes would you like?</label>
              <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Be specific so Archway can get it right..." className={`${inputClass} min-h-[80px]`} autoFocus />
              <div className="flex gap-2">
                <button onClick={handleRequestChanges} disabled={saving} className="text-xs font-body bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50">Submit Feedback</button>
                <button onClick={() => setShowFeedback(false)} className="text-xs font-body text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approved badge */}
      {latest?.status === 'Approved' && (
        <div className="bg-[hsl(145,63%,42%)]/10 border border-[hsl(145,63%,42%)]/30 rounded-lg p-3 text-sm font-body text-foreground">
          ✓ Approved by {latest.approved_by} on {latest.approved_at && format(parseISO(latest.approved_at), 'MMM d, yyyy \'at\' h:mm a')}
        </div>
      )}

      {/* Changes Requested badge */}
      {latest?.status === 'Changes Requested' && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-1">
          <p className="text-sm font-body font-semibold text-accent">Changes Requested</p>
          <p className="text-xs font-body text-foreground">{latest.feedback}</p>
        </div>
      )}

      {/* ============ EDIT SECTION — Content-type-specific fields ============ */}
      {showEditSection && (
        <div className="space-y-3">
          {/* Image upload — all types except landing page */}
          {category !== 'landing_page' && (
            <div>
              <label className={labelClass}>{getImageLabel(category)}</label>
              <div className="mt-1">
                {graphicUrl ? (
                  <div className="relative">
                    <img src={graphicUrl} alt="Creative" className="w-full rounded border border-border" />
                    <button onClick={() => fileInputRef.current?.click()} className="absolute top-2 right-2 text-xs font-body bg-card/90 border border-border px-2 py-1 rounded hover:bg-card">Replace</button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-sm font-body text-muted-foreground hover:border-accent hover:text-accent transition-colors">
                    {uploading ? 'Uploading...' : `+ Upload ${getImageLabel(category)}`}
                  </button>
                )}
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleGraphicUpload} accept="image/*" />
              </div>
            </div>
          )}

          {/* ---- LINKEDIN FIELDS ---- */}
          {category === 'linkedin' && (
            <>
              <div>
                <label className={labelClass}>Caption</label>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write the post caption... Supports line breaks and emoji 😊" className={`${inputClass} min-h-[120px] mt-1`} />
              </div>
              <div>
                <label className={labelClass}>Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={`${inputClass} mt-1`}>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Schedule Date</label>
                  <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className={`${inputClass} mt-1`} />
                </div>
                <div>
                  <label className={labelClass}>Time (ET)</label>
                  <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className={`${inputClass} mt-1`} />
                </div>
              </div>
            </>
          )}

          {/* ---- BLOG / SEO FIELDS ---- */}
          {category === 'blog' && (
            <>
              <div>
                <label className={labelClass}>Article Title</label>
                <input type="text" value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} placeholder="Article title" className={`${inputClass} mt-1`} />
              </div>
              <div>
                <label className={labelClass}>Target Keyword</label>
                <input type="text" value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)} placeholder="Primary SEO keyword" className={`${inputClass} mt-1`} />
              </div>
              <div>
                <label className={labelClass}>Article Body / Draft</label>
                <textarea value={bodyContent} onChange={(e) => setBodyContent(e.target.value)} placeholder="Paste article body or summary here, or attach the draft document below..." className={`${inputClass} min-h-[160px] mt-1`} />
              </div>
            </>
          )}

          {/* ---- EMAIL FIELDS ---- */}
          {category === 'email' && (
            <>
              <div>
                <label className={labelClass}>Subject Line</label>
                <input type="text" value={subjectLine} onChange={(e) => setSubjectLine(e.target.value)} placeholder="Email subject line" className={`${inputClass} mt-1`} />
              </div>
              <div>
                <label className={labelClass}>Email Body / Copy</label>
                <textarea value={bodyContent} onChange={(e) => setBodyContent(e.target.value)} placeholder="Paste the email copy here, or attach the full draft below..." className={`${inputClass} min-h-[160px] mt-1`} />
              </div>
            </>
          )}

          {/* ---- LANDING PAGE FIELDS ---- */}
          {category === 'landing_page' && (
            <>
              <div>
                <label className={labelClass}>Page URL / Staging Link</label>
                <input type="url" value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="https://stablerock.com/page-name" className={`${inputClass} mt-1`} />
              </div>
              <div>
                <label className={labelClass}>Description of Changes</label>
                <textarea value={bodyContent} onChange={(e) => setBodyContent(e.target.value)} placeholder="Describe the page updates, copy changes, or new sections..." className={`${inputClass} min-h-[120px] mt-1`} />
              </div>
            </>
          )}

          {/* ---- EVENT FIELDS ---- */}
          {category === 'event' && (
            <>
              <div>
                <label className={labelClass}>Caption / Description</label>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Event promotion copy..." className={`${inputClass} min-h-[120px] mt-1`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Event Date</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={`${inputClass} mt-1`} />
                </div>
                <div>
                  <label className={labelClass}>Event Location</label>
                  <input type="text" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="City, Venue, or Virtual" className={`${inputClass} mt-1`} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={`${inputClass} mt-1`}>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Email">Email</option>
                  <option value="Multiple">Multiple Channels</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Schedule Date</label>
                  <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className={`${inputClass} mt-1`} />
                </div>
                <div>
                  <label className={labelClass}>Time (ET)</label>
                  <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className={`${inputClass} mt-1`} />
                </div>
              </div>
            </>
          )}

          {/* ---- OTHER / UNKNOWN FIELDS ---- */}
          {category === 'other' && (
            <div>
              <label className={labelClass}>Notes / Description</label>
              <textarea value={bodyContent} onChange={(e) => setBodyContent(e.target.value)} placeholder="Describe what's needed or add notes..." className={`${inputClass} min-h-[120px] mt-1`} />
            </div>
          )}

          {/* Attachment — all types */}
          <div>
            <label className={labelClass}>Attachment {category === 'blog' ? '(draft .docx, .pdf)' : '(optional)'}</label>
            <div className="mt-1">
              {attachmentUrl ? (
                <div className="flex items-center gap-2 bg-muted rounded px-3 py-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-body text-accent hover:underline truncate">{attachmentFileName}</a>
                  <button onClick={() => { setAttachmentUrl(''); setAttachmentFileName(''); }} className="ml-auto text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => attachmentInputRef.current?.click()} disabled={uploading} className="w-full h-10 border border-dashed border-border rounded-lg flex items-center justify-center gap-2 text-sm font-body text-muted-foreground hover:border-accent hover:text-accent transition-colors">
                  <Paperclip className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Attach file (doc, pdf, etc.)'}
                </button>
              )}
              <input ref={attachmentInputRef} type="file" className="hidden" onChange={handleAttachmentUpload} />
            </div>
          </div>

          {/* Send for Approval */}
          <div>
            <button onClick={handleSendForApproval} disabled={saving || !canSendForApproval} className="w-full text-sm font-body font-semibold bg-accent text-accent-foreground px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? 'Sending...' : latest?.status === 'Changes Requested' ? '🔄 Re-send for Approval' : '📤 Send for Approval'}
            </button>
            {!canSendForApproval && (
              <p className="text-[11px] font-body text-muted-foreground mt-1.5 text-center">
                {category === 'linkedin' ? 'Add a caption to enable sending.' :
                 category === 'blog' ? 'Add an article title to enable sending.' :
                 category === 'email' ? 'Add a subject line to enable sending.' :
                 category === 'landing_page' ? 'Add a page URL or description to enable sending.' :
                 category === 'event' ? 'Add a caption to enable sending.' :
                 'Add a description or attachment to enable sending.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Version History */}
      {creatives.length > 0 && (
        <div>
          <label className={labelClass}>Version History</label>
          <div className="mt-1 space-y-1">
            {creatives.map((c) => (
              <div key={c.id} className="text-xs font-body text-muted-foreground bg-muted rounded px-3 py-2">
                <span className="font-medium text-foreground">v{c.version}</span>
                {' uploaded '}
                {format(parseISO(c.created_at), 'MMM d')}
                {c.status === 'Approved' && c.approved_by && (
                  <span className="text-[hsl(145,63%,42%)]"> — Approved by {c.approved_by} {c.approved_at && format(parseISO(c.approved_at), 'MMM d')}</span>
                )}
                {c.status === 'Changes Requested' && c.feedback && (
                  <span className="text-accent"> — Changes requested: "{c.feedback}"</span>
                )}
                {c.status === 'Pending Approval' && (
                  <span className="text-accent"> — Awaiting approval</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
