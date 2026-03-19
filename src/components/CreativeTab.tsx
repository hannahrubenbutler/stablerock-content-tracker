import { useState, useRef } from 'react';
import { Request, useCreatives, useCreateCreative, useUpdateCreative, useUploadCreativeGraphic, useUpdateRequest } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { ExternalLink, Paperclip, FileText, X } from 'lucide-react';
import ContentPreview from '@/components/ContentPreview';
import { supabase } from '@/integrations/supabase/client';

interface CreativeTabProps {
  request: Request;
}

// renderCaption moved to ContentPreview

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

  const [caption, setCaption] = useState(latest?.caption || '');
  const [platform, setPlatform] = useState(latest?.platform || 'LinkedIn');
  const [scheduledDate, setScheduledDate] = useState(latest?.scheduled_datetime ? format(parseISO(latest.scheduled_datetime), 'yyyy-MM-dd') : '');
  const [scheduledTime, setScheduledTime] = useState(latest?.scheduled_datetime ? format(parseISO(latest.scheduled_datetime), 'HH:mm') : '09:00');
  const [graphicUrl, setGraphicUrl] = useState(latest?.graphic_url || '');
  const [graphicFileName, setGraphicFileName] = useState(latest?.graphic_file_name || '');
  const [attachmentUrl, setAttachmentUrl] = useState(latest?.attachment_url || '');
  const [attachmentFileName, setAttachmentFileName] = useState(latest?.attachment_file_name || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const approverName = profile?.full_name || profile?.email || '';

  const canSendForApproval = !!graphicUrl && !!caption.trim();

  const handleGraphicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadGraphic.mutateAsync({ requestId: request.id, file });
      setGraphicUrl(result.publicUrl);
      setGraphicFileName(result.fileName);
      toast.success('Graphic uploaded');
    } catch {
      toast.error('Failed to upload graphic');
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

  const handleSendForApproval = async () => {
    if (!graphicUrl) { toast.error('Please upload a graphic first'); return; }
    if (!caption.trim()) { toast.error('Please add a caption'); return; }
    setSaving(true);
    try {
      const scheduledDatetime = scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
        : null;

      const nextVersion = (latest?.version || 0) + 1;
      const isRevision = latest && latest.status === 'Changes Requested';

      if (isRevision && latest) {
        await createCreative.mutateAsync({
          request_id: request.id,
          version: nextVersion,
          graphic_url: graphicUrl,
          graphic_file_name: graphicFileName,
          caption,
          platform,
          scheduled_datetime: scheduledDatetime || undefined,
          status: 'Pending Approval',
          attachment_url: attachmentUrl || undefined,
          attachment_file_name: attachmentFileName || undefined,
        });
      } else if (latest && latest.status === 'Draft') {
        await updateCreative.mutateAsync({
          id: latest.id,
          graphic_url: graphicUrl,
          graphic_file_name: graphicFileName,
          caption,
          platform,
          scheduled_datetime: scheduledDatetime,
          status: 'Pending Approval',
          attachment_url: attachmentUrl || undefined,
          attachment_file_name: attachmentFileName || undefined,
        });
      } else {
        await createCreative.mutateAsync({
          request_id: request.id,
          version: nextVersion,
          graphic_url: graphicUrl,
          graphic_file_name: graphicFileName,
          caption,
          platform,
          scheduled_datetime: scheduledDatetime || undefined,
          status: 'Pending Approval',
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
    if (!latest) { toast.error('No creative has been uploaded yet. Archway needs to upload the graphic and caption before this can be approved.'); return; }
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
    if (!latest) { toast.error('No creative has been uploaded yet. Archway needs to upload the graphic and caption before this can be approved.'); return; }
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

  // Preview graphic URL — use latest or current editing state
  const previewGraphicUrl = graphicUrl || latest?.graphic_url;
  const previewCaption = caption || latest?.caption;

  return (
    <div className="space-y-4">
      {/* #9: Published celebration banner */}
      {isPublished && previewGraphicUrl && (
        <div className="relative border border-[hsl(145,63%,42%)]/30 rounded-lg overflow-hidden">
          <div className="absolute top-3 left-3 z-10 bg-[hsl(145,63%,42%)] text-white text-xs font-body font-bold px-3 py-1 rounded-full shadow-md">
            ✅ Published
          </div>
          <ContentPreview
            contentType={request.content_type}
            graphicUrl={previewGraphicUrl}
            caption={previewCaption || null}
            title={request.title}
            scheduledDatetime={latest?.scheduled_datetime}
            eventDate={request.event_promo_date || request.target_date}
            platform={platform}
          />
        </div>
      )}

      {/* Content-type-aware Preview (for non-published states) */}
      {!isPublished && previewGraphicUrl && previewCaption && (
        <div>
          <ContentPreview
            contentType={request.content_type}
            graphicUrl={previewGraphicUrl}
            caption={previewCaption}
            title={request.title}
            scheduledDatetime={latest?.scheduled_datetime}
            eventDate={request.event_promo_date || request.target_date}
            platform={platform}
          />
          {latest?.scheduled_datetime && (
            <div className="px-4 py-2 bg-muted/50 text-xs font-body text-muted-foreground flex items-center gap-2 border border-border border-t-0 rounded-b-lg">
              🕐 Scheduled: {format(parseISO(latest.scheduled_datetime), 'MMM d, yyyy h:mm a')}
            </div>
          )}
        </div>
      )}

      {/* Approval buttons */}
      {isClientReview && latest && latest.status === 'Pending Approval' && (
        <div className="space-y-3 bg-accent/5 border border-accent/20 rounded-lg p-4">
          <p className="text-xs font-body font-semibold text-foreground">This post is ready for your review.</p>
          <p className="text-[11px] font-body text-muted-foreground">Approving as <span className="font-semibold text-foreground">{approverName}</span></p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleApprove}
              disabled={saving}
              className="flex-1 text-sm font-body font-semibold bg-[hsl(145,63%,42%)] text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              disabled={saving}
              className="flex-1 text-sm font-body font-semibold bg-accent text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              ✎ Request Changes
            </button>
          </div>
          {showFeedback && (
            <div className="space-y-2 mt-2">
              <label className="text-xs font-body font-medium text-muted-foreground">What changes would you like?</label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Be specific so Archway can get it right..."
                className={`${inputClass} min-h-[80px]`}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleRequestChanges} disabled={saving} className="text-xs font-body bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50">
                  Submit Feedback
                </button>
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

      {/* Upload & Edit section */}
      {(!isClientReview || (latest && latest.status === 'Changes Requested')) && !isScheduled && !isPublished && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Graphic</label>
            <div className="mt-1">
              {graphicUrl ? (
                <div className="relative">
                  <img src={graphicUrl} alt="Creative" className="w-full rounded border border-border" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute top-2 right-2 text-xs font-body bg-card/90 border border-border px-2 py-1 rounded hover:bg-card"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-sm font-body text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                >
                  {uploading ? 'Uploading...' : '+ Upload Graphic'}
                </button>
              )}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleGraphicUpload} accept="image/*" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write the post caption... Supports line breaks and emoji 😊"
              className={`${inputClass} min-h-[120px] mt-1`}
            />
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

          {/* Send for Approval */}
          <div>
            <button
              onClick={handleSendForApproval}
              disabled={saving || !canSendForApproval}
              className="w-full text-sm font-body font-semibold bg-accent text-accent-foreground px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Sending...' : latest?.status === 'Changes Requested' ? '🔄 Re-send for Approval' : '📤 Send for Approval'}
            </button>
            {!canSendForApproval && (
              <p className="text-[11px] font-body text-muted-foreground mt-1.5 text-center">
                {!graphicUrl && !caption.trim()
                  ? 'Upload a graphic and add a caption to enable sending for approval.'
                  : !graphicUrl
                    ? 'Upload a graphic to enable sending for approval.'
                    : 'Add a caption to enable sending for approval.'}
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
