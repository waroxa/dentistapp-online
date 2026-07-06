import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface StaffAccount {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff';
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface SessionInfo {
  role: string;
  email: string | null;
  staffId: string | null;
}

function getWorkspaceKey() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('location_id') ||
    params.get('locationId') ||
    sessionStorage.getItem('workspace_current_location_id') ||
    localStorage.getItem('workspace_location_id') ||
    'default'
  );
}

async function parseJson(res: Response) {
  if (!(res.headers.get('content-type') || '').includes('application/json')) {
    throw new Error('The staff management API is not reachable right now.');
  }
  return res.json();
}

export function TeamSettingsPanel() {
  const workspaceKey = getWorkspaceKey();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Create form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff'>('staff');
  const [isCreating, setIsCreating] = useState(false);

  // One-time temp password reveal: { email, password }
  const [tempCredential, setTempCredential] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Change own password (staff accounts)
  const [currentPassword, setCurrentPassword] = useState('');
  const [ownNewPassword, setOwnNewPassword] = useState('');
  const [isChangingOwn, setIsChangingOwn] = useState(false);

  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);

  const apiUrl = `/api/admin/staff?workspaceKey=${encodeURIComponent(workspaceKey)}`;

  const loadAll = async () => {
    setIsLoading(true);
    setError('');
    try {
      const sessionRes = await fetch(`/api/admin/session?workspaceKey=${encodeURIComponent(workspaceKey)}`, { credentials: 'include' });
      const sessionData = await parseJson(sessionRes);
      setSession({ role: sessionData.role || 'staff', email: sessionData.email || null, staffId: sessionData.staffId || null });

      if (sessionData.role === 'admin') {
        const res = await fetch(apiUrl, { credentials: 'include' });
        const data = await parseJson(res);
        if (!res.ok) throw new Error(data.error || 'Could not load staff accounts.');
        setAccounts(data.accounts || []);
      }
    } catch (err: any) {
      setError(err.message || 'Could not load staff accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');
    setNotice('');
    setTempCredential(null);
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: newName, email: newEmail, role: newRole, workspaceKey }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(data.error || 'Could not create the account.');
      setAccounts((current) => [...current, data.account]);
      setTempCredential({ email: data.account.email, password: data.tempPassword });
      setNewName('');
      setNewEmail('');
      setNewRole('staff');
    } catch (err: any) {
      setError(err.message || 'Could not create the account.');
    } finally {
      setIsCreating(false);
    }
  };

  const runAccountAction = async (id: string, payload: Record<string, unknown>, method: 'PUT' | 'DELETE' = 'PUT') => {
    setBusyAccountId(id);
    setError('');
    setNotice('');
    try {
      const res = await fetch(apiUrl, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, workspaceKey, ...payload }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(data.error || 'The action failed. Please try again.');
      return data;
    } catch (err: any) {
      setError(err.message || 'The action failed. Please try again.');
      return null;
    } finally {
      setBusyAccountId(null);
    }
  };

  const handleResetPassword = async (account: StaffAccount) => {
    setTempCredential(null);
    const data = await runAccountAction(account.id, { action: 'reset_password' });
    if (data?.tempPassword) {
      setTempCredential({ email: account.email, password: data.tempPassword });
      setNotice(`Password reset for ${account.email}. Share the temporary password below — it is shown only once.`);
    }
  };

  const handleToggleActive = async (account: StaffAccount) => {
    const data = await runAccountAction(account.id, { action: 'set_active', isActive: !account.is_active });
    if (data?.account) {
      setAccounts((current) => current.map((item) => (item.id === account.id ? data.account : item)));
    }
  };

  const handleToggleRole = async (account: StaffAccount) => {
    const data = await runAccountAction(account.id, { action: 'set_role', role: account.role === 'admin' ? 'staff' : 'admin' });
    if (data?.account) {
      setAccounts((current) => current.map((item) => (item.id === account.id ? data.account : item)));
    }
  };

  const handleDelete = async (account: StaffAccount) => {
    if (!window.confirm(`Delete the account for ${account.email}? This cannot be undone.`)) return;
    const data = await runAccountAction(account.id, {}, 'DELETE');
    if (data?.ok) {
      setAccounts((current) => current.filter((item) => item.id !== account.id));
      setNotice(`Account for ${account.email} deleted.`);
    }
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingOwn(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(apiUrl, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_own_password', currentPassword, newPassword: ownNewPassword, workspaceKey }),
      });
      const data = await parseJson(res);
      if (!res.ok) throw new Error(data.error || 'Could not change your password.');
      setCurrentPassword('');
      setOwnNewPassword('');
      setNotice('Your password has been updated.');
    } catch (err: any) {
      setError(err.message || 'Could not change your password.');
    } finally {
      setIsChangingOwn(false);
    }
  };

  const copyTempPassword = async () => {
    if (!tempCredential) return;
    try {
      await navigator.clipboard.writeText(tempCredential.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the password is still visible for manual copy.
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const isAdmin = session?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50">
          <Users className="h-5 w-5 text-cyan-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Team accounts</h3>
          <p className="text-sm text-slate-500">Create staff logins, reset passwords, and manage access to this dashboard.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-700">{notice}</p>
        </div>
      )}

      {tempCredential && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-900">
            Temporary password for {tempCredential.email}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-sm text-slate-900">
              {tempCredential.password}
            </code>
            <Button type="button" variant="outline" onClick={copyTempPassword} className="h-10 gap-1.5">
              {copied ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-amber-800">
            Share this securely with the team member. It is shown only once — they should change it after their first sign-in.
          </p>
        </div>
      )}

      {isAdmin ? (
        <>
          {/* Create account */}
          <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-4 text-sm font-semibold text-slate-900">Add a team member</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
              <div>
                <Label htmlFor="team-name" className="mb-1.5 block text-xs font-medium text-slate-600">Full name</Label>
                <Input
                  id="team-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Jane Doe"
                  className="h-10"
                  required
                />
              </div>
              <div>
                <Label htmlFor="team-email" className="mb-1.5 block text-xs font-medium text-slate-600">Email</Label>
                <Input
                  id="team-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jane@practice.com"
                  className="h-10"
                  required
                />
              </div>
              <div>
                <Label htmlFor="team-role" className="mb-1.5 block text-xs font-medium text-slate-600">Role</Label>
                <select
                  id="team-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value === 'admin' ? 'admin' : 'staff')}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={isCreating} className="h-10 gap-1.5 bg-cyan-600 text-white hover:bg-cyan-700">
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              A temporary password is generated automatically and shown once. Admins can manage the team; staff can use the dashboard.
            </p>
          </form>

          {/* Account list */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <UserRound className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">No staff accounts yet. Add your first team member above.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {accounts.map((account) => {
                  const busy = busyAccountId === account.id;
                  const isSelf = session?.staffId === account.id;
                  return (
                    <li key={account.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{account.full_name || account.email}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${account.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                            {account.role === 'admin' ? 'Admin' : 'Staff'}
                          </span>
                          {!account.is_active && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Deactivated</span>
                          )}
                          {account.must_change_password && account.is_active && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Temp password</span>
                          )}
                          {isSelf && (
                            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-700">You</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {account.email}
                          {account.last_login_at ? ` · Last sign-in ${new Date(account.last_login_at).toLocaleDateString()}` : ' · Never signed in'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" disabled={busy} onClick={() => void handleResetPassword(account)} className="h-8 gap-1 px-2.5 text-xs">
                          <KeyRound className="h-3.5 w-3.5" /> Reset password
                        </Button>
                        {!isSelf && (
                          <>
                            <Button type="button" variant="outline" disabled={busy} onClick={() => void handleToggleRole(account)} className="h-8 gap-1 px-2.5 text-xs">
                              <ShieldCheck className="h-3.5 w-3.5" /> Make {account.role === 'admin' ? 'staff' : 'admin'}
                            </Button>
                            <Button type="button" variant="outline" disabled={busy} onClick={() => void handleToggleActive(account)} className="h-8 px-2.5 text-xs">
                              {account.is_active ? 'Deactivate' : 'Reactivate'}
                            </Button>
                            <Button type="button" variant="outline" disabled={busy} onClick={() => void handleDelete(account)} className="h-8 gap-1 border-red-200 px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700">
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </>
                        )}
                        {busy && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Only administrators can manage team accounts. Ask your practice administrator if you need access changes.
        </div>
      )}

      {/* Change own password — staff accounts only (owner password lives in Security tab) */}
      {session?.staffId && (
        <form onSubmit={handleChangeOwnPassword} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-1 text-sm font-semibold text-slate-900">Change my password</p>
          <p className="mb-4 text-xs text-slate-500">Signed in as {session.email}</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label htmlFor="own-current" className="mb-1.5 block text-xs font-medium text-slate-600">Current password</Label>
              <Input
                id="own-current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-10"
                required
              />
            </div>
            <div>
              <Label htmlFor="own-new" className="mb-1.5 block text-xs font-medium text-slate-600">New password</Label>
              <Input
                id="own-new"
                type="password"
                value={ownNewPassword}
                onChange={(e) => setOwnNewPassword(e.target.value)}
                className="h-10"
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isChangingOwn || !currentPassword || !ownNewPassword} className="h-10 bg-cyan-600 text-white hover:bg-cyan-700">
                {isChangingOwn ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Use at least 12 characters with uppercase, lowercase, and a number.</p>
        </form>
      )}
    </div>
  );
}
