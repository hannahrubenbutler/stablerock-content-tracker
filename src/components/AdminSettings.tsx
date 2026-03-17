import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Shield, User, Ban, Trash2 } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
  role: string | null;
}

export default function AdminSettings() {
  const { isAdmin, session } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'client' | 'admin'>('client');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap: Record<string, string> = {};
      (roles || []).forEach((r: any) => {
        roleMap[r.user_id] = r.role;
      });

      const merged = (profiles || []).map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        status: p.status,
        created_at: p.created_at,
        role: roleMap[p.id] || null,
      }));

      setUsers(merged);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const handleInvite = async () => {
    if (!inviteEmail || !invitePassword) {
      toast.error('Email and password are required');
      return;
    }
    setInviting(true);
    try {
      const res = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteEmail,
          full_name: inviteName || inviteEmail,
          role: inviteRole,
          password: invitePassword,
        },
      });

      if (res.error || res.data?.error) {
        toast.error(res.data?.error || res.error?.message || 'Failed to invite user');
      } else {
        toast.success(`User ${inviteEmail} created successfully`);
        setInviteEmail('');
        setInviteName('');
        setInvitePassword('');
        setInviteRole('client');
        setShowInvite(false);
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite user');
    }
    setInviting(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await supabase.functions.invoke('invite-user', {
        body: { action: 'update_role', user_id: userId, role: newRole },
      });
      if (res.error || res.data?.error) {
        toast.error('Failed to update role');
      } else {
        toast.success('Role updated');
        fetchUsers();
      }
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`User ${newStatus === 'deactivated' ? 'deactivated' : 'activated'}`);
      fetchUsers();
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-display text-foreground">Manage Users</h2>
          <p className="text-sm text-muted-foreground font-body">
            Invite new users and manage existing accounts
          </p>
        </div>
        <Button
          onClick={() => setShowInvite(!showInvite)}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <UserPlus className="w-4 h-4 mr-1" /> Invite User
        </Button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="font-body font-semibold text-sm text-foreground">New User</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-body">Email *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label className="text-xs font-body">Full Name</Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Tracy Smith"
              />
            </div>
            <div>
              <Label className="text-xs font-body">Temporary Password *</Label>
              <Input
                type="text"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="TempPass123!"
              />
            </div>
            <div>
              <Label className="text-xs font-body">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'client' | 'admin')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleInvite} disabled={inviting} size="sm">
              {inviting ? 'Creating…' : 'Create User'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* User list */}
      {loadingUsers ? (
        <p className="text-sm text-muted-foreground font-body">Loading users…</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Name</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Email</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Role</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Added</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-2.5 text-foreground">{u.full_name || '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        u.role === 'admin'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-accent/10 text-accent'
                      }`}
                    >
                      {u.role === 'admin' ? (
                        <Shield className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      {u.role || 'none'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs font-medium ${
                        u.status === 'active'
                          ? 'text-green-600'
                          : u.status === 'deactivated'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {u.status === 'active' ? (
                        <button
                          onClick={() => handleStatusChange(u.id, 'deactivated')}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Deactivate"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      ) : u.status === 'deactivated' ? (
                        <button
                          onClick={() => handleStatusChange(u.id, 'active')}
                          className="text-muted-foreground hover:text-green-600 transition-colors"
                          title="Reactivate"
                        >
                          <User className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
