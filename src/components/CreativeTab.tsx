import { useState, useRef } from 'react';
import { Request, useCreatives, useCreateCreative, useUpdateCreative, useUploadCreativeGraphic, useUpdateRequest } from '@/hooks/useData';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface CreativeTabProps {
  request: Request;
}

export default function CreativeTab({ request }: CreativeTabProps) {
  const { data: creatives = [] } = useCreatives(request.id);
  const createCreative = useCreateCreative();
  const updateCreative = useUpdateCreative();
  const uploadGraphic = useUploadCreativeGraphic();
  const updateRequest = useUpdateRequest();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const latest = creatives.length > 0 ? creatives[creatives.length - 1] : null;
  const isClientReview = request.stage === 'Client Review';
  const isScheduled = request.stage === 'Scheduled';

  // Draft state for new/editing creative
  const [caption, setCaption] = useState(latest?.caption || '');
  const [platform, setPlatform] = useState(latest?.platform || 'LinkedIn');
  const [scheduledDate, setScheduledDate] = useState(latest?.scheduled_datetime ? format(parseISO(latest.scheduled_datetime), 'yyyy-MM-dd') : '');
  const [scheduledTime, setScheduledTime] = useState(latest?.scheduled_datetime ? format(parseISO(latest.scheduled_datetime), 'HH:mm') : '09:00');
  const [graphicUrl, setGraphicUrl] = useState(latest?.graphic_url || '');
  const [graphicFileName, setGraphicFileName] = useState(latest?.graphic_file_name || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Approval flow
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [approverName, setApproverName] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('sr_submitter_name') || '' : ''
  );

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

  const handleSendForApproval = async () => {
    if (!graphicUrl) {
      toast.error('Please upload a graphic first');
      return;
    }
    if (!caption.trim()) {
      toast.error('Please add a caption');
      return;
    }
    setSaving(true);
    try {
      const scheduledDatetime = scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
        : null;

      const nextVersion = (latest?.version || 0) + 1;
      const isRevision = latest && latest.status === 'Changes Requested';

      if (isRevision && latest) {
        // Create new version
        await createCreative.mutateAsync({
          request_id: request.id,
          version: nextVersion,
          graphic_url: graphicUrl,
          graphic_file_name: graphicFileName,
          caption: caption,
          platform,
          scheduled_datetime: scheduledDatetime || undefined,
          status: 'Pending Approval',
        });
      } else if (latest && latest.status === 'Draft') {
        // Update existing draft
        await updateCreative.mutateAsync({
          id: latest.id,
          graphic_url: graphicUrl,
          graphic_file_name: graphicFileName,
          caption,
          platform,
          scheduled_datetime: scheduledDatetime,
          status: 'Pending Approval',
        });
      } else {
        // Create first version
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

      // Change request stage to Client Review
      await updateRequest.mutateAsync({ id: request.id, stage: 'Client Review' } as any);
      toast.success('Sent for approval!');
    } catch {
      toast.error('Failed to send for approval');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!approverName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!latest) return;
    setSaving(true);
    try {
      await updateCreative.mutateAsync({
        id: latest.id,
        status: 'Approved',
        approved_by: approverName,
        approved_at: new Date().toISOString(),
      });
      await updateRequest.mutateAsync({ id: request.id, stage: 'Scheduled' } as any);
      localStorage.setItem('sr_submitter_name', approverName);
      toast.success('Approved! Post is now scheduled.');
    } catch {
      toast.error('Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!feedbackText.trim()) {
      toast.error('Please describe what changes you need');
      return;
    }
    if (!latest) return;
    setSaving(true);
    try {
      await updateCreative.mutateAsync({
        id: latest.id,
        status: 'Changes Requested',
        feedback: feedbackText,
      });
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

  return (
    <div className="space-y-4">
      {/* LinkedIn-style Preview */}
      {graphicUrl && caption && (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="px-4 pt-4 pb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">SR</div>
            <div>
              <div className="text-sm font-semibold font-body text-foreground">Stable Rock</div>
              <div className="text-[11px] text-muted-foreground font-body">Company • {platform}</div>
            </div>
          </div>
          <div className="px-4 pb-3">
            <p className="text-sm font-body text-foreground whitespace-pre-wrap">{caption}</p>
          </div>
          <img src={graphicUrl} alt="Creative preview" className="w-full" />
          {latest?.scheduled_datetime && (
            <div className="px-4 py-2 bg-muted/50 text-xs font-body text-muted-foreground flex items-center gap-2">
              🕐 Scheduled: {format(parseISO(latest.scheduled_datetime), 'MMM d, yyyy h:mm a')}
            </div>
          )}
        </div>
      )}

      {/* Approval buttons — show when in Client Review */}
      {isClientReview && latest && latest.status === 'Pending Approval' && (
        <div className="space-y-3 bg-accent/5 border border-accent/20 rounded-lg p-4">
          <p className="text-xs font-body font-semibold text-foreground">This post is ready for your review.</p>
          <div className="space-y-2">
            <input
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={saving}
              className="flex-1 text-sm font-body font-semibold bg-[#27AE60] text-white px-4 py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              disabled={saving}
              className="flex-1 text-sm font-body font-semibold border-2 border-[#E67E22] text-[#E67E22] px-4 py-3 rounded-lg hover:bg-[#E67E22]/10 disabled:opacity-50"
            >
              ✎ Request Changes
            </button>
          </div>
          {showFeedback && (
            <div className="space-y-2 mt-2">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Describe what changes you'd like..."
                className={`${inputClass} min-h-[80px]`}
              />
              <div className="flex gap-2">
                <button onClick={handleRequestChanges} disabled={saving} className="text-xs font-body bg-[#E67E22] text-white px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50">
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
        <div className="bg-[#27AE60]/10 border border-[#27AE60]/30 rounded-lg p-3 text-sm font-body text-foreground">
          ✓ Approved by {latest.approved_by} on {latest.approved_at && format(parseISO(latest.approved_at), 'MMM d, yyyy \'at\' h:mm a')}
        </div>
      )}

      {/* Changes Requested badge */}
      {latest?.status === 'Changes Requested' && (
        <div className="bg-[#E67E22]/10 border border-[#E67E22]/30 rounded-lg p-3 space-y-1">
          <p className="text-sm font-body font-semibold text-[#E67E22]">Changes Requested</p>
          <p className="text-xs font-body text-foreground">{latest.feedback}</p>
        </div>
      )}

      {/* Upload & Edit section — only for Archway (not in client review approval mode) */}
      {(!isClientReview || (latest && latest.status === 'Changes Requested')) && !isScheduled && (
        <div className="space-y-3">
          {/* Graphic upload */}
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

          {/* Caption */}
          <div>
            <label className={labelClass}>Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write the post caption... Supports line breaks and emoji 😊"
              className={`${inputClass} min-h-[120px] mt-1`}
            />
          </div>

          {/* Platform */}
          <div>
            <label className={labelClass}>Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={`${inputClass} mt-1`}>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
            </select>
          </div>

          {/* Schedule */}
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
          <button
            onClick={handleSendForApproval}
            disabled={saving || !graphicUrl || !caption.trim()}
            className="w-full text-sm font-body font-semibold bg-accent text-accent-foreground px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Sending...' : latest?.status === 'Changes Requested' ? '🔄 Re-send for Approval' : '📤 Send for Approval'}
          </button>
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
                  <span className="text-[#27AE60]"> — Approved by {c.approved_by} {c.approved_at && format(parseISO(c.approved_at), 'MMM d')}</span>
                )}
                {c.status === 'Changes Requested' && c.feedback && (
                  <span className="text-[#E67E22]"> — Changes requested: "{c.feedback}"</span>
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
