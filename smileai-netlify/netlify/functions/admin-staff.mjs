import crypto from 'node:crypto';
import {
  auditLog,
  getSupabase,
  hashPassword,
  json,
  normalizeEmail,
  requireAdmin,
  resolveWorkspaceKey,
  safeParse,
  verifyPassword,
} from './_lib.mjs';

const ACCOUNT_FIELDS = 'id, email, full_name, role, is_active, must_change_password, created_at, updated_at, last_login_at';

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 12) return 'Use at least 12 characters.';
  if (!/[A-Z]/.test(value)) return 'Include at least one uppercase letter.';
  if (!/[a-z]/.test(value)) return 'Include at least one lowercase letter.';
  if (!/[0-9]/.test(value)) return 'Include at least one number.';
  return null;
}

// Temp passwords always satisfy the policy: upper + lower + digit, 16 chars.
function generateTempPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const pick = (set) => set[crypto.randomInt(set.length)];
  const chars = [pick(upper), pick(lower), pick(digits)];
  while (chars.length < 16) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function listAccounts(supabase, workspaceKey) {
  const { data, error } = await supabase
    .from('staff_accounts')
    .select(ACCOUNT_FIELDS)
    .eq('workspace_key', workspaceKey)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function createAccount({ supabase, workspaceKey, body, session }) {
  const email = normalizeEmail(body.email || '');
  const fullName = String(body.fullName || '').trim();
  const role = body.role === 'admin' ? 'admin' : 'staff';

  if (!isValidEmail(email)) return json(400, { error: 'A valid email address is required.' });
  if (!fullName) return json(400, { error: 'Full name is required.' });

  const tempPassword = generateTempPassword();
  const { data, error } = await supabase
    .from('staff_accounts')
    .insert({
      workspace_key: workspaceKey,
      email,
      full_name: fullName,
      role,
      password_hash: hashPassword(tempPassword),
      must_change_password: true,
    })
    .select(ACCOUNT_FIELDS)
    .single();

  if (error) {
    if (error.code === '23505') return json(409, { error: 'An account with this email already exists in this workspace.' });
    throw error;
  }

  await auditLog('staff_account_created', { workspaceKey, email, role, by: session.email || 'owner' });
  return json(200, { ok: true, account: data, tempPassword });
}

async function updateAccount({ supabase, workspaceKey, body, session }) {
  const action = String(body.action || '');

  // Any signed-in staff member may change their own password.
  if (action === 'change_own_password') {
    if (!session.staffId) return json(400, { error: 'Owner passwords are changed from the Security tab.' });
    const { data: account, error } = await supabase
      .from('staff_accounts')
      .select('id, password_hash')
      .eq('id', session.staffId)
      .eq('workspace_key', workspaceKey)
      .maybeSingle();
    if (error) throw error;
    if (!account || !verifyPassword(body.currentPassword, account.password_hash)) {
      return json(401, { error: 'Your current password is incorrect.' });
    }
    const validationError = validatePassword(body.newPassword);
    if (validationError) return json(400, { error: validationError });
    const { error: updateError } = await supabase
      .from('staff_accounts')
      .update({ password_hash: hashPassword(body.newPassword), must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', account.id);
    if (updateError) throw updateError;
    await auditLog('staff_password_changed', { workspaceKey, staffId: account.id });
    return json(200, { ok: true });
  }

  // Everything below is admin-only management of other accounts.
  if (session.role !== 'admin') return json(403, { error: 'Only administrators can manage staff accounts.' });
  const id = String(body.id || '');
  if (!id) return json(400, { error: 'Account id is required.' });

  const { data: target, error: targetError } = await supabase
    .from('staff_accounts')
    .select(ACCOUNT_FIELDS)
    .eq('id', id)
    .eq('workspace_key', workspaceKey)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!target) return json(404, { error: 'Account not found.' });

  if (action === 'reset_password') {
    const tempPassword = generateTempPassword();
    const { error } = await supabase
      .from('staff_accounts')
      .update({ password_hash: hashPassword(tempPassword), must_change_password: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    await auditLog('staff_password_reset', { workspaceKey, email: target.email, by: session.email || 'owner' });
    return json(200, { ok: true, tempPassword });
  }

  if (action === 'set_active') {
    if (session.staffId === id) return json(400, { error: 'You cannot deactivate your own account.' });
    const isActive = Boolean(body.isActive);
    const { data, error } = await supabase
      .from('staff_accounts')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(ACCOUNT_FIELDS)
      .single();
    if (error) throw error;
    await auditLog(isActive ? 'staff_account_activated' : 'staff_account_deactivated', { workspaceKey, email: target.email, by: session.email || 'owner' });
    return json(200, { ok: true, account: data });
  }

  if (action === 'set_role') {
    if (session.staffId === id) return json(400, { error: 'You cannot change your own role.' });
    const role = body.role === 'admin' ? 'admin' : 'staff';
    const { data, error } = await supabase
      .from('staff_accounts')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(ACCOUNT_FIELDS)
      .single();
    if (error) throw error;
    await auditLog('staff_role_changed', { workspaceKey, email: target.email, role, by: session.email || 'owner' });
    return json(200, { ok: true, account: data });
  }

  return json(400, { error: 'Unknown action.' });
}

async function deleteAccount({ supabase, workspaceKey, session, id }) {
  if (session.role !== 'admin') return json(403, { error: 'Only administrators can manage staff accounts.' });
  if (!id) return json(400, { error: 'Account id is required.' });
  if (session.staffId === id) return json(400, { error: 'You cannot delete your own account.' });

  const { data: target, error: targetError } = await supabase
    .from('staff_accounts')
    .select('id, email')
    .eq('id', id)
    .eq('workspace_key', workspaceKey)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!target) return json(404, { error: 'Account not found.' });

  const { error } = await supabase.from('staff_accounts').delete().eq('id', id);
  if (error) throw error;
  await auditLog('staff_account_deleted', { workspaceKey, email: target.email, by: session.email || 'owner' });
  return json(200, { ok: true });
}

export async function handler(event) {
  try {
    const session = await requireAdmin(event);
    if (!session) return json(401, { error: 'Your session has expired. Sign in again to continue.' });

    const body = safeParse(event.body) || {};
    const workspaceKey = resolveWorkspaceKey(event, body);
    if (session.workspaceKey && session.workspaceKey !== workspaceKey) {
      return json(401, { error: 'This session does not match the current workspace.' });
    }

    const supabase = getSupabase();

    if (event.httpMethod === 'GET') {
      if (session.role !== 'admin') return json(403, { error: 'Only administrators can manage staff accounts.' });
      return json(200, { accounts: await listAccounts(supabase, workspaceKey) });
    }
    if (event.httpMethod === 'POST') {
      if (session.role !== 'admin') return json(403, { error: 'Only administrators can manage staff accounts.' });
      return await createAccount({ supabase, workspaceKey, body, session });
    }
    if (event.httpMethod === 'PUT') {
      return await updateAccount({ supabase, workspaceKey, body, session });
    }
    if (event.httpMethod === 'DELETE') {
      return await deleteAccount({ supabase, workspaceKey, session, id: event.queryStringParameters?.id || body.id });
    }
    return json(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('admin_staff_failed', error);
    return json(503, { error: 'Staff management is temporarily unavailable. Please try again.' });
  }
}
