import crypto from 'node:crypto';
import {
  adminSetCookie,
  auditLog,
  getAdminCredential,
  getSupabase,
  json,
  normalizeEmail,
  resolveWorkspaceKey,
  safeParse,
  signAdminSession,
  verifyPassword,
} from './_lib.mjs';

const SESSION_TTL = 1000 * 60 * 60 * 8;

async function loginStaffAccount({ workspaceKey, email, password, event }) {
  const supabase = getSupabase();
  const { data: account, error } = await supabase
    .from('staff_accounts')
    .select('id, email, full_name, role, password_hash, is_active, must_change_password')
    .eq('workspace_key', workspaceKey)
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;

  if (!account || !verifyPassword(password, account.password_hash)) {
    await auditLog('staff_login_failed', { ip: event.headers['x-forwarded-for'] || 'unknown', workspaceKey, email });
    return json(401, { error: 'Invalid email or password.' });
  }
  if (!account.is_active) {
    await auditLog('staff_login_blocked_inactive', { workspaceKey, email });
    return json(403, { error: 'This account has been deactivated. Contact your administrator.' });
  }

  await supabase
    .from('staff_accounts')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', account.id);

  const token = signAdminSession({
    role: account.role,
    workspaceKey,
    staffId: account.id,
    email: account.email,
    name: account.full_name,
    exp: Date.now() + SESSION_TTL,
  });
  await auditLog('staff_login_success', { workspaceKey, email, role: account.role });
  return json(200, { ok: true, role: account.role, mustChangePassword: account.must_change_password }, { 'Set-Cookie': adminSetCookie(token) });
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const body = safeParse(event.body);
    if (!body?.password) return json(400, { error: 'Password is required.' });
    const workspaceKey = resolveWorkspaceKey(event, body);

    // Named staff account login (email + password)
    const email = normalizeEmail(body.email || '');
    if (email) {
      return await loginStaffAccount({ workspaceKey, email, password: body.password, event });
    }

    // Legacy workspace owner login (password only)
    const credential = await getAdminCredential(workspaceKey);
    const configuredPasswordHash = credential?.password_hash;
    const configuredPassword = workspaceKey === 'default' ? process.env.SMILEVISION_ADMIN_PASSWORD : undefined;

    if (!configuredPasswordHash && !configuredPassword) {
      return json(409, { error: 'Staff access has not been activated yet. Use the secure setup flow to create the first password.' });
    }

    let ok = false;
    if (configuredPasswordHash) {
      ok = verifyPassword(body.password, configuredPasswordHash);
    } else if (configuredPassword) {
      const provided = crypto.createHash('sha256').update(String(body.password)).digest();
      const expected = crypto.createHash('sha256').update(String(configuredPassword)).digest();
      ok = crypto.timingSafeEqual(provided, expected);
    }

    if (!ok) {
      await auditLog('admin_login_failed', { ip: event.headers['x-forwarded-for'] || 'unknown', workspaceKey });
      return json(401, { error: 'Invalid password.' });
    }

    const token = signAdminSession({ role: 'admin', workspaceKey, exp: Date.now() + SESSION_TTL });
    await auditLog('admin_login_success', { workspaceKey });
    return json(200, { ok: true, role: 'admin' }, { 'Set-Cookie': adminSetCookie(token) });
  } catch (error) {
    console.error('admin_login_failed_unexpected', error);
    return json(503, { error: 'Staff access is temporarily unavailable. Please check the workspace configuration and try again.' });
  }
}
