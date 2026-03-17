import { useState, useRef } from 'react';
import { useCreateRequest, useUploadFile } from '@/hooks/useData';
import { SERVICE_LINES, CONTENT_TYPES } from '@/lib/constants';
import { toast } from 'sonner';

export default function SubmitForm() {
  const createRequest = useCreateRequest();
  const uploadFile = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    service_line: '',
    target_date: '',
    event_promo_date: '',
    context: '',
    assets_available: '',
    submitter_name: '',
    priority: 'Medium',
  });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleType = (ct: string) => {
    setSelectedTypes((prev) => prev.includes(ct) ? prev.filter((t) => t !== ct) : [...prev, ct]);
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
    if (!form.title.trim()) { toast.error('Please describe what you need'); return; }
    if (!form.service_line) { toast.error('Please select a service line'); return; }

    const typesToCreate = selectedTypes.length > 0 ? selectedTypes : ['Other'];
    setSubmitting(true);

    try {
      for (const ct of typesToCreate) {
        const newRequest = await createRequest.mutateAsync({
          title: form.title,
          description: form.title,
          service_line: form.service_line,
          content_type: ct,
          stage: 'Requested',
          priority: form.priority as any,
          target_date: form.target_date || null,
          event_promo_date: form.event_promo_date || null,
          context: form.context || null,
          assets_available: form.assets_available || null,
          submitter_name: form.submitter_name || null,
          owner: null,
          what_needed_from_client: null,
        });

        // Upload files to each created request
        for (const file of selectedFiles) {
          await uploadFile.mutateAsync({
            requestId: newRequest.id,
            file,
            uploadedBy: form.submitter_name || 'Unknown',
          });
        }
      }
      toast.success(`${typesToCreate.length} request(s) submitted!`);
      setForm({ title: '', service_line: '', target_date: '', event_promo_date: '', context: '', assets_available: '', submitter_name: '', priority: 'Medium' });
      setSelectedTypes([]);
      setSelectedFiles([]);
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-sm font-body bg-card border border-border rounded px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent";
  const labelClass = "block text-xs font-medium font-body text-foreground mb-1";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div>
        <label className={labelClass}>What do you need? *</label>
        <textarea
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={`${inputClass} min-h-[80px]`}
          placeholder="Describe the content you need — word vomit welcome..."
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Service Line *</label>
          <select value={form.service_line} onChange={(e) => setForm({ ...form, service_line: e.target.value })} className={inputClass}>
            <option value="">Select...</option>
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

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Content Date</label>
          <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Event / Promo Date</label>
          <input type="date" value={form.event_promo_date} onChange={(e) => setForm({ ...form, event_promo_date: e.target.value })} className={inputClass} />
        </div>
      </div>

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
        </div>
        <p className="text-[10px] text-muted-foreground font-body mt-1">Select one or more. One request will be created per type. Leave empty and we'll decide.</p>
      </div>

      <div>
        <label className={labelClass}>Context / Background</label>
        <textarea value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} className={`${inputClass} min-h-[60px]`} placeholder="Any relevant context..." />
      </div>

      <div>
        <label className={labelClass}>Assets You Have</label>
        <textarea value={form.assets_available} onChange={(e) => setForm({ ...form, assets_available: e.target.value })} className={`${inputClass} min-h-[60px]`} placeholder="Logos, images, copy, data..." />
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

      <div>
        <label className={labelClass}>Your Name</label>
        <input type="text" value={form.submitter_name} onChange={(e) => setForm({ ...form, submitter_name: e.target.value })} className={inputClass} placeholder="Who is submitting this?" />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-accent text-accent-foreground px-6 py-2.5 rounded text-sm font-medium font-body hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {submitting ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
}
