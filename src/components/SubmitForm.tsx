import { useState, useRef, useEffect } from 'react';
import { useCreateRequest, useUploadFile } from '@/hooks/useData';
import { SERVICE_LINES, CONTENT_TYPES } from '@/lib/constants';
import { toast } from 'sonner';

type DateMode = 'specific' | 'range' | 'flexible';

export default function SubmitForm({ onNavigateToRequests }: { onNavigateToRequests?: () => void }) {
  const createRequest = useCreateRequest();
  const uploadFile = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(() => ({
    title: '',
    service_line: '',
    priority: 'Medium',
    context: '',
    assets_available: '',
    submitter_name: typeof window !== 'undefined' ? localStorage.getItem('sr_submitter_name') || '' : '',
    contact_person: '',
  }));

  const [dateMode, setDateMode] = useState<DateMode>('specific');
  const [targetDate, setTargetDate] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [flexibleDateText, setFlexibleDateText] = useState('');
  const [hasHardDeadline, setHasHardDeadline] = useState(false);
  const [deadlineText, setDeadlineText] = useState('');

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [notSure, setNotSure] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Persist submitter name
  useEffect(() => {
    if (form.submitter_name) {
      localStorage.setItem('sr_submitter_name', form.submitter_name);
    }
  }, [form.submitter_name]);

  const toggleType = (ct: string) => {
    setNotSure(false);
    setSelectedTypes((prev) => prev.includes(ct) ? prev.filter((t) => t !== ct) : [...prev, ct]);
  };

  const toggleNotSure = () => {
    if (notSure) {
      setNotSure(false);
    } else {
      setNotSure(true);
      setSelectedTypes([]);
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Please give it a title'); return; }

    const serviceLine = form.service_line || 'General / Stable Rock';
    const typesToCreate = notSure || selectedTypes.length === 0 ? ['Other'] : selectedTypes;

    setSubmitting(true);

    try {
      let createdRequestCount = 0;
      let uploadFailureCount = 0;

      for (const ct of typesToCreate) {
        const newRequest = await createRequest.mutateAsync({
          title: form.title,
          description: form.context || form.title,
          service_line: serviceLine,
          content_type: ct,
          stage: 'Requested',
          priority: form.priority as any,
          target_date: dateMode === 'flexible' ? null : (targetDate || null),
          event_promo_date: null,
          context: form.context || null,
          assets_available: form.assets_available || null,
          submitter_name: form.submitter_name || null,
          contact_person: form.contact_person || null,
          owner: null,
          what_needed_from_client: null,
          date_mode: dateMode,
          date_range_end: dateMode === 'range' ? (dateRangeEnd || null) : null,
          flexible_date_text: dateMode === 'flexible' ? (flexibleDateText || null) : null,
          has_hard_deadline: hasHardDeadline,
          deadline_text: hasHardDeadline ? (deadlineText || null) : null,
        } as any);

        createdRequestCount += 1;

        for (const file of selectedFiles) {
          try {
            await uploadFile.mutateAsync({
              requestId: newRequest.id,
              file,
              uploadedBy: form.submitter_name || 'Unknown',
            });
          } catch (uploadError) {
            uploadFailureCount += 1;
            console.error('SubmitForm file upload failed', {
              requestId: newRequest.id,
              fileName: file.name,
              uploadError,
            });
          }
        }
      }

      toast.success(
        <div>
          <p className="font-medium">{createdRequestCount} request(s) sent to Archway!</p>
          <p className="text-xs mt-1">
            Your request has been sent. Track it on the{' '}
            {onNavigateToRequests ? (
              <button onClick={onNavigateToRequests} className="underline font-medium">All Requests</button>
            ) : (
              <span className="font-medium">All Requests</span>
            )} tab.
          </p>
          {uploadFailureCount > 0 && (
            <p className="text-xs mt-1">
              {uploadFailureCount} attachment(s) could not be uploaded, but your request was saved.
            </p>
          )}
        </div>,
        { duration: 6000 }
      );
      setForm((prev) => ({ ...prev, title: '', service_line: '', priority: 'Medium', context: '', assets_available: '', contact_person: '' }));
      setSelectedTypes([]);
      setNotSure(false);
      setSelectedFiles([]);
      setDateMode('specific');
      setTargetDate('');
      setDateRangeEnd('');
      setFlexibleDateText('');
      setHasHardDeadline(false);
      setDeadlineText('');
    } catch (error) {
      console.error('SubmitForm request creation failed', error);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-sm font-body bg-card border border-border rounded px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent";
  const labelClass = "block text-xs font-medium font-body text-foreground mb-1";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {/* Title */}
      <div>
        <label className={labelClass}>Title *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputClass}
          placeholder="Give it a short name, e.g. ADV Deadline Reminder, IM Launch Post"
        />
        <p className="text-[10px] text-muted-foreground font-body mt-1">This is what shows up in the calendar and request list.</p>
      </div>

      {/* Service Line + Priority */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Service Line</label>
          <select value={form.service_line} onChange={(e) => setForm({ ...form, service_line: e.target.value })} className={inputClass}>
            <option value="">General / Stable Rock</option>
            {SERVICE_LINES.map((sl) => <option key={sl} value={sl}>{sl}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Details / Context */}
      <div>
        <label className={labelClass}>Details / Context</label>
        <textarea
          value={form.context}
          onChange={(e) => setForm({ ...form, context: e.target.value })}
          className={`${inputClass} min-h-[80px]`}
          placeholder="Any background, talking points, or context. Word vomit welcome."
        />
      </div>

      {/* Content Types */}
      <div>
        <label className={labelClass}>Content Types</label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((ct) => (
            <button
              key={ct}
              type="button"
              onClick={() => toggleType(ct)}
              className={`text-xs font-body px-3 py-1.5 rounded border transition-colors ${
                selectedTypes.includes(ct)
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-card text-muted-foreground border-border hover:border-accent'
              }`}
            >
              {ct}
            </button>
          ))}
          <button
            type="button"
            onClick={toggleNotSure}
            className={`text-xs font-body px-3 py-1.5 rounded transition-colors ${
              notSure
                ? 'bg-muted text-foreground border-accent border-2 border-dashed'
                : 'bg-card text-muted-foreground/60 border-dashed border-2 border-border hover:border-accent italic'
            }`}
          >
            Not sure
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground font-body mt-1">Select what you think you need, or hit "Not sure" and Archway will decide.</p>
      </div>

      {/* Date Section */}
      <div>
        <label className={labelClass}>When does this need to go out?</label>
        <div className="flex gap-1 mb-3">
          {([
            { value: 'specific', label: 'Specific Date' },
            { value: 'range', label: 'Date Range' },
            { value: 'flexible', label: 'Flexible' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDateMode(opt.value)}
              className={`text-xs font-body px-3 py-1.5 rounded-full border transition-colors ${
                dateMode === opt.value
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-card text-muted-foreground border-border hover:border-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {dateMode === 'specific' && (
          <div>
            <label className="text-[11px] text-muted-foreground font-body mb-1 block">Publish Date</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={inputClass} />
          </div>
        )}

        {dateMode === 'range' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground font-body mb-1 block">Start</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-body mb-1 block">End</label>
              <input type="date" value={dateRangeEnd} onChange={(e) => setDateRangeEnd(e.target.value)} className={inputClass} />
            </div>
          </div>
        )}

        {dateMode === 'flexible' && (
          <div>
            <input
              type="text"
              value={flexibleDateText}
              onChange={(e) => setFlexibleDateText(e.target.value)}
              className={inputClass}
              placeholder="e.g. sometime in April, before IM launch, end of Q2"
            />
          </div>
        )}

        {/* Hard deadline checkbox */}
        <div className="mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasHardDeadline}
              onChange={(e) => setHasHardDeadline(e.target.checked)}
              className="rounded border-border text-accent focus:ring-accent"
            />
            <span className="text-xs font-body text-foreground">This is tied to a hard deadline or event</span>
          </label>
          {hasHardDeadline && (
            <input
              type="text"
              value={deadlineText}
              onChange={(e) => setDeadlineText(e.target.value)}
              className={`${inputClass} mt-2`}
              placeholder="e.g. ADV forms due 4/30, conference on 6/12"
            />
          )}
        </div>
      </div>

      {/* Contact Person */}
      <div>
        <label className={labelClass}>Who should we talk to about this?</label>
        <input
          type="text"
          value={form.contact_person}
          onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
          className={inputClass}
          placeholder="e.g. Greg, Abby, Luke"
        />
      </div>

      {/* Assets / What they have */}
      <div>
        <label className={labelClass}>Do you have anything to share?</label>
        <textarea
          value={form.assets_available}
          onChange={(e) => setForm({ ...form, assets_available: e.target.value })}
          className={`${inputClass} min-h-[60px]`}
          placeholder="Photos, talking points, docs, links, a voice memo link, anything helpful. Or paste a LinkedIn post URL if you want us to repost it."
        />
      </div>

      {/* File Upload */}
      <div>
        <label className={labelClass}>Attach Files</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-accent transition-colors"
        >
          <p className="text-sm text-muted-foreground font-body">Click to attach images, PDFs, or docs</p>
          <p className="text-[10px] text-muted-foreground/60 font-body mt-1">JPG, PNG, GIF, PDF, DOC, DOCX, PPTX, XLSX</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.pptx,.xlsx"
          onChange={handleFilesChange}
        />
        {selectedFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {selectedFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-muted rounded px-3 py-1.5 text-xs font-body">
                <span className="text-foreground truncate flex-1">📎 {f.name}</span>
                <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive ml-2">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Your Name */}
      <div>
        <label className={labelClass}>Your Name</label>
        <input
          type="text"
          value={form.submitter_name}
          onChange={(e) => setForm({ ...form, submitter_name: e.target.value })}
          className={inputClass}
          placeholder="Who is submitting this?"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-accent text-accent-foreground px-6 py-3 rounded text-sm font-semibold font-body hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {submitting ? 'Sending...' : 'Send to Archway'}
      </button>
    </form>
  );
}
