import { useState } from 'react';
import { useCreateRequest } from '@/hooks/useData';
import { SERVICE_LINES, CONTENT_TYPES, STAGES, OWNER_OPTIONS } from '@/lib/constants';
import { toast } from 'sonner';

export default function AdminAddContentForm({ onSuccess }: { onSuccess?: () => void }) {
  const createRequest = useCreateRequest();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    service_line: 'General / Stable Rock',
    content_type: 'LinkedIn Post',
    target_date: '',
    stage: 'In Progress',
    owner: 'Archway',
    contact_person: '',
    internal_notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }

    setSubmitting(true);
    try {
      await createRequest.mutateAsync({
        title: form.title,
        service_line: form.service_line,
        content_type: form.content_type,
        target_date: form.target_date || null,
        stage: form.stage as any,
        owner: form.owner,
        contact_person: form.contact_person || null,
        internal_notes: form.internal_notes || null,
        priority: 'Medium',
        description: form.title,
      } as any);
      toast.success('Content added');
      onSuccess?.();
    } catch {
      toast.error('Failed to add content');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-sm font-body bg-card border border-border rounded px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent";
  const labelClass = "block text-xs font-medium font-body text-foreground mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Title *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputClass}
          placeholder="e.g. Q2 Newsletter, IM Market Update"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Service Line</label>
          <select value={form.service_line} onChange={(e) => setForm({ ...form, service_line: e.target.value })} className={inputClass}>
            {SERVICE_LINES.map((sl) => <option key={sl} value={sl}>{sl}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Content Type</label>
          <select value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })} className={inputClass}>
            {CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Target Date</label>
        <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Stage</label>
          <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className={inputClass}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Owner</label>
          <select value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className={inputClass}>
            {OWNER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Contact Person</label>
        <input
          type="text"
          value={form.contact_person}
          onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
          className={inputClass}
          placeholder="e.g. Greg, Abby"
        />
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={form.internal_notes}
          onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
          className={`${inputClass} min-h-[60px]`}
          placeholder="Internal notes about this content"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary text-primary-foreground px-6 py-3 rounded text-sm font-semibold font-body hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {submitting ? 'Adding...' : 'Add Content'}
      </button>
    </form>
  );
}
