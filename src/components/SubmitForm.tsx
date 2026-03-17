import { useState } from 'react';
import { useCreateRequest } from '@/hooks/useData';
import { SERVICE_LINES, CONTENT_TYPES } from '@/lib/constants';
import { toast } from 'sonner';

export default function SubmitForm() {
  const createRequest = useCreateRequest();
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

  const toggleType = (ct: string) => {
    setSelectedTypes((prev) => prev.includes(ct) ? prev.filter((t) => t !== ct) : [...prev, ct]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Please describe what you need'); return; }
    if (!form.service_line) { toast.error('Please select a service line'); return; }

    const typesToCreate = selectedTypes.length > 0 ? selectedTypes : ['General'];

    try {
      for (const ct of typesToCreate) {
        await createRequest.mutateAsync({
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
      }
      toast.success(`${typesToCreate.length} request(s) submitted!`);
      setForm({ title: '', service_line: '', target_date: '', event_promo_date: '', context: '', assets_available: '', submitter_name: '', priority: 'Medium' });
      setSelectedTypes([]);
    } catch {
      toast.error('Failed to submit request');
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
          placeholder="Describe the content you need..."
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
        <p className="text-[10px] text-muted-foreground font-body mt-1">Select one or more. One request will be created per type.</p>
      </div>

      <div>
        <label className={labelClass}>Context / Background</label>
        <textarea value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} className={`${inputClass} min-h-[60px]`} placeholder="Any relevant context..." />
      </div>

      <div>
        <label className={labelClass}>Assets You Have</label>
        <textarea value={form.assets_available} onChange={(e) => setForm({ ...form, assets_available: e.target.value })} className={`${inputClass} min-h-[60px]`} placeholder="Logos, images, copy, data..." />
      </div>

      <div>
        <label className={labelClass}>Your Name</label>
        <input type="text" value={form.submitter_name} onChange={(e) => setForm({ ...form, submitter_name: e.target.value })} className={inputClass} placeholder="Who is submitting this?" />
      </div>

      <button
        type="submit"
        disabled={createRequest.isPending}
        className="bg-accent text-accent-foreground px-6 py-2.5 rounded text-sm font-medium font-body hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
}
