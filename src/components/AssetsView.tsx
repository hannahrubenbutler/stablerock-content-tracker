import { useState } from 'react';
import { useAssets, useCreateAsset, useUpdateAsset, Asset } from '@/hooks/useData';
import { ASSET_STATUS_COLORS } from '@/lib/constants';
import { toast } from 'sonner';

export default function AssetsView() {
  const { data: assets = [] } = useAssets();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAssigned, setNewAssigned] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      await createAsset.mutateAsync({
        title: newTitle,
        description: newDesc || null,
        status: 'Waiting',
        request_id: null,
        assigned_to: newAssigned || null,
      });
      toast.success('Asset added');
      setNewTitle('');
      setNewDesc('');
      setNewAssigned('');
      setNewDueDate('');
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
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Asset title..."
            className="w-full text-sm font-body bg-background border border-border rounded px-3 py-2 text-foreground"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description..."
            className="w-full text-sm font-body bg-background border border-border rounded px-3 py-2 text-foreground"
          />
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              value={newAssigned}
              onChange={(e) => setNewAssigned(e.target.value)}
              placeholder="Assigned to..."
              className="w-full text-sm font-body bg-background border border-border rounded px-3 py-2 text-foreground"
            />
            <input
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              placeholder="Due date (e.g. ASAP, 4/15)"
              className="w-full text-sm font-body bg-background border border-border rounded px-3 py-2 text-foreground"
            />
          </div>
          <button onClick={handleAdd} className="text-xs font-body bg-accent text-accent-foreground px-3 py-1.5 rounded">Save</button>
        </div>
      )}

      <div className="bg-card border border-border rounded overflow-x-auto">
        <table className="w-full text-xs font-body">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-3 py-2 text-left">Asset</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Assigned To</th>
              <th className="px-3 py-2 text-left">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No assets tracked yet.</td></tr>
            ) : (
              assets.map((a) => {
                const dueStr = (a as any).due_date as string | null;
                const isAsap = dueStr?.toLowerCase() === 'asap';
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-3 py-2 text-foreground font-medium">{a.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.description || '–'}</td>
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
                    <td className={`px-3 py-2 ${isAsap ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{dueStr || '–'}</td>
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
