import { useState } from 'react';
import { useAssets, useCreateAsset, useUpdateAsset, useRequests } from '@/hooks/useData';
import { ASSET_STATUS_COLORS, SERVICE_LINES } from '@/lib/constants';
import { ServiceLineBadge } from '@/components/Badges';
import { toast } from 'sonner';

export default function AssetsView() {
  const { data: assets = [] } = useAssets();
  const { data: requests = [] } = useRequests();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAssigned, setNewAssigned] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newServiceLine, setNewServiceLine] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      await createAsset.mutateAsync({
        title: newTitle,
        description: newDesc || null,
        status: 'Waiting',
        request_id: null,
        assigned_to: newAssigned || null,
      } as any);
      toast.success('Asset added');
      setNewTitle('');
      setNewDesc('');
      setNewAssigned('');
      setNewDueDate('');
      setNewServiceLine('');
      setNewNotes('');
      setShowForm(false);
    } catch {
      toast.error('Failed to add asset');
    }
  };

  const statuses = ['Waiting', 'Blocking', 'Received', 'Partial'] as const;

  const statusCounts = statuses.reduce((acc, s) => {
    acc[s] = assets.filter((a) => a.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  // Build request lookup for blocking indicator
  const requestMap = new Map(requests.map((r) => [r.id, r]));

  const isOverdue = (dueStr: string | null, status: string) => {
    if (!dueStr || status === 'Received') return false;
    if (dueStr.toLowerCase() === 'asap') return false;
    try {
      const d = new Date(dueStr);
      return d < new Date() && !isNaN(d.getTime());
    } catch { return false; }
  };

  return (
    <div className="space-y-4">
      {/* Status Count Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {statuses.map((s) => (
          <div key={s} className="bg-card border border-border rounded p-3 text-center" style={{ borderTopWidth: 3, borderTopColor: ASSET_STATUS_COLORS[s] }}>
            <div className="text-2xl font-bold font-body text-foreground">{statusCounts[s]}</div>
            <div className="text-xs text-muted-foreground font-body mt-1">{s}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-body">Track assets needed from the client.</p>
        <button onClick={() => setShowForm(!showForm)} className="text-xs font-body bg-accent text-accent-foreground px-3 py-1.5 rounded hover:opacity-90">
          + Add Asset
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded p-3 space-y-2">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Asset title..." className="w-full text-sm font-body bg-background border border-border rounded px-3 py-2 text-foreground" />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description..." className="w-full text-sm font-body bg-background border border-border rounded px-3 py-2 text-foreground" />
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={newAssigned} onChange={(e) => setNewAssigned(e.target.value)} placeholder="Assigned to..." className="w-full text-sm font-body bg-background border border-border rounded px-3 py-2 text-foreground" />
            <input value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} placeholder="Due date (e.g. ASAP, 4/15)" className="w-full text-sm font-body bg-background border border-border rounded px-3 py-2 text-foreground" />
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <select value={newServiceLine} onChange={(e) => setNewServiceLine(e.target.value)} className="w-full text-sm font-body bg-background border border-border rounded px-3 py-2 text-foreground">
              <option value="">Service Line (optional)</option>
              {SERVICE_LINES.map((sl) => <option key={sl} value={sl}>{sl}</option>)}
            </select>
            <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Notes..." className="w-full text-sm font-body bg-background border border-border rounded px-3 py-2 text-foreground" />
          </div>
          <button onClick={handleAdd} className="text-xs font-body bg-accent text-accent-foreground px-3 py-1.5 rounded">Save</button>
        </div>
      )}

      <div className="bg-card border border-border rounded overflow-x-auto">
        <table className="w-full text-xs font-body">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-3 py-2 text-left">Asset</th>
              <th className="px-3 py-2 text-left">Service Line</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Needed For</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Assigned To</th>
              <th className="px-3 py-2 text-left">Due Date</th>
              <th className="px-3 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                No assets being tracked. Click + Add Asset to request something from the client.
              </td></tr>
            ) : (
              assets.map((a) => {
                const assetAny = a as any;
                const dueStr = assetAny.due_date as string | null;
                const isAsap = dueStr?.toLowerCase() === 'asap';
                const overdue = isOverdue(dueStr, a.status);
                const linkedRequest = a.request_id ? requestMap.get(a.request_id) : null;
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-3 py-2 text-foreground font-medium">
                      {a.title}
                      {a.status === 'Blocking' && linkedRequest && (
                        <span className="block text-[10px] text-destructive mt-0.5">
                          ⛔ Blocking: {linkedRequest.title}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {assetAny.service_line ? <ServiceLineBadge label={assetAny.service_line} /> : <span className="text-muted-foreground">–</span>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{a.description || '–'}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {linkedRequest ? linkedRequest.title : '–'}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={a.status}
                        onChange={(e) => updateAsset.mutate({ id: a.id, status: e.target.value as any })}
                        className="text-xs bg-muted border-0 rounded px-1.5 py-1 text-foreground"
                      >
                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{a.assigned_to || '–'}</td>
                    <td className={`px-3 py-2 ${isAsap ? 'text-destructive font-bold' : overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {overdue && <span className="mr-1">⚠️</span>}
                      {dueStr || '–'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{assetAny.notes || '–'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
